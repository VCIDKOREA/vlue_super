import { prisma } from "../../db/client.js";
import { familyProtectionDb } from "../../db/familyProtectionDb.js";
import { ssePublish } from "../../realtime/sseHub.js";
import { expandFamilyAlertRecipients } from "./familyProtectionCircle.js";

const ALERT_COOLDOWN_HOURS = 12;

export type FamilyAlertKindKey =
  | "elder_no_app_24h"
  | "elder_device_absent"
  | "elder_missed_calls"
  | "elder_long_call_unknown"
  | "elder_remote_control_app"
  | "elder_government_call"
  | "child_risky_site"
  | "child_bank_transaction"
  | "child_bank_consent";

function hoursAgo(h: number) {
  return new Date(Date.now() - h * 60 * 60 * 1000);
}

export async function recentFamilyAlertExists(wardUserId: string, kind: FamilyAlertKindKey) {
  const since = hoursAgo(ALERT_COOLDOWN_HOURS);
  const row = await familyProtectionDb.familyProtectionAlert.findFirst({
    where: { wardUserId, kind: kind as never, createdAt: { gte: since } },
    select: { id: true }
  });
  return Boolean(row);
}

export async function notifyFamilyGuardian(
  guardianUserId: string,
  wardUserId: string,
  kind: FamilyAlertKindKey,
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

export async function createFamilyAlertAndNotifyGuardians(opts: {
  wardUserId: string;
  kind: FamilyAlertKindKey;
  title: string;
  body: string;
  guardianUserIds: string[];
  payload?: Record<string, unknown>;
}) {
  if (await recentFamilyAlertExists(opts.wardUserId, opts.kind)) {
    return { alerted: 0, skippedCooldown: true };
  }

  await familyProtectionDb.familyProtectionAlert.create({
    data: {
      wardUserId: opts.wardUserId,
      kind: opts.kind as never,
      title: opts.title,
      body: opts.body,
      payloadJson: (opts.payload ?? undefined) as import("@prisma/client").Prisma.InputJsonValue | undefined,
      guardiansNotifiedAt: new Date()
    }
  });

  for (const gid of opts.guardianUserIds) {
    await notifyFamilyGuardian(gid, opts.wardUserId, opts.kind, opts.title, opts.body, opts.payload);
  }

  const allRecipients = await expandFamilyAlertRecipients(opts.guardianUserIds, opts.wardUserId);
  const extraRecipients = allRecipients.filter((id) => !opts.guardianUserIds.includes(id));
  for (const uid of extraRecipients) {
    await prisma.ownerNotification.create({
      data: {
        ownerUserId: uid,
        actorUserId: opts.wardUserId,
        title: opts.title,
        body: opts.body
      }
    });
    ssePublish(uid, {
      type: "vlue-family-protection-alert",
      kind: opts.kind,
      wardUserId: opts.wardUserId,
      title: opts.title,
      body: opts.body,
      at: new Date().toISOString(),
      ...opts.payload
    });
  }

  return { alerted: allRecipients.length, skippedCooldown: false };
}
