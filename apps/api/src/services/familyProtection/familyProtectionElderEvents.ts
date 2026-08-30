import { prisma } from "../../db/client.js";
import { matchGovernmentHotline, normalizePhoneDigits } from "../../lib/governmentHotlines.js";
import { classifyKrPhoneKind, krPhoneKindLabel, type KrPhoneKind } from "../../lib/krPhoneKind.js";
import { matchRemoteControlApp } from "../../lib/remoteControlApps.js";
import { createFamilyAlertAndNotifyGuardians } from "./familyProtectionNotify.js";
import { expandFamilyAlertRecipients } from "./familyProtectionCircle.js";
import {
  fcmMessageElderGovernmentCall,
  fcmMessageElderLongCall,
  fcmMessageElderRemoteApp,
  pushFamilyProtectionFcmToGuardians
} from "./familyProtectionFcmPush.js";
import { getGuardianElderLinks, getOrCreateFamilySettings, mergeLinkAlertConfig } from "./familyProtectionSettingsHelper.js";

async function wardDisplayName(userId: string) {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { legalName: true, nickFeed: true, nickChat: true, publicHandle: true }
  });
  return u?.legalName || u?.nickFeed || u?.nickChat || u?.publicHandle || "가족";
}

async function isVlueMemberByPhone(phone: string): Promise<boolean> {
  const d = normalizePhoneDigits(phone);
  if (!d) return false;
  const e164 = d.startsWith("0") ? `+82${d.slice(1)}` : d;
  const u = await prisma.user.findFirst({
    where: {
      OR: [{ phoneE164: e164 }, { phoneE164: d }, { phoneE164: `+${d}` }]
    },
    select: { id: true }
  });
  return Boolean(u);
}

/** 통화 종료 이벤트 — 네이티브 CallLog 연동 */
export async function recordWardCallEvent(
  wardUserId: string,
  input: {
    phone?: string;
    durationSec?: number;
    direction?: "in" | "out";
    peerIsVlueMember?: boolean;
    /** 기기 주소록 저장 여부 — true면 장시간 알림 제외. 미전달 시 주소록 미확인으로 알림 제외 */
    peerInContacts?: boolean;
    phoneKind?: KrPhoneKind | string;
  }
) {
  const phone = String(input.phone || "").trim();
  const durationSec = Math.max(0, Math.floor(Number(input.durationSec) || 0));
  const direction = input.direction === "out" ? "out" : "in";

  const gov = matchGovernmentHotline(phone);
  if (gov) {
    return recordWardGovernmentCall(wardUserId, phone, direction, gov.label);
  }

  const links = await getGuardianElderLinks(wardUserId);
  if (!links.length) return { ok: true, handled: false };

  // 서버 DB로 VLUE 회원 여부 확정 (클라이언트 false만 믿지 않음)
  const peerVlue = input.peerIsVlueMember === true || (await isVlueMemberByPhone(phone));
  // 저장되지 않은 모르는 번호만 — 주소록에 있거나 미확인이면 스킵
  const peerInContacts = input.peerInContacts === true;
  const contactsChecked = typeof input.peerInContacts === "boolean";
  const unsavedUnknown = contactsChecked && input.peerInContacts === false;

  const phoneKind: KrPhoneKind =
    input.phoneKind === "mobile" ||
    input.phoneKind === "representative" ||
    input.phoneKind === "landline"
      ? input.phoneKind
      : classifyKrPhoneKind(phone);
  const kindLabel = krPhoneKindLabel(phoneKind);

  const minSecDefault = 600;
  let minSec = minSecDefault;
  const guardianIds: string[] = [];
  for (const link of links) {
    const settings = await getOrCreateFamilySettings(link.guardianUserId);
    const cfg = mergeLinkAlertConfig(link, settings);
    if (!cfg.longCallEnabled) continue;
    minSec = Math.min(minSec, Math.max(60, (cfg.longCallMinutes || 10) * 60));
    guardianIds.push(link.guardianUserId);
  }
  if (!guardianIds.length || peerVlue || peerInContacts || !unsavedUnknown || durationSec < minSec) {
    return {
      ok: true,
      handled: true,
      alerted: 0,
      government: false,
      skipped: peerVlue
        ? "vlue_member"
        : peerInContacts
          ? "in_contacts"
          : !contactsChecked
            ? "contacts_unknown"
            : durationSec < minSec
              ? "under_threshold"
              : "disabled"
    };
  }

  const name = await wardDisplayName(wardUserId);
  const minutes = Math.round(durationSec / 60);
  const title = "[가족 보호] 모르는 번호 장시간 통화";
  const body = `${name} 님이 저장되지 않은 모르는 번호(${maskPhone(phone)}, ${kindLabel})와 ${minutes}분 이상 통화했습니다. (VLUE 비회원)`;
  const r = await createFamilyAlertAndNotifyGuardians({
    wardUserId,
    kind: "elder_long_call_unknown",
    title,
    body,
    guardianUserIds: guardianIds,
    skipFcm: true,
    payload: {
      phone: maskPhone(phone),
      durationSec,
      direction,
      phoneKind,
      phoneKindLabel: kindLabel,
      peerInContacts: false,
      peerIsVlueMember: false
    }
  });

  if (!r.skippedCooldown && r.alerted > 0) {
    const push = fcmMessageElderLongCall(minutes, kindLabel);
    const recipients = await expandFamilyAlertRecipients(guardianIds, wardUserId);
    void pushFamilyProtectionFcmToGuardians(recipients, push.title, push.body, {
      wardUserId,
      ...push.data
    });
  }

  return {
    ok: true,
    handled: true,
    alerted: r.alerted,
    government: false,
    phoneKind,
    phoneKindLabel: kindLabel
  };
}

export async function recordWardGovernmentCall(
  wardUserId: string,
  phone: string,
  direction: "in" | "out",
  agencyLabel?: string
) {
  const gov = matchGovernmentHotline(phone);
  const label = agencyLabel || gov?.label || "정부·공공기관";
  const links = await getGuardianElderLinks(wardUserId);
  if (!links.length) return { ok: true, alerted: 0 };

  const guardianIds: string[] = [];
  for (const link of links) {
    const settings = await getOrCreateFamilySettings(link.guardianUserId);
    const cfg = mergeLinkAlertConfig(link, settings);
    if (cfg.govCallEnabled) guardianIds.push(link.guardianUserId);
  }
  if (!guardianIds.length) return { ok: true, alerted: 0, agency: label };

  const name = await wardDisplayName(wardUserId);
  const dirLabel = direction === "out" ? "발신" : "수신";
  const title = "[가족 보호] 정부·공공기관 통화";
  const body = `${name} 님이 ${label}(${maskPhone(phone)})으로 ${dirLabel} 통화했습니다.`;
  const r = await createFamilyAlertAndNotifyGuardians({
    wardUserId,
    kind: "elder_government_call",
    title,
    body,
    guardianUserIds: guardianIds,
    skipFcm: true,
    payload: { phone: maskPhone(phone), agency: label, direction }
  });

  if (!r.skippedCooldown && r.alerted > 0) {
    const push = fcmMessageElderGovernmentCall(label);
    const recipients = await expandFamilyAlertRecipients(guardianIds, wardUserId);
    void pushFamilyProtectionFcmToGuardians(recipients, push.title, push.body, {
      wardUserId,
      ...push.data
    });
  }

  return { ok: true, alerted: r.alerted, agency: label };
}

/** 원격제어 앱 설치·실행 — 네이티브 PackageManager 연동 */
export async function reportWardRemoteControlApp(wardUserId: string, packageOrLabel: string) {
  const match = matchRemoteControlApp(packageOrLabel);
  if (!match) return { ok: true, matched: false };

  const links = await getGuardianElderLinks(wardUserId);
  if (!links.length) return { ok: true, matched: true, alerted: 0 };

  const guardianIds: string[] = [];
  for (const link of links) {
    const settings = await getOrCreateFamilySettings(link.guardianUserId);
    const cfg = mergeLinkAlertConfig(link, settings);
    if (cfg.remoteAppEnabled) guardianIds.push(link.guardianUserId);
  }
  if (!guardianIds.length) return { ok: true, matched: true, app: match.label, alerted: 0 };

  const name = await wardDisplayName(wardUserId);
  const title = "[가족 보호] 원격제어 앱";
  const body = `${name} 님 기기에서 ${match.label} 사용·설치가 감지되었습니다.`;
  const r = await createFamilyAlertAndNotifyGuardians({
    wardUserId,
    kind: "elder_remote_control_app",
    title,
    body,
    guardianUserIds: guardianIds,
    skipFcm: true,
    payload: { appId: match.id, appLabel: match.label, raw: packageOrLabel }
  });

  if (!r.skippedCooldown && r.alerted > 0) {
    const push = fcmMessageElderRemoteApp(match.label);
    const recipients = await expandFamilyAlertRecipients(guardianIds, wardUserId);
    void pushFamilyProtectionFcmToGuardians(recipients, push.title, push.body, {
      wardUserId,
      ...push.data
    });
  }

  return { ok: true, matched: true, app: match.label, alerted: r.alerted };
}

function maskPhone(phone: string) {
  const d = normalizePhoneDigits(phone);
  if (d.length < 4) return "****";
  return `${d.slice(0, 3)}****${d.slice(-4)}`;
}
