import { createVerify } from "node:crypto";
import type { RewardedAdAction } from "@prisma/client";
import { prisma } from "../../db/client.js";
import { resolveUserPolicy } from "./userPolicyManager.js";

const GRANT_TTL_MS = 15 * 60 * 1000;
const ALL_SHOWCASE_SLOTS_MASK = 0b11111;
const VALID_ACTIONS = new Set<RewardedAdAction>([
  "showcase_slot_unlock",
  "showcase_save",
  "bgm_apply"
]);

type VerifierKey = { keyId: number; pem: string };
let verifierKeysCache: { until: number; keys: VerifierKey[] } | null = null;

function slotFromTarget(targetKey: string | null | undefined): number | null {
  const slot = Number(String(targetKey || "").replace(/^slot:/, ""));
  return Number.isInteger(slot) && slot >= 2 && slot <= 5 ? slot : null;
}

function slotsFromMask(mask: number): number[] {
  return [1, 2, 3, 4, 5].filter((slot) => (mask & (1 << (slot - 1))) !== 0);
}

export async function getMonetizationPolicy(userId: string) {
  const policy = await resolveUserPolicy(userId);
  if (!policy.rewardedAdsRequired) {
    return { policy, unlockedShowcaseSlots: [1, 2, 3, 4, 5] };
  }
  const state = await prisma.userAdState.upsert({
    where: { userId },
    create: { userId },
    update: {}
  });
  return {
    policy,
    unlockedShowcaseSlots: slotsFromMask(state.showcaseSlotMask)
  };
}

export async function createRewardedAdChallenge(input: {
  userId: string;
  action: string;
  targetKey?: string | null;
}) {
  if (!VALID_ACTIONS.has(input.action as RewardedAdAction)) {
    throw Object.assign(new Error("invalid_reward_action"), { status: 400 });
  }
  const action = input.action as RewardedAdAction;
  const policy = await resolveUserPolicy(input.userId);
  if (!policy.rewardedAdsRequired) {
    return { required: false as const, policy };
  }

  const adState = await prisma.userAdState.upsert({
    where: { userId: input.userId },
    create: { userId: input.userId },
    update: {}
  });
  let targetKey = String(input.targetKey || "").trim() || null;
  if (action === "showcase_slot_unlock") {
    const slot = slotFromTarget(targetKey);
    if (!slot) throw Object.assign(new Error("invalid_showcase_slot"), { status: 400 });
    targetKey = `slot:${slot}`;
    if ((adState.showcaseSlotMask & (1 << (slot - 1))) !== 0) {
      return { required: false as const, policy, alreadyUnlocked: true, slot };
    }
  }

  const isFirstUse =
    (action === "showcase_save" && !adState.firstShowcaseSavedAt) ||
    (action === "bgm_apply" && !adState.firstBgmAppliedAt);
  const grant = await prisma.rewardedAdGrant.create({
    data: {
      userId: input.userId,
      action,
      targetKey,
      status: isFirstUse ? "earned" : "pending",
      providerPayloadJson: isFirstUse ? { source: "first_use_no_ad" } : undefined,
      earnedAt: isFirstUse ? new Date() : undefined,
      expiresAt: new Date(Date.now() + GRANT_TTL_MS)
    },
    select: { id: true, action: true, targetKey: true, expiresAt: true }
  });
  return {
    required: !isFirstUse,
    firstUse: isFirstUse,
    grant,
    ssv: { userId: input.userId, customData: grant.id }
  };
}

export async function getRewardedAdGrant(userId: string, grantId: string) {
  const grant = await prisma.rewardedAdGrant.findFirst({
    where: { id: grantId, userId },
    select: {
      id: true,
      action: true,
      targetKey: true,
      status: true,
      expiresAt: true,
      earnedAt: true,
      consumedAt: true
    }
  });
  if (!grant) return null;
  if (grant.status === "pending" && grant.expiresAt.getTime() < Date.now()) {
    return prisma.rewardedAdGrant.update({
      where: { id: grant.id },
      data: { status: "expired" },
      select: {
        id: true,
        action: true,
        targetKey: true,
        status: true,
        expiresAt: true,
        earnedAt: true,
        consumedAt: true
      }
    });
  }
  return grant;
}

export async function consumeRewardedAdGrant(input: {
  userId: string;
  grantId: string;
  action: RewardedAdAction;
}) {
  const policy = await resolveUserPolicy(input.userId);
  if (!policy.rewardedAdsRequired) return { ok: true, bypassed: true };
  if (input.action === "showcase_slot_unlock") {
    throw Object.assign(new Error("slot_grant_is_permanent"), { status: 400 });
  }
  return prisma.$transaction(async (tx) => {
    const updated = await tx.rewardedAdGrant.updateMany({
      where: {
        id: input.grantId,
        userId: input.userId,
        action: input.action,
        status: "earned",
        expiresAt: { gt: new Date() }
      },
      data: { status: "consumed", consumedAt: new Date() }
    });
    if (updated.count !== 1) return { ok: false, bypassed: false };
    if (input.action === "showcase_save") {
      await tx.userAdState.upsert({
        where: { userId: input.userId },
        create: { userId: input.userId, firstShowcaseSavedAt: new Date() },
        update: { firstShowcaseSavedAt: new Date() }
      });
    } else if (input.action === "bgm_apply") {
      await tx.userAdState.upsert({
        where: { userId: input.userId },
        create: { userId: input.userId, firstBgmAppliedAt: new Date() },
        update: { firstBgmAppliedAt: new Date() }
      });
    }
    return { ok: true, bypassed: false };
  });
}

async function getVerifierKeys(): Promise<VerifierKey[]> {
  if (verifierKeysCache && verifierKeysCache.until > Date.now()) return verifierKeysCache.keys;
  const response = await fetch("https://www.gstatic.com/admob/reward/verifier-keys.json");
  if (!response.ok) throw new Error(`admob_verifier_keys_${response.status}`);
  const payload = (await response.json()) as { keys?: VerifierKey[] };
  const keys = Array.isArray(payload.keys) ? payload.keys : [];
  verifierKeysCache = { until: Date.now() + 24 * 60 * 60 * 1000, keys };
  return keys;
}

function decodeSignature(raw: string): Buffer {
  return Buffer.from(decodeURIComponent(raw).replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

export async function verifyAndApplyAdMobSsv(rawQuery: string) {
  const marker = "&signature=";
  const signatureIndex = rawQuery.indexOf(marker);
  if (signatureIndex < 0) throw new Error("missing_signature");
  const signedPayload = rawQuery.slice(0, signatureIndex);
  const params = new URLSearchParams(rawQuery);
  const signature = params.get("signature");
  const keyId = Number(params.get("key_id"));
  const grantId = String(params.get("custom_data") || "").trim();
  const userId = String(params.get("user_id") || "").trim();
  const transactionId = String(params.get("transaction_id") || "").trim();
  if (!signature || !Number.isInteger(keyId) || !grantId || !userId || !transactionId) {
    throw new Error("invalid_ssv_payload");
  }

  const key = (await getVerifierKeys()).find((item) => Number(item.keyId) === keyId);
  if (!key) throw new Error("unknown_verifier_key");
  const verifier = createVerify("SHA256");
  verifier.update(signedPayload, "utf8");
  verifier.end();
  if (!verifier.verify(key.pem, decodeSignature(signature))) throw new Error("invalid_signature");

  return prisma.$transaction(async (tx) => {
    const grant = await tx.rewardedAdGrant.findFirst({
      where: { id: grantId, userId }
    });
    if (!grant) throw new Error("grant_not_found");
    if (grant.expiresAt.getTime() < Date.now()) {
      await tx.rewardedAdGrant.update({ where: { id: grant.id }, data: { status: "expired" } });
      throw new Error("grant_expired");
    }
    if (grant.status === "rejected" || grant.status === "expired") throw new Error("grant_inactive");
    if (grant.providerTransactionId && grant.providerTransactionId !== transactionId) {
      throw new Error("grant_transaction_mismatch");
    }
    if (grant.providerTransactionId === transactionId) {
      return { ok: true, grantId: grant.id, duplicate: true };
    }

    const now = new Date();
    await tx.rewardedAdGrant.update({
      where: { id: grant.id },
      data: {
        status: grant.action === "showcase_slot_unlock" ? "consumed" : "earned",
        providerTransactionId: transactionId,
        providerPayloadJson: Object.fromEntries(params.entries()),
        earnedAt: grant.earnedAt || now,
        consumedAt: grant.action === "showcase_slot_unlock" ? grant.consumedAt || now : null
      }
    });

    if (grant.action === "showcase_slot_unlock") {
      const slot = slotFromTarget(grant.targetKey);
      if (!slot) throw new Error("invalid_showcase_slot");
      const state = await tx.userAdState.upsert({
        where: { userId },
        create: { userId },
        update: {}
      });
      await tx.userAdState.update({
        where: { userId },
        data: { showcaseSlotMask: Math.min(ALL_SHOWCASE_SLOTS_MASK, state.showcaseSlotMask | (1 << (slot - 1))) }
      });
    }
    return { ok: true, grantId: grant.id };
  });
}
