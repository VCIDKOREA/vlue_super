import { prisma } from "../../db/client.js";
import { familyProtectionDb } from "../../db/familyProtectionDb.js";
import { normalizeToE164KR } from "../../lib/phoneE164.js";
import { ssePublish } from "../../realtime/sseHub.js";
import { isAdultForFamilyProtection } from "@vlue/shared/policy/minor-signup";
import { sendFamilyProtectionPush } from "../fcmNotificationService.js";
import {
  notifyParentalConsentAfterChildInvite,
  ParentalConsentError,
  verifyGuardianPassCiMatchesUser
} from "../auth/parentalConsentService.js";
import { canRegisterFamilyMembers } from "./familyProtectionPaidGate.js";
import {
  assertCanInviteFamilyMember,
  buildFamilyProtectionSlots,
  getFamilyProtectionSlots
} from "./familyProtectionSlots.js";
import { matchRiskySite } from "./riskySiteMatcher.js";
import { listBankConsentsForUser } from "./familyProtectionChildBank.js";
import {
  defaultFamilySettings,
  getOrCreateFamilySettings as getOrCreateSettingsFromHelper
} from "./familyProtectionSettingsHelper.js";
import { getFamilyCircleOverview, relationDisplayLabel } from "./familyProtectionCircle.js";

export const DEFAULT_NO_APP_HOURS = 24;
export const DEFAULT_MISSED_CALL_THRESHOLD = 3;
const ALERT_COOLDOWN_HOURS = 12;

type WardRole = "elder" | "child" | "observer";
type FamilyRelation = "parent" | "child" | "relative";
type AlertKind = "elder_no_app_24h" | "elder_missed_calls" | "child_risky_site";

export const USAGE_GUIDE = {
  summary:
    "유료 회원은 본인 포함 최대 4명(1:3)까지 가족 보호를 이용할 수 있습니다. 추가 인원(최대 8명)은 별도 요금이 필요합니다.",
  steps: [
    "① 유료 회원: 가족 보호 N/4명 — VLUE 아이디·전화번호로 초대 (부모·자녀·가족)",
    "② 가족 수락 후 보호 시작 — 부모·자녀 설정을 각각 켜기 (가족 분류는 알림만)",
    "③ 부모: 미접속·부재중·비회원 장통화·원격앱·정부기관 통화 알림",
    "④ 자녀: 유해·도박·VPN 사이트 + 계좌 동의 후 입출금 알림",
    "⑤ 네이티브 앱에서 통화·설치앱 연동 시 실시간 감지 (docs/FAMILY_PROTECTION.md)"
  ]
};

function hoursAgo(h: number) {
  return new Date(Date.now() - h * 60 * 60 * 1000);
}

function relationToWardRole(relation: FamilyRelation): WardRole {
  if (relation === "child") return "child";
  if (relation === "relative") return "observer";
  return "elder";
}

export function parseFamilyRelation(raw: string | undefined): FamilyRelation {
  if (raw === "child") return "child";
  if (raw === "relative" || raw === "family") return "relative";
  return "parent";
}

async function notifyGuardianInviteResult(
  guardianUserId: string,
  wardUserId: string,
  accepted: boolean
) {
  const wardName = await wardDisplayName(wardUserId);
  const title = accepted ? "가족 보호 수락" : "가족 보호 거절";
  const body = accepted
    ? `${wardName} 님이 가족 보호 초대를 수락했습니다.`
    : `${wardName} 님이 가족 보호 초대를 거절했습니다.`;

  await prisma.ownerNotification.create({
    data: {
      ownerUserId: guardianUserId,
      actorUserId: wardUserId,
      title,
      body,
      payloadJson: {
        kind: accepted ? "family_invite_accepted" : "family_invite_rejected",
        linkId: null,
        wardUserId
      }
    }
  });

  ssePublish(guardianUserId, {
    type: accepted ? "vlue-family-protection-accepted" : "vlue-family-protection-rejected",
    wardUserId,
    title,
    body,
    at: new Date().toISOString()
  });

  try {
    void sendFamilyProtectionPush(guardianUserId, title, body, {
      type: accepted ? "vlue-family-protection-accepted" : "vlue-family-protection-rejected",
      wardUserId,
      title,
      body
    }).catch((err) => {
      console.warn("[family-protection] invite_result_fcm_failed", err);
    });
  } catch (err) {
    console.warn("[family-protection] invite_result_fcm_failed", err);
  }
}

async function notifyFamilyLinkRevoked(
  link: {
    id: string;
    guardianUserId: string;
    wardUserId: string;
    familyRelation: FamilyRelation;
    wardRole: WardRole;
  },
  actorUserId: string,
  reason: "manual" | "aged_out"
) {
  const wardName = await wardDisplayName(link.wardUserId);
  const isGuardianActor = actorUserId === link.guardianUserId;
  const title = reason === "aged_out" ? "가족 보호 자동 종료" : "가족 보호 해지";
  const body =
    reason === "aged_out"
      ? `${wardName} 님 계정이 성인이 되어 가족 보호가 자동 종료되었습니다.`
      : `${wardName} 님 가족 보호 연결이 해지되었습니다.`;
  const payload = {
    kind: reason === "aged_out" ? "family_link_aged_out" : "family_link_revoked",
    linkId: link.id,
    wardUserId: link.wardUserId,
    familyRelation: link.familyRelation,
    wardRole: link.wardRole,
    reason
  };

  await prisma.ownerNotification.createMany({
    data: [
      {
        ownerUserId: link.guardianUserId,
        actorUserId,
        title,
        body,
        payloadJson: payload
      },
      {
        ownerUserId: link.wardUserId,
        actorUserId,
        title,
        body,
        payloadJson: payload
      }
    ]
  });

  ssePublish(link.guardianUserId, {
    type: "vlue-family-protection-revoked",
    title,
    body,
    linkId: link.id,
    wardUserId: link.wardUserId,
    reason,
    actorUserId,
    at: new Date().toISOString()
  });
  ssePublish(link.wardUserId, {
    type: "vlue-family-protection-revoked",
    title,
    body,
    linkId: link.id,
    wardUserId: link.wardUserId,
    reason,
    actorUserId,
    at: new Date().toISOString()
  });

  try {
    await Promise.all([
      sendFamilyProtectionPush(link.guardianUserId, title, body, {
        type: "vlue-family-protection-revoked",
        linkId: link.id,
        wardUserId: link.wardUserId,
        reason,
        actorSide: isGuardianActor ? "self" : "counterparty"
      }),
      sendFamilyProtectionPush(link.wardUserId, title, body, {
        type: "vlue-family-protection-revoked",
        linkId: link.id,
        wardUserId: link.wardUserId,
        reason,
        actorSide: isGuardianActor ? "counterparty" : "self"
      })
    ]);
  } catch (err) {
    console.warn("[family-protection] revoke_fcm_failed", err);
  }
}

async function wardDisplayName(userId: string) {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { legalName: true, nickFeed: true, nickChat: true, publicHandle: true }
  });
  return u?.legalName || u?.nickFeed || u?.nickChat || u?.publicHandle || "가족";
}

async function guardianDisplayName(userId: string) {
  return wardDisplayName(userId);
}

async function getOrCreateSettings(guardianUserId: string) {
  return getOrCreateSettingsFromHelper(guardianUserId);
}

function mergeAlertConfig(
  link: {
    alertNoAppEnabled: boolean | null;
    alertNoAppHours: number | null;
    alertMissedCallEnabled: boolean | null;
    alertMissedCallThreshold: number | null;
  },
  settings: {
    alertNoAppEnabled: boolean;
    alertNoAppHours: number;
    alertMissedCallEnabled: boolean;
    alertMissedCallThreshold: number;
    alertChildSiteEnabled: boolean;
    alertElderLongCallEnabled: boolean;
    alertElderLongCallMinutes: number;
    alertElderRemoteAppEnabled: boolean;
    alertElderGovCallEnabled: boolean;
    alertChildBankEnabled: boolean;
    alertChildBankAllTx: boolean;
    alertChildBankThresholdKrw: number;
    alertChildUnknownPayeeEnabled: boolean;
  }
) {
  return {
    noAppEnabled: link.alertNoAppEnabled ?? settings.alertNoAppEnabled,
    noAppHours: link.alertNoAppHours ?? settings.alertNoAppHours,
    missedCallEnabled: link.alertMissedCallEnabled ?? settings.alertMissedCallEnabled,
    missedCallThreshold: link.alertMissedCallThreshold ?? settings.alertMissedCallThreshold,
    childSiteEnabled: settings.alertChildSiteEnabled,
    longCallEnabled: settings.alertElderLongCallEnabled,
    longCallMinutes: settings.alertElderLongCallMinutes,
    remoteAppEnabled: settings.alertElderRemoteAppEnabled,
    govCallEnabled: settings.alertElderGovCallEnabled,
    childBankEnabled: settings.alertChildBankEnabled,
    childBankAllTx: settings.alertChildBankAllTx,
    childBankThresholdKrw: settings.alertChildBankThresholdKrw,
    childUnknownPayeeEnabled: settings.alertChildUnknownPayeeEnabled
  };
}

async function recentAlertExists(wardUserId: string, kind: AlertKind) {
  const since = hoursAgo(ALERT_COOLDOWN_HOURS);
  const row = await familyProtectionDb.familyProtectionAlert.findFirst({
    where: { wardUserId, kind, createdAt: { gte: since } },
    select: { id: true }
  });
  return Boolean(row);
}

async function notifyGuardian(
  guardianUserId: string,
  wardUserId: string,
  kind: AlertKind,
  title: string,
  body: string,
  payload?: Record<string, unknown>
) {
  await prisma.ownerNotification.create({
    data: {
      ownerUserId: guardianUserId,
      actorUserId: wardUserId,
      title,
      body
    }
  });
  ssePublish(guardianUserId, {
    type: "vlue-family-protection-alert",
    kind,
    wardUserId,
    title,
    body,
    at: new Date().toISOString(),
    ...payload
  });
}

/** 앱 포그라운드 진입 시만 기록 (5분 주기 없음) */
export async function recordWardHeartbeat(wardUserId: string) {
  const now = new Date();
  await expireChildProtectionIfAdult(wardUserId, now).catch((err) => {
    console.warn("[family-protection] adult expiry on heartbeat failed", err);
  });
  await familyProtectionDb.familyWardPresence.upsert({
    where: { wardUserId },
    update: {
      lastAppAccessAt: now,
      lastDeviceSeenAt: now,
      missedCallStreak: 0,
      missedCallStreakSince: null
    },
    create: { wardUserId, lastAppAccessAt: now, lastDeviceSeenAt: now }
  });
  return { ok: true, at: now.toISOString() };
}

/** 부재중 전화 1건 누적 — 기준 통과 시 보호자 푸시 */
export async function recordWardMissedCall(wardUserId: string) {
  const now = new Date();
  const existing = await familyProtectionDb.familyWardPresence.findUnique({
    where: { wardUserId }
  });
  const streak = (existing?.missedCallStreak ?? 0) + 1;
  const streakSince = existing?.missedCallStreakSince ?? now;

  await familyProtectionDb.familyWardPresence.upsert({
    where: { wardUserId },
    update: { missedCallStreak: streak, missedCallStreakSince: streakSince },
    create: { wardUserId, missedCallStreak: streak, missedCallStreakSince: streakSince }
  });

  const links = await familyProtectionDb.familyProtectionLink.findMany({
    where: { wardUserId, status: "active", wardRole: "elder" }
  });

  const name = await wardDisplayName(wardUserId);
  let alerted = 0;

  for (const link of links) {
    const settings = await getOrCreateSettings(link.guardianUserId);
    const cfg = mergeAlertConfig(link, settings);
    if (!cfg.missedCallEnabled || streak < cfg.missedCallThreshold) continue;
    if (await recentAlertExists(wardUserId, "elder_missed_calls")) continue;

    await familyProtectionDb.familyProtectionAlert.create({
      data: {
        wardUserId,
        kind: "elder_missed_calls",
        title: "[가족 보호] 부재중 전화",
        body: `${name} 님 휴대폰에 부재중 전화가 ${streak}통 누적되었습니다.`,
        payloadJson: { streak, threshold: cfg.missedCallThreshold },
        guardiansNotifiedAt: new Date()
      }
    });

    await notifyGuardian(
      link.guardianUserId,
      wardUserId,
      "elder_missed_calls",
      "[가족 보호] 부재중 전화",
      `${name} 님 휴대폰에 부재중 전화가 ${streak}통 누적되었습니다.`,
      { streak }
    );
    alerted += 1;
  }

  return { ok: true, streak, alerted };
}

export async function reportWardRiskySite(wardUserId: string, url: string, referrer?: string) {
  const match = matchRiskySite(url, referrer);
  if (!match.matched) return { ok: true, blocked: false };

  const links = await familyProtectionDb.familyProtectionLink.findMany({
    where: { wardUserId, status: "active", wardRole: "child" }
  });
  if (!links.length) return { ok: true, blocked: true, category: match.category };

  const name = await wardDisplayName(wardUserId);
  const title = "[가족 보호] 유해 사이트 접근";
  const body = `${name} 님의 기기에서 ${match.label} 접근이 감지되었습니다.`;

  if (!(await recentAlertExists(wardUserId, "child_risky_site"))) {
    await familyProtectionDb.familyProtectionAlert.create({
      data: {
        wardUserId,
        kind: "child_risky_site",
        title,
        body,
        payloadJson: { url, category: match.category, label: match.label },
        guardiansNotifiedAt: new Date()
      }
    });

    for (const link of links) {
      const settings = await getOrCreateSettings(link.guardianUserId);
      const cfg = mergeAlertConfig(link, settings);
      if (!cfg.childSiteEnabled) continue;
      await notifyGuardian(link.guardianUserId, wardUserId, "child_risky_site", title, body, {
        url,
        category: match.category
      });
    }
  }

  return { ok: true, blocked: true, category: match.category, label: match.label };
}

export async function runElderProtectionChecks() {
  const links = await familyProtectionDb.familyProtectionLink.findMany({
    where: { wardRole: "elder", status: "active" }
  });
  let sent = 0;

  for (const link of links) {
    const wardUserId = String(link.wardUserId);
    const settings = await getOrCreateSettings(link.guardianUserId);
    const cfg = mergeAlertConfig(link, settings);
    const presence = await familyProtectionDb.familyWardPresence.findUnique({
      where: { wardUserId }
    });
    const name = await wardDisplayName(wardUserId);

    if (cfg.noAppEnabled) {
      const noAppSince = hoursAgo(cfg.noAppHours);
      if (!presence?.lastAppAccessAt || presence.lastAppAccessAt < noAppSince) {
        if (!(await recentAlertExists(wardUserId, "elder_no_app_24h"))) {
          const hours = cfg.noAppHours;
          await familyProtectionDb.familyProtectionAlert.create({
            data: {
              wardUserId,
              kind: "elder_no_app_24h",
              title: "[가족 보호] 앱 미접속",
              body: `${name} 님은 ${hours}시간 이상 VLUE 앱에 접속하지 않았습니다.`,
              guardiansNotifiedAt: new Date()
            }
          });
          await notifyGuardian(
            link.guardianUserId,
            wardUserId,
            "elder_no_app_24h",
            "[가족 보호] 앱 미접속",
            `${name} 님은 ${hours}시간 이상 VLUE 앱에 접속하지 않았습니다.`
          );
          sent += 1;
        }
      }
    }

    if (cfg.missedCallEnabled && presence) {
      const streak = presence.missedCallStreak ?? 0;
      if (streak >= cfg.missedCallThreshold) {
        if (!(await recentAlertExists(wardUserId, "elder_missed_calls"))) {
          await familyProtectionDb.familyProtectionAlert.create({
            data: {
              wardUserId,
              kind: "elder_missed_calls",
              title: "[가족 보호] 부재중 전화",
              body: `${name} 님 휴대폰에 부재중 전화가 ${streak}통 누적되었습니다.`,
              guardiansNotifiedAt: new Date()
            }
          });
          await notifyGuardian(
            link.guardianUserId,
            wardUserId,
            "elder_missed_calls",
            "[가족 보호] 부재중 전화",
            `${name} 님 휴대폰에 부재중 전화가 ${streak}통 누적되었습니다.`
          );
          sent += 1;
        }
      }
    }
  }

  return { checked: links.length, alertsSent: sent };
}

async function expireChildProtectionIfAdult(wardUserId: string, asOf = new Date()) {
  const ward = await prisma.user.findUnique({
    where: { id: wardUserId },
    select: { birthDate: true }
  });
  if (!isAdultForFamilyProtection(ward?.birthDate ?? null, asOf)) return { revoked: 0 };

  const links = await familyProtectionDb.familyProtectionLink.findMany({
    where: { wardUserId, wardRole: "child", status: { in: ["pending", "active"] } }
  });
  for (const link of links) {
    await familyProtectionDb.familyProtectionLink.update({
      where: { id: link.id },
      data: { status: "revoked" }
    });
    await notifyFamilyLinkRevoked(
      {
        id: link.id,
        guardianUserId: link.guardianUserId,
        wardUserId: link.wardUserId,
        familyRelation: link.familyRelation,
        wardRole: link.wardRole
      },
      wardUserId,
      "aged_out"
    );
  }
  return { revoked: links.length };
}

export async function runMinorAdultProtectionExpiryChecks(asOf = new Date()) {
  const links = await familyProtectionDb.familyProtectionLink.findMany({
    where: { wardRole: "child", status: { in: ["pending", "active"] } },
    select: {
      id: true,
      guardianUserId: true,
      wardUserId: true,
      familyRelation: true,
      wardRole: true,
      status: true,
      wardUser: {
        select: {
          birthDate: true
        }
      }
    }
  });

  let revoked = 0;
  let skippedNoBirthDate = 0;

  for (const link of links) {
    const adult = isAdultForFamilyProtection(link.wardUser?.birthDate ?? null, asOf);
    if (link.wardUser?.birthDate == null) {
      skippedNoBirthDate += 1;
    }
    if (!adult) continue;

    await familyProtectionDb.familyProtectionLink.update({
      where: { id: link.id },
      data: { status: "revoked" }
    });
    await notifyFamilyLinkRevoked(
      {
        id: link.id,
        guardianUserId: link.guardianUserId,
        wardUserId: link.wardUserId,
        familyRelation: link.familyRelation,
        wardRole: link.wardRole
      },
      link.wardUserId,
      "aged_out"
    );
    revoked += 1;
  }

  return { checked: links.length, revoked, skippedNoBirthDate };
}

/** VLUE 아이디(@handle) 또는 휴대폰 번호로 초대 대상 회원 조회 */
async function resolveFamilyInviteTarget(rawInput: string) {
  const raw = String(rawInput || "").trim();
  if (!raw) return null;

  const handle = raw.replace(/^@+/, "").trim().toLowerCase();
  if (handle) {
    const byHandle = await prisma.user.findFirst({
      where: { publicHandle: handle },
      select: { id: true, publicHandle: true, birthDate: true }
    });
    if (byHandle) return byHandle;
  }

  const e164 = normalizeToE164KR(raw);
  if (!e164) return null;
  const digits = e164.replace(/\D/g, "");
  return prisma.user.findFirst({
    where: {
      OR: [{ phoneE164: e164 }, { phoneE164: digits }, { phoneE164: `+${digits}` }]
    },
    select: { id: true, publicHandle: true, birthDate: true }
  });
}

function maskPhoneE164(phoneE164: string | null | undefined): string | null {
  const digits = String(phoneE164 || "").replace(/\D/g, "");
  if (!digits) return null;
  let national = digits;
  if (national.startsWith("82") && national.length >= 10) {
    national = `0${national.slice(2)}`;
  }
  if (national.length < 10) return national;
  return `${national.slice(0, 3)}-****-${national.slice(-4)}`;
}

type FamilyInviteCandidate = {
  userId: string;
  publicHandle: string | null;
  displayName: string;
  phoneMasked: string | null;
  /** createProtectionLink에 넘길 키 (handle 또는 E.164) */
  inviteKey: string;
  match: "handle_exact" | "handle_prefix" | "phone";
  alreadyLinked: boolean;
  linkStatus: string | null;
};

/** 가족 초대 전 조회 — 아이디/전화번호로 후보 목록 */
export async function lookupFamilyInviteCandidates(guardianUserId: string, rawQuery: string) {
  const raw = String(rawQuery || "").trim();
  if (!raw) return { error: "가족 VLUE 아이디 또는 전화번호를 입력해 주세요." };

  const handle = raw.replace(/^@+/, "").trim().toLowerCase();
  const digitCount = raw.replace(/\D/g, "").length;
  const looksLikePhone = digitCount >= 8;
  if (!looksLikePhone && handle.length < 2) {
    return { error: "검색어가 너무 짧습니다. 아이디 2자 이상 또는 전화번호를 입력해 주세요." };
  }

  const found = new Map<string, FamilyInviteCandidate>();

  const pushCandidate = (
    user: {
      id: string;
      publicHandle: string | null;
      legalName: string | null;
      nickFeed: string | null;
      phoneE164: string | null;
    },
    match: FamilyInviteCandidate["match"]
  ) => {
    if (!user?.id || user.id === guardianUserId) return;
    if (found.has(user.id)) return;
    found.set(user.id, {
      userId: user.id,
      publicHandle: user.publicHandle,
      displayName: user.legalName || user.nickFeed || user.publicHandle || "회원",
      phoneMasked: maskPhoneE164(user.phoneE164),
      inviteKey: String(user.publicHandle || user.phoneE164 || "").trim(),
      match,
      alreadyLinked: false,
      linkStatus: null
    });
  };

  const userSelect = {
    id: true,
    publicHandle: true,
    legalName: true,
    nickFeed: true,
    phoneE164: true
  } as const;

  if (handle && !looksLikePhone) {
    const exact = await prisma.user.findFirst({
      where: { publicHandle: handle },
      select: userSelect
    });
    if (exact) pushCandidate(exact, "handle_exact");

    if (found.size < 8) {
      const prefix = await prisma.user.findMany({
        where: {
          publicHandle: { startsWith: handle, mode: "insensitive" },
          id: { not: guardianUserId }
        },
        select: userSelect,
        take: 8,
        orderBy: { publicHandle: "asc" }
      });
      for (const u of prefix) pushCandidate(u, "handle_prefix");
    }
  }

  if (looksLikePhone) {
    const e164 = normalizeToE164KR(raw);
    if (e164) {
      const digits = e164.replace(/\D/g, "");
      const byPhone = await prisma.user.findMany({
        where: {
          OR: [{ phoneE164: e164 }, { phoneE164: digits }, { phoneE164: `+${digits}` }],
          id: { not: guardianUserId }
        },
        select: userSelect,
        take: 5
      });
      for (const u of byPhone) pushCandidate(u, "phone");
    }
  }

  const candidates = [...found.values()].filter((c) => Boolean(c.inviteKey)).slice(0, 10);
  if (!candidates.length) {
    return { ok: true as const, query: raw, candidates: [], message: "일치하는 회원을 찾지 못했습니다." };
  }

  const links = await familyProtectionDb.familyProtectionLink.findMany({
    where: {
      guardianUserId,
      wardUserId: { in: candidates.map((c) => c.userId) },
      status: { in: ["pending", "active"] }
    },
    select: { wardUserId: true, status: true }
  });
  const linkByWard = new Map(links.map((l) => [String(l.wardUserId), String(l.status)]));
  for (const c of candidates) {
    const st = linkByWard.get(c.userId) || null;
    c.linkStatus = st;
    c.alreadyLinked = Boolean(st);
  }

  return { ok: true as const, query: raw, candidates };
}

export async function createProtectionLink(
  guardianUserId: string,
  wardHandle: string,
  familyRelation: FamilyRelation,
  guardianImpUid?: string
) {
  const paid = await canRegisterFamilyMembers(guardianUserId);
  if (!paid.ok) return { error: paid.reason, code: "FAMILY_FREE_TIER" };

  const raw = String(wardHandle || "").trim();
  if (!raw) return { error: "가족 VLUE 아이디 또는 전화번호를 입력해 주세요." };

  const ward = await resolveFamilyInviteTarget(raw);
  if (!ward) return { error: "해당 아이디·전화번호의 회원을 찾을 수 없습니다." };
  if (ward.id === guardianUserId) return { error: "본인은 가족으로 등록할 수 없습니다." };

  if (familyRelation === "child" && isAdultForFamilyProtection(ward.birthDate)) {
    return {
      error: "해당 계정은 이미 성인이라 자녀 가족 보호를 신청할 수 없습니다.",
      code: "WARD_ADULT"
    };
  }

  if (familyRelation === "child") {
    const guardian = await prisma.user.findUnique({
      where: { id: guardianUserId },
      select: {
        identityVerified: true,
        portoneIdentityId: true
      }
    });
    const seedQaGuardian =
      Boolean(guardian?.identityVerified) &&
      String(guardian?.portoneIdentityId || "").startsWith("seed_");
    const impUid = String(guardianImpUid || "").trim();
    if (!impUid && !seedQaGuardian) {
      return {
        error: "자녀 초대 시 보호자 PASS 본인인증이 필요합니다. (보이스피싱·가족보호 정책)",
        code: "GUARDIAN_PASS_REQUIRED"
      };
    }
    if (impUid && !seedQaGuardian) {
      try {
        await verifyGuardianPassCiMatchesUser(guardianUserId, impUid);
      } catch (e) {
        if (e instanceof ParentalConsentError) {
          return { error: e.message, code: e.code };
        }
        throw e;
      }
    }
  }

  const slotCheck = await assertCanInviteFamilyMember(guardianUserId, ward.id);
  if (!slotCheck.ok) {
    return { error: slotCheck.error, code: slotCheck.code };
  }

  const wardRole = relationToWardRole(familyRelation);
  const guardianName = await guardianDisplayName(guardianUserId);
  const relationLabel = relationDisplayLabel(familyRelation);
  const protectionNote =
    familyRelation === "relative"
      ? "수락하면 가족 보호 이벤트 알림을 받을 수 있습니다."
      : "수락하면 보호가 시작됩니다.";

  const existing = await familyProtectionDb.familyProtectionLink.findUnique({
    where: {
      guardianUserId_wardUserId: { guardianUserId, wardUserId: ward.id }
    },
    select: { id: true, status: true }
  });
  const resendPending = existing?.status === "pending";

  const link = await familyProtectionDb.familyProtectionLink.upsert({
    where: {
      guardianUserId_wardUserId: { guardianUserId, wardUserId: ward.id }
    },
    update: { wardRole, familyRelation, status: "pending", wardAcceptedAt: null },
    create: { guardianUserId, wardUserId: ward.id, wardRole, familyRelation, status: "pending" }
  });

  const inviteTitle = "가족 보호 초대";
  const inviteBody = [
    `${guardianName} 님이 회원님을 ${relationLabel}(으)로 등록했습니다.`,
    protectionNote,
    "아래에서 수락 또는 거절해 주세요."
  ].join("\n");

  if (!resendPending) {
    await prisma.ownerNotification.create({
      data: {
        ownerUserId: ward.id,
        actorUserId: guardianUserId,
        title: inviteTitle,
        body: inviteBody,
        payloadJson: {
          kind: "family_invite",
          linkId: link.id,
          guardianUserId,
          familyRelation,
          wardRole,
          actions: ["accept", "reject"]
        }
      }
    });
  }

  ssePublish(ward.id, {
    type: "vlue-family-protection-invite",
    linkId: link.id,
    guardianUserId,
    familyRelation,
    wardRole,
    title: inviteTitle,
    body: inviteBody
  });

  /* 친구신청과 동일 — FCM 대기는 초대 API 지연의 주원인. 실패해도 초대는 유지 */
  void sendFamilyProtectionPush(ward.id, inviteTitle, inviteBody, {
    type: "vlue-family-protection-invite",
    linkId: link.id,
    guardianUserId,
    familyRelation,
    actions: "accept,reject",
    title: inviteTitle,
    body: inviteBody
  })
    .then((push) => {
      if (push.skipped || push.sent === 0) {
        console.warn("[family-protection] invite_fcm_skipped", {
          wardUserId: ward.id,
          reason: push.reason || (push.sent === 0 ? "no_delivery" : "ok"),
          sent: push.sent,
          failed: push.failed,
          resend: resendPending
        });
      } else {
        console.log("[family-protection] invite_fcm_sent", {
          wardUserId: ward.id,
          sent: push.sent,
          failed: push.failed,
          resend: resendPending
        });
      }
    })
    .catch((err) => {
      console.warn("[family-protection] invite_fcm_failed", err);
    });

  if (familyRelation === "child" && !resendPending) {
    try {
      await notifyParentalConsentAfterChildInvite(guardianUserId, ward.id);
    } catch (err) {
      console.warn("[family-protection] parental_consent_notify_failed", err);
    }
  }

  return { ok: true, link, resent: resendPending };
}

export async function acceptProtectionLink(wardUserId: string, linkId: string) {
  const link = await familyProtectionDb.familyProtectionLink.findFirst({
    where: { id: linkId, wardUserId }
  });
  if (!link) return { error: "초대를 찾을 수 없습니다." };
  if (link.status === "active") return { ok: true, link };
  if (link.status === "revoked") return { error: "해지된 가족 연결입니다." };

  if (link.wardRole === "child") {
    const ward = await prisma.user.findUnique({
      where: { id: wardUserId },
      select: { birthDate: true }
    });
    if (isAdultForFamilyProtection(ward?.birthDate ?? null)) {
      await familyProtectionDb.familyProtectionLink.update({
        where: { id: linkId },
        data: { status: "revoked" }
      });
      await notifyFamilyLinkRevoked(
        {
          id: link.id,
          guardianUserId: link.guardianUserId,
          wardUserId: link.wardUserId,
          familyRelation: link.familyRelation,
          wardRole: link.wardRole
        },
        wardUserId,
        "aged_out"
      );
      return { error: "성인이 된 계정은 자녀 가족 보호를 수락할 수 없습니다.", code: "WARD_ADULT" };
    }
  }

  const updated = await familyProtectionDb.familyProtectionLink.update({
    where: { id: linkId },
    data: { status: "active", wardAcceptedAt: new Date() }
  });

  await familyProtectionDb.familyWardPresence.upsert({
    where: { wardUserId },
    update: { lastAppAccessAt: new Date(), missedCallStreak: 0 },
    create: { wardUserId, lastAppAccessAt: new Date() }
  });

  await notifyGuardianInviteResult(link.guardianUserId, wardUserId, true);

  return { ok: true, link: updated };
}

export async function rejectProtectionLink(wardUserId: string, linkId: string) {
  const link = await familyProtectionDb.familyProtectionLink.findFirst({
    where: { id: linkId, wardUserId }
  });
  if (!link) return { error: "초대를 찾을 수 없습니다." };
  if (link.status === "revoked") return { ok: true, link };
  if (link.status === "active") return { error: "이미 수락된 연결입니다. 해지는 보호자에게 문의하세요." };

  const updated = await familyProtectionDb.familyProtectionLink.update({
    where: { id: linkId },
    data: { status: "revoked" }
  });

  await notifyGuardianInviteResult(link.guardianUserId, wardUserId, false);

  return { ok: true, link: updated };
}

export async function revokeProtectionLink(userId: string, linkId: string) {
  const link = await familyProtectionDb.familyProtectionLink.findFirst({
    where: {
      id: linkId,
      OR: [{ guardianUserId: userId }, { wardUserId: userId }]
    }
  });
  if (!link) return { error: "연결을 찾을 수 없습니다." };
  if (link.status === "revoked") return { ok: true };

  await familyProtectionDb.familyProtectionLink.update({
    where: { id: linkId },
    data: { status: "revoked" }
  });
  await notifyFamilyLinkRevoked(
    {
      id: link.id,
      guardianUserId: link.guardianUserId,
      wardUserId: link.wardUserId,
      familyRelation: link.familyRelation,
      wardRole: link.wardRole
    },
    userId,
    "manual"
  );
  return { ok: true };
}

export async function updateProtectionSettings(
  userId: string,
  input: Partial<{
    alertNoAppEnabled: boolean;
    alertNoAppHours: number;
    alertMissedCallEnabled: boolean;
    alertMissedCallThreshold: number;
    alertChildSiteEnabled: boolean;
    alertElderLongCallEnabled: boolean;
    alertElderLongCallMinutes: number;
    alertElderRemoteAppEnabled: boolean;
    alertElderGovCallEnabled: boolean;
    alertChildBankEnabled: boolean;
    alertChildBankAllTx: boolean;
    alertChildBankThresholdKrw: number;
    alertChildUnknownPayeeEnabled: boolean;
  }>
) {
  const hours = Math.min(168, Math.max(1, Math.floor(Number(input.alertNoAppHours) || DEFAULT_NO_APP_HOURS)));
  const threshold = Math.min(20, Math.max(1, Math.floor(Number(input.alertMissedCallThreshold) || DEFAULT_MISSED_CALL_THRESHOLD)));
  const longMin = Math.min(180, Math.max(3, Math.floor(Number(input.alertElderLongCallMinutes) || 10)));
  const bankThreshold = Math.min(10_000_000, Math.max(1000, Math.floor(Number(input.alertChildBankThresholdKrw) || 10000)));

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!user) {
    return {
      ok: true,
      settings: {
        ...defaultFamilySettings(userId),
        ...input,
        alertNoAppHours: hours,
        alertMissedCallThreshold: threshold,
        alertElderLongCallMinutes: longMin,
        alertChildBankThresholdKrw: bankThreshold
      },
      localOnly: true
    };
  }

  const row = await familyProtectionDb.familyProtectionSettings.upsert({
    where: { userId },
    update: {
      ...(input.alertNoAppEnabled !== undefined ? { alertNoAppEnabled: Boolean(input.alertNoAppEnabled) } : {}),
      ...(input.alertNoAppHours !== undefined ? { alertNoAppHours: hours } : {}),
      ...(input.alertMissedCallEnabled !== undefined
        ? { alertMissedCallEnabled: Boolean(input.alertMissedCallEnabled) }
        : {}),
      ...(input.alertMissedCallThreshold !== undefined
        ? { alertMissedCallThreshold: threshold }
        : {}),
      ...(input.alertChildSiteEnabled !== undefined
        ? { alertChildSiteEnabled: Boolean(input.alertChildSiteEnabled) }
        : {}),
      ...(input.alertElderLongCallEnabled !== undefined
        ? { alertElderLongCallEnabled: Boolean(input.alertElderLongCallEnabled) }
        : {}),
      ...(input.alertElderLongCallMinutes !== undefined ? { alertElderLongCallMinutes: longMin } : {}),
      ...(input.alertElderRemoteAppEnabled !== undefined
        ? { alertElderRemoteAppEnabled: Boolean(input.alertElderRemoteAppEnabled) }
        : {}),
      ...(input.alertElderGovCallEnabled !== undefined
        ? { alertElderGovCallEnabled: Boolean(input.alertElderGovCallEnabled) }
        : {}),
      ...(input.alertChildBankEnabled !== undefined
        ? { alertChildBankEnabled: Boolean(input.alertChildBankEnabled) }
        : {}),
      ...(input.alertChildBankAllTx !== undefined ? { alertChildBankAllTx: Boolean(input.alertChildBankAllTx) } : {}),
      ...(input.alertChildBankThresholdKrw !== undefined
        ? { alertChildBankThresholdKrw: bankThreshold }
        : {}),
      ...(input.alertChildUnknownPayeeEnabled !== undefined
        ? { alertChildUnknownPayeeEnabled: Boolean(input.alertChildUnknownPayeeEnabled) }
        : {})
    },
    create: {
      userId,
      alertNoAppEnabled: input.alertNoAppEnabled ?? true,
      alertNoAppHours: hours,
      alertMissedCallEnabled: input.alertMissedCallEnabled ?? true,
      alertMissedCallThreshold: threshold,
      alertChildSiteEnabled: input.alertChildSiteEnabled ?? true,
      alertElderLongCallEnabled: input.alertElderLongCallEnabled ?? true,
      alertElderLongCallMinutes: longMin,
      alertElderRemoteAppEnabled: input.alertElderRemoteAppEnabled ?? true,
      alertElderGovCallEnabled: input.alertElderGovCallEnabled ?? true,
      alertChildBankEnabled: input.alertChildBankEnabled ?? true,
      alertChildBankAllTx: input.alertChildBankAllTx ?? false,
      alertChildBankThresholdKrw: bankThreshold,
      alertChildUnknownPayeeEnabled: input.alertChildUnknownPayeeEnabled ?? true
    }
  });

  return { ok: true, settings: row };
}

export async function listFamilyProtection(userId: string) {
  try {
    return await listFamilyProtectionCore(userId);
  } catch (e) {
    console.error("[family-protection] list failed", e);
    let paid: { ok: boolean; reason?: string } = { ok: true };
    try {
      paid = await canRegisterFamilyMembers(userId);
    } catch {
      paid = { ok: true };
    }
    const settings = await getOrCreateSettings(userId).catch(() => defaultFamilySettings(userId));
    const memberSlots = await getFamilyProtectionSlots(userId).catch(() => null);
    return {
      usageGuide: USAGE_GUIDE,
      canInviteFamily: paid.ok && (memberSlots?.canInvite ?? false),
      inviteBlockReason: memberSlots?.blockReason ?? paid.reason ?? null,
      inviteBlockCode: memberSlots?.blockCode ?? null,
      uiMode: "guide_only" as const,
      memberSlots,
      settings,
      asGuardian: [],
      asWard: [],
      alerts: [],
      familyPeers: [],
      myActiveWardRole: null,
      myActiveFamilyRelation: null,
      degraded: true
    };
  }
}

function resolveFamilyProtectionUiMode(
  _userId: string,
  canInvite: boolean,
  asGuardian: Array<{ status: string }>,
  asWard: Array<{ status: string }>
): "guardian_full" | "ward_only" | "guide_only" {
  const hasGuardianLinks = asGuardian.some((l) => l.status === "active" || l.status === "pending");
  const hasWardLinks = asWard.some((l) => l.status === "active" || l.status === "pending");
  if (canInvite || hasGuardianLinks) return "guardian_full";
  if (hasWardLinks) return "ward_only";
  return "guide_only";
}

async function listFamilyProtectionCore(userId: string) {
  const [paidRaw, settings, asGuardian, asWard, bankConsents] = await Promise.all([
    canRegisterFamilyMembers(userId).catch((e): { ok: boolean; reason?: string } => {
      console.warn("[family-protection] paid gate check failed", e);
      return { ok: true };
    }),
    getOrCreateSettings(userId),
    familyProtectionDb.familyProtectionLink.findMany({
      where: { guardianUserId: userId, status: { not: "revoked" } },
      include: {
        wardUser: { select: { id: true, publicHandle: true, legalName: true, nickFeed: true } }
      },
      orderBy: { createdAt: "desc" }
    }),
    familyProtectionDb.familyProtectionLink.findMany({
      where: { wardUserId: userId, status: { not: "revoked" } },
      include: {
        guardianUser: { select: { id: true, publicHandle: true, legalName: true, nickFeed: true } }
      },
      orderBy: { createdAt: "desc" }
    }),
    listBankConsentsForUser(userId)
  ]);
  const paid = paidRaw;

  const activeWardIds = asGuardian
    .filter((l: { status: string }) => l.status === "active")
    .map((l: { wardUserId: string }) => String(l.wardUserId));
  const alerts = activeWardIds.length
    ? await familyProtectionDb.familyProtectionAlert.findMany({
        where: { wardUserId: { in: activeWardIds } },
        orderBy: { createdAt: "desc" },
        take: 30
      })
    : [];

  const wardCount = asGuardian.filter(
    (l: { status: string }) => l.status === "pending" || l.status === "active"
  ).length;
  const memberSlots = buildFamilyProtectionSlots({
    paid,
    wardCount,
    extraMemberPackActive: Boolean((settings as { extraMemberPackActive?: boolean }).extraMemberPackActive)
  });

  const activeWard = asWard.find((l: { status: string }) => l.status === "active");

  const familyPeers: Array<{
    userId: string;
    publicHandle: string | null;
    status: string;
    familyRelation: string | null;
    role: "ward" | "guardian";
  }> = [];

  for (const link of asGuardian) {
    if (link.status !== "active") continue;
    familyPeers.push({
      userId: String(link.wardUserId),
      publicHandle: link.wardUser?.publicHandle ?? null,
      status: link.status,
      familyRelation: link.familyRelation ?? null,
      role: "ward"
    });
  }
  for (const link of asWard) {
    if (link.status !== "active") continue;
    familyPeers.push({
      userId: String(link.guardianUserId),
      publicHandle: link.guardianUser?.publicHandle ?? null,
      status: link.status,
      familyRelation: link.familyRelation ?? null,
      role: "guardian"
    });
  }

  return {
    usageGuide: USAGE_GUIDE,
    canInviteFamily: paid.ok && memberSlots.canInvite,
    inviteBlockReason: memberSlots.blockReason ?? paid.reason ?? null,
    inviteBlockCode: memberSlots.blockCode ?? null,
    uiMode: resolveFamilyProtectionUiMode(userId, paid.ok && memberSlots.canInvite, asGuardian, asWard),
    memberSlots,
    settings,
    asGuardian,
    asWard,
    alerts,
    familyPeers,
    myActiveWardRole: activeWard?.wardRole ?? null,
    myActiveFamilyRelation: activeWard?.familyRelation ?? null,
    bankConsents,
    implementationNote:
      "1단계: VLUE 앱 이벤트(통화·사이트·동의). 2단계: Android/iOS 네이티브(CallLog·설치앱). 3단계: 오픈뱅킹 입출금 자동연동.",
    degraded: false
  };
}
