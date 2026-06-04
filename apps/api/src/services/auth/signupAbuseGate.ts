import { prisma } from "../../db/client.js";
import { initializeRejoinBenefitFromAbuseLog } from "../membership/memberReferralBenefitService.js";
import {
  DISCOUNT_RATE_PROMO_PCT,
  DISCOUNT_RATE_SLIDING_PCT,
  evaluateSignupBranchFromAbuseLog,
  hashPhoneNumberSha256,
  normalizePhoneNumber,
  resolveIdentityHash,
  resolveRejoinConsumerDiscount,
  SignupGateValidationError,
  type SignupGateEvaluation
} from "@vlue/shared/signup";

export {
  DISCOUNT_RATE_PROMO_PCT,
  DISCOUNT_RATE_SLIDING_PCT,
  evaluateSignupBranchFromAbuseLog,
  hashPhoneNumberSha256,
  normalizePhoneNumber,
  resolveIdentityHash,
  resolveRejoinConsumerDiscount,
  SignupGateValidationError
};
export type { SignupGateBranch, SignupGateEvaluation } from "@vlue/shared/signup";

export async function evaluateSignupGate(input: {
  phoneNumber?: string | null;
  phoneE164?: string | null;
  ciHash?: Buffer | Uint8Array | null;
  referrerCode?: string | null;
}): Promise<SignupGateEvaluation> {
  const hashedIdentity = resolveIdentityHash({
    phoneNumber: input.phoneNumber,
    phoneE164: input.phoneE164,
    ciHash: input.ciHash
  });

  const log = await prisma.abusingProtectionLog.findUnique({
    where: { hashedIdentity },
    select: {
      accumulatedUsingMonths: true,
      lastReferralCode: true
    }
  });

  return evaluateSignupBranchFromAbuseLog(
    hashedIdentity,
    log
      ? {
          accumulatedUsingMonths: log.accumulatedUsingMonths,
          lastReferralCode: log.lastReferralCode
        }
      : null,
    input.referrerCode
  );
}

export async function applySignupGateToUser(
  userId: string,
  gate: SignupGateEvaluation
): Promise<void> {
  const referrerToStore =
    gate.referrerCodeInput?.trim().toUpperCase() ||
    (gate.branch === "rejoin_from_abuse_log" ? gate.lastReferralCode : null) ||
    null;

  await prisma.user.update({
    where: { id: userId },
    data: {
      status: "ACTIVE",
      referrerCode: referrerToStore,
      currentDiscountRate: gate.currentDiscountRate
    }
  });

  if (gate.branch === "rejoin_from_abuse_log") {
    await initializeRejoinBenefitFromAbuseLog(
      userId,
      gate.accumulatedUsingMonths,
      gate.lastReferralCode
    );
  } else {
    await prisma.memberReferralBenefitState.upsert({
      where: { userId },
      create: {
        userId,
        accumulatedBenefitMonths: 0,
        sponsorPenaltyMonthsLeft: 0,
        isRejoinFromAbuseLog: false
      },
      update: {}
    });
  }
}

export async function syncUserDiscountRateFromBenefitMonths(userId: string): Promise<number> {
  const state = await prisma.memberReferralBenefitState.findUnique({
    where: { userId },
    select: { accumulatedBenefitMonths: true }
  });
  const months = state?.accumulatedBenefitMonths ?? 0;
  const { currentDiscountRate } = resolveRejoinConsumerDiscount(months);
  await prisma.user.update({
    where: { id: userId },
    data: { currentDiscountRate }
  });
  return currentDiscountRate;
}
