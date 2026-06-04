import { Buffer } from "node:buffer";
import { prisma } from "../../db/client.js";
import { hashCiUniqueKey } from "../../integrations/portone/iamportCert.js";
import { referralDb } from "../../db/referralDb.js";
import { getOrCreateBenefitState } from "../membership/memberReferralBenefitService.js";
import {
  applySignupGateToUser,
  evaluateSignupGate,
  hashPhoneNumberSha256,
  resolveIdentityHash
} from "./signupAbuseGate.js";

/** SHA-256 hex — abusing_protection_logs PK */
export function hashIdentityForAbuseLog(input: {
  ciHash?: Buffer | Uint8Array | null;
  phoneE164?: string | null;
  phoneNumber?: string | null;
}): string | null {
  try {
    return resolveIdentityHash({
      ciHash: input.ciHash,
      phoneE164: input.phoneE164,
      phoneNumber: input.phoneNumber
    });
  } catch {
    return null;
  }
}

export { hashPhoneNumberSha256 };

export function hashCiUniqueKeyHex(uniqueKey: string): string {
  return hashCiUniqueKey(uniqueKey).toString("hex");
}

/**
 * 탈퇴 시 PII 삭제 전 호출 — 혜택·추천 이력만 해시로 보관
 */
export async function archiveAbusingProtectionOnAccountDelete(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      ciHash: true,
      phoneE164: true,
      subscriptions: {
        where: { status: { in: ["active", "cancelled", "pending_payment"] } },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { referralCodeUsed: true }
      }
    }
  });
  if (!user) return;

  const hashedIdentity = hashIdentityForAbuseLog({
    ciHash: user.ciHash,
    phoneE164: user.phoneE164
  });
  if (!hashedIdentity) return;

  const benefit = await getOrCreateBenefitState(userId);
  let lastReferralCode = user.subscriptions[0]?.referralCodeUsed ?? null;
  if (!lastReferralCode) {
    try {
      const attr = await referralDb.referralAttribution.findUnique({
        where: { userId },
        select: { referralCodeUsed: true }
      });
      lastReferralCode = attr?.referralCodeUsed ?? null;
    } catch {
      /* referral DB 미연결 */
    }
  }

  await prisma.user.update({
    where: { id: userId },
    data: { status: "DELETED" }
  });

  await prisma.abusingProtectionLog.upsert({
    where: { hashedIdentity },
    create: {
      hashedIdentity,
      accumulatedUsingMonths: benefit.accumulatedBenefitMonths,
      lastReferralCode,
      deletedAt: new Date()
    },
    update: {
      accumulatedUsingMonths: benefit.accumulatedBenefitMonths,
      lastReferralCode,
      deletedAt: new Date()
    }
  });
}

/**
 * 신규 가입(본인인증 완료) 시 동일 신원 재가입 여부 검사
 */
export async function applyAbuseProtectionOnNewSignup(input: {
  userId: string;
  ciHash?: Buffer | Uint8Array | null;
  phoneE164?: string | null;
  phoneNumber?: string | null;
  referrerCode?: string | null;
}): Promise<{ rejoinDetected: boolean; accumulatedUsingMonths: number; currentDiscountRate: number }> {
  try {
    const gate = await evaluateSignupGate({
      ciHash: input.ciHash,
      phoneE164: input.phoneE164,
      phoneNumber: input.phoneNumber,
      referrerCode: input.referrerCode
    });
    await applySignupGateToUser(input.userId, gate);
    return {
      rejoinDetected: gate.branch === "rejoin_from_abuse_log",
      accumulatedUsingMonths: gate.accumulatedUsingMonths,
      currentDiscountRate: gate.currentDiscountRate
    };
  } catch {
    return { rejoinDetected: false, accumulatedUsingMonths: 0, currentDiscountRate: 30 };
  }
}
