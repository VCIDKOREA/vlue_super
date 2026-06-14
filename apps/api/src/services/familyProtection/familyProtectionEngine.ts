import { prisma } from "../../db/client.js";
import { familyProtectionDb } from "../../db/familyProtectionDb.js";
import { ssePublish } from "../../realtime/sseHub.js";
import { sendFamilyProtectionPush } from "../fcmNotificationService.js";
import {
  notifyParentalConsentAfterChildInvite,
  ParentalConsentError,
  verifyGuardianPassCiMatchesUser
} from "../auth/parentalConsentService.js";
import { canRegisterFamilyMembers } from "./familyProtectionPaidGate.js";
import { assertCanInviteFamilyMember, getFamilyProtectionSlots } from "./familyProtectionSlots.js";
import { matchRiskySite } from "./riskySiteMatcher.js";
import { listBankConsentsForUser } from "./familyProtectionChildBank.js";
import {
  defaultFamilySettings,
  getOrCreateFamilySettings as getOrCreateSettingsFromHelper
} from "./familyProtectionSettingsHelper.js";

export const DEFAULT_NO_APP_HOURS = 24;
export const DEFAULT_MISSED_CALL_THRESHOLD = 3;
const ALERT_COOLDOWN_HOURS = 12;

type WardRole = "elder" | "child";
type FamilyRelation = "parent" | "child";
type AlertKind = "elder_no_app_24h" | "elder_missed_calls" | "child_risky_site";

export const USAGE_GUIDE = {
  summary:
    "유료 회원은 본인 포함 최대 4명(1:3)까지 가족 보호를 이용할 수 있습니다. 추가 인원(최대 8명)은 별도 요금이 필요합니다.",
  steps: [
    "① 유료 회원: 가족 보호 N/4명 — VLUE 아이디로 초대 (내 부모 / 내 자녀)",
    "② 가족 수락 후 보호 시작 — 부모·자녀 설정을 각각 켜기",
    "③ 부모: 미접속·부재중·비회원 장통화·원격앱·정부기관 통화 알림",
    "④ 자녀: 유해·도박·VPN 사이트 + 계좌 동의 후 입출금 알림",
    "⑤ 네이티브 앱에서 통화·설치앱 연동 시 실시간 감지 (docs/FAMILY_PROTECTION.md)"
  ]
};

function hoursAgo(h: number) {
  return new Date(Date.now() - h * 60 * 60 * 1000);
}

function relationToWardRole(relation: FamilyRelation): WardRole {
  return relation === "child" ? "child" : "elder";
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

export async function createProtectionLink(
  guardianUserId: string,
  wardHandle: string,
  familyRelation: FamilyRelation,
  guardianImpUid?: string
) {
  const paid = await canRegisterFamilyMembers(guardianUserId);
  if (!paid.ok) return { error: paid.reason, code: "FAMILY_FREE_TIER" };

  const handle = String(wardHandle || "").trim().toLowerCase();
  if (!handle) return { error: "가족 VLUE 아이디를 입력해 주세요." };

  const ward = await prisma.user.findFirst({
    where: { publicHandle: handle },
    select: { id: true, publicHandle: true }
  });
  if (!ward) return { error: "해당 아이디의 회원을 찾을 수 없습니다." };
  if (ward.id === guardianUserId) return { error: "본인은 가족으로 등록할 수 없습니다." };

  if (familyRelation === "child") {
    const impUid = String(guardianImpUid || "").trim();
    if (!impUid) {
      return {
        error: "자녀 초대 시 보호자 PASS 본인인증이 필요합니다. (보이스피싱·가족보호 정책)",
        code: "GUARDIAN_PASS_REQUIRED"
      };
    }
    try {
      await verifyGuardianPassCiMatchesUser(guardianUserId, impUid);
    } catch (e) {
      if (e instanceof ParentalConsentError) {
        return { error: e.message, code: e.code };
      }
      throw e;
    }
  }

  const slotCheck = await assertCanInviteFamilyMember(guardianUserId, ward.id);
  if (!slotCheck.ok) {
    return { error: slotCheck.error, code: slotCheck.code };
  }

  const wardRole = relationToWardRole(familyRelation);
  const guardianName = await guardianDisplayName(guardianUserId);
  const relationLabel = familyRelation === "child" ? "자녀" : "부모(노부모)";

  const link = await familyProtectionDb.familyProtectionLink.upsert({
    where: {
      guardianUserId_wardUserId: { guardianUserId, wardUserId: ward.id }
    },
    update: { wardRole, familyRelation, status: "pending", wardAcceptedAt: null },
    create: { guardianUserId, wardUserId: ward.id, wardRole, familyRelation, status: "pending" }
  });

  const inviteTitle = "가족 보호 초대";
  const inviteBody = `${guardianName} 님이 회원님을 가족(${relationLabel})으로 등록했습니다. 수락하면 보호가 시작됩니다.`;

  await prisma.ownerNotification.create({
    data: {
      ownerUserId: ward.id,
      actorUserId: guardianUserId,
      title: inviteTitle,
      body: inviteBody
    }
  });

  ssePublish(ward.id, {
    type: "vlue-family-protection-invite",
    linkId: link.id,
    guardianUserId,
    familyRelation,
    wardRole,
    title: inviteTitle,
    body: inviteBody
  });

  try {
    await sendFamilyProtectionPush(ward.id, inviteTitle, inviteBody, {
      type: "vlue-family-protection-invite",
      linkId: link.id,
      guardianUserId,
      familyRelation
    });
  } catch {
    /* FCM 실패는 초대 자체를 막지 않음 */
  }

  if (familyRelation === "child") {
    try {
      await notifyParentalConsentAfterChildInvite(guardianUserId, ward.id);
    } catch (err) {
      console.warn("[family-protection] parental_consent_notify_failed", err);
    }
  }

  return { ok: true, link };
}

export async function acceptProtectionLink(wardUserId: string, linkId: string) {
  const link = await familyProtectionDb.familyProtectionLink.findFirst({
    where: { id: linkId, wardUserId }
  });
  if (!link) return { error: "초대를 찾을 수 없습니다." };
  if (link.status === "active") return { ok: true, link };
  if (link.status === "revoked") return { error: "해지된 가족 연결입니다." };

  const updated = await familyProtectionDb.familyProtectionLink.update({
    where: { id: linkId },
    data: { status: "active", wardAcceptedAt: new Date() }
  });

  await familyProtectionDb.familyWardPresence.upsert({
    where: { wardUserId },
    update: { lastAppAccessAt: new Date(), missedCallStreak: 0 },
    create: { wardUserId, lastAppAccessAt: new Date() }
  });

  const wardName = await wardDisplayName(wardUserId);
  await prisma.ownerNotification.create({
    data: {
      ownerUserId: link.guardianUserId,
      actorUserId: wardUserId,
      title: "가족 보호 수락",
      body: `${wardName} 님이 가족 보호 초대를 수락했습니다.`
    }
  });
  ssePublish(link.guardianUserId, {
    type: "vlue-family-protection-accepted",
    linkId,
    wardUserId
  });

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

  await familyProtectionDb.familyProtectionLink.update({
    where: { id: linkId },
    data: { status: "revoked" }
  });
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
  let paid: { ok: boolean; reason?: string };
  try {
    paid = await canRegisterFamilyMembers(userId);
  } catch (e) {
    console.warn("[family-protection] paid gate check failed", e);
    paid = { ok: true };
  }

  try {
    return await listFamilyProtectionCore(userId, paid);
  } catch (e) {
    console.error("[family-protection] list failed", e);
    const settings = await getOrCreateSettings(userId).catch(() => defaultFamilySettings(userId));
    const memberSlots = await getFamilyProtectionSlots(userId).catch(() => null);
    return {
      usageGuide: USAGE_GUIDE,
      canInviteFamily: paid.ok && (memberSlots?.canInvite ?? false),
      inviteBlockReason: memberSlots?.blockReason ?? paid.reason ?? null,
      inviteBlockCode: memberSlots?.blockCode ?? null,
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

async function listFamilyProtectionCore(
  userId: string,
  paid: { ok: boolean; reason?: string }
) {
  const memberSlots = await getFamilyProtectionSlots(userId);
  const settings = await getOrCreateSettings(userId);

  const [asGuardian, asWard, alerts] = await Promise.all([
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
    familyProtectionDb.familyProtectionAlert.findMany({
      where: {
        wardUserId: {
          in: (
            await familyProtectionDb.familyProtectionLink.findMany({
              where: { guardianUserId: userId, status: "active" },
              select: { wardUserId: true }
            })
          ).map((l: { wardUserId: string }) => String(l.wardUserId))
        }
      },
      orderBy: { createdAt: "desc" },
      take: 30
    })
  ]);

  const activeWard = asWard.find((l: { status: string }) => l.status === "active");
  const bankConsents = await listBankConsentsForUser(userId);

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
