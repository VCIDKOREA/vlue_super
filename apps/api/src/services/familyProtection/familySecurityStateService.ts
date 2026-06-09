import { prisma } from "../../db/client.js";
import { assertGatewayEnvelope } from "../security/securityGateway.js";
import { listIncidentsForUser } from "./familyCrossSecurityStore.js";
import {
  listFamilySecurityStates,
  upsertFamilySecurityState,
  type FamilySecurityHealth
} from "./familySecurityStateStore.js";
import { pushFamilyProtectionFcmToGuardians } from "./familyProtectionFcmPush.js";
import { notifyFamilyGuardian } from "./familyProtectionNotify.js";

const LOW_BATTERY_THRESHOLD = 15;

async function familyGroupUserIds(anchorUserId: string): Promise<string[]> {
  const links = await prisma.familyProtectionLink.findMany({
    where: {
      status: "active",
      OR: [{ wardUserId: anchorUserId }, { guardianUserId: anchorUserId }]
    },
    select: { guardianUserId: true, wardUserId: true }
  });
  const ids = new Set<string>();
  for (const l of links) {
    ids.add(l.guardianUserId);
    ids.add(l.wardUserId);
  }
  return [...ids];
}

function deriveSecurityHealth(openThreatCount: number): FamilySecurityHealth {
  if (openThreatCount >= 2) return "critical";
  if (openThreatCount >= 1) return "warning";
  return "ok";
}

export async function syncFamilySecurityState(
  userId: string,
  body: {
    batteryPercent?: number;
    isCharging?: boolean;
    lastBankActivityMasked?: string;
    devicePlatform?: string;
  }
) {
  const env = assertGatewayEnvelope("family_cross_security", "sync_state", userId, body);
  const batteryPercent = Number(env.payload.batteryPercent ?? 100);
  const isCharging = Boolean(env.payload.isCharging);
  const lastBankActivityMasked = String(env.payload.lastBankActivityMasked || "").trim() || undefined;
  const rawPlatform = String(env.payload.devicePlatform || "").trim().toLowerCase();
  const devicePlatform =
    rawPlatform === "ios" || rawPlatform === "android"
      ? (rawPlatform as "ios" | "android")
      : undefined;

  const incidents = await listIncidentsForUser(userId);
  const openThreatCount = incidents.filter((i) => i.status === "open").length;
  const securityHealth = deriveSecurityHealth(openThreatCount);

  const row = await upsertFamilySecurityState({
    userId,
    batteryPercent,
    isCharging,
    securityHealth,
    openThreatCount,
    lastBankActivityMasked,
    devicePlatform
  });

  let lowBatteryNotified = false;
  if (!isCharging && batteryPercent <= LOW_BATTERY_THRESHOLD) {
    const groupIds = await familyGroupUserIds(userId);
    const targets = groupIds.filter((id) => id !== userId);
    const title = "[주의] 가족 배터리";
    const bodyText = `가족 구성원 기기 배터리가 ${batteryPercent}%입니다. 연락이 필요할 수 있습니다.`;
    for (const uid of targets) {
      await notifyFamilyGuardian(uid, userId, "elder_device_absent", title, bodyText, {
        subkind: "family_battery_low",
        batteryPercent
      });
    }
    await pushFamilyProtectionFcmToGuardians(targets, title, bodyText, {
      kind: "family_battery_low",
      batteryPercent: String(batteryPercent)
    });
    lowBatteryNotified = true;
  }

  return { state: row, lowBatteryNotified };
}

export async function getFamilySecurityStateDashboard(userId: string) {
  const groupIds = await familyGroupUserIds(userId);
  const states = await listFamilySecurityStates(groupIds.length ? groupIds : [userId]);
  const users = await prisma.user.findMany({
    where: { id: { in: groupIds.length ? groupIds : [userId] } },
    select: { id: true, legalName: true, publicHandle: true }
  });
  const nameById = Object.fromEntries(
    users.map((u) => [u.id, u.legalName || u.publicHandle || u.id.slice(0, 8)])
  );
  return {
    members: states.map((s) => ({
      ...s,
      displayName: nameById[s.userId] || s.userId.slice(0, 8)
    }))
  };
}
