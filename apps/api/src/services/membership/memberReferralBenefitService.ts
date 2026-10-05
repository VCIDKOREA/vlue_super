import { prisma } from "../../db/client.js";
import { ANNUAL_PAID_MONTHS } from "../vluer/pricingConstants.js";
import {
  PROMO_BENEFIT_MONTHS,
  REJOIN_REFERRAL_PENALTY_MONTHS,
  quotePaidCharge,
  type PaidBillingCycle
} from "./membershipBmConstants.js";

export type BenefitStateSnapshot = {
  accumulatedBenefitMonths: number;
  sponsorPenaltyMonthsLeft: number;
  isRejoinFromAbuseLog: boolean;
};

export async function getOrCreateBenefitState(userId: string): Promise<BenefitStateSnapshot> {
  const row = await prisma.memberReferralBenefitState.upsert({
    where: { userId },
    create: { userId },
    update: {},
    select: {
      accumulatedBenefitMonths: true,
      sponsorPenaltyMonthsLeft: true,
      isRejoinFromAbuseLog: true
    }
  });
  return row;
}

export function billingCycleMonthsAdded(cycle: PaidBillingCycle): number {
  return cycle === "annual" ? ANNUAL_PAID_MONTHS : 1;
}

export function hadPromoEligibility(
  sub: { isDiscounted: boolean; referralCodeUsed: string | null },
  state: BenefitStateSnapshot
): boolean {
  return Boolean(sub.referralCodeUsed) || sub.isDiscounted || state.accumulatedBenefitMonths > 0;
}

/** 갱신·checkout 금액 — CI 최초가입+추천코드만 추천가, 그 외 모바일 이벤트가 */
export async function resolveBenefitAwareChargeKrw(
  userId: string,
  cycle: PaidBillingCycle,
  sub: { isDiscounted: boolean; referralCodeUsed: string | null }
): Promise<{ amountKrw: number; inPromoWindow: boolean; accumulatedBefore: number }> {
  const state = await getOrCreateBenefitState(userId);
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isFirstJoin: true, referrerCode: true }
  });
  const isFirstJoin = user?.isFirstJoin !== false && !state.isRejoinFromAbuseLog;
  const hasReferrerCode = Boolean(
    String(sub.referralCodeUsed || user?.referrerCode || "").trim()
  );
  const quote = quotePaidCharge({
    cycle,
    isFirstJoin,
    hasReferrerCode: isFirstJoin && hasReferrerCode
  });
  return {
    amountKrw: quote.amountKrw,
    inPromoWindow: quote.referralDiscountApplied || quote.tier === "mobile_promo",
    accumulatedBefore: state.accumulatedBenefitMonths
  };
}

export type PostPaymentBenefitAdvance = {
  accumulatedAfter: number;
  benefitMonthIndex: number;
  sponsorPenaltyActive: boolean;
  sponsorPenaltyMonthsLeftAfter: number;
};

/**
 * 결제 성공 후 혜택 개월 차감·재가입 페널티 소진
 * 페널티 6개월도 accumulatedBenefitMonths 에 포함(스펙)
 */
export async function advanceBenefitStateAfterPaid(
  userId: string,
  cycle: PaidBillingCycle,
  referralCodeUsed?: string | null
): Promise<PostPaymentBenefitAdvance> {
  const monthsAdded = billingCycleMonthsAdded(cycle);
  const current = await getOrCreateBenefitState(userId);

  const penaltyConsume = Math.min(
    current.sponsorPenaltyMonthsLeft,
    monthsAdded
  );
  const sponsorPenaltyMonthsLeftAfter = current.sponsorPenaltyMonthsLeft - penaltyConsume;
  const accumulatedAfter = current.accumulatedBenefitMonths + monthsAdded;

  await prisma.memberReferralBenefitState.update({
    where: { userId },
    data: {
      accumulatedBenefitMonths: accumulatedAfter,
      sponsorPenaltyMonthsLeft: sponsorPenaltyMonthsLeftAfter
    }
  });

  const benefitMonthIndex = accumulatedAfter;
  const sponsorPenaltyActive = current.sponsorPenaltyMonthsLeft > 0;

  const { syncUserDiscountRateFromBenefitMonths } = await import(
    "../auth/signupAbuseGate.js"
  );
  await syncUserDiscountRateFromBenefitMonths(userId);

  return {
    accumulatedAfter,
    benefitMonthIndex,
    sponsorPenaltyActive,
    sponsorPenaltyMonthsLeftAfter
  };
}

export async function initializeRejoinBenefitFromAbuseLog(
  userId: string,
  accumulatedUsingMonths: number,
  lastReferralCode: string | null
): Promise<void> {
  await prisma.memberReferralBenefitState.upsert({
    where: { userId },
    create: {
      userId,
      accumulatedBenefitMonths: Math.max(0, accumulatedUsingMonths),
      sponsorPenaltyMonthsLeft: REJOIN_REFERRAL_PENALTY_MONTHS,
      isRejoinFromAbuseLog: true
    },
    update: {
      accumulatedBenefitMonths: Math.max(0, accumulatedUsingMonths),
      sponsorPenaltyMonthsLeft: REJOIN_REFERRAL_PENALTY_MONTHS,
      isRejoinFromAbuseLog: true
    }
  });

  if (lastReferralCode) {
    const sponsor = await prisma.userVluerProfile.findFirst({
      where: { referralCode: lastReferralCode },
      select: { userId: true }
    });
    if (sponsor) {
      const { referralDb } = await import("../../db/referralDb.js");
      const lockUntil = new Date();
      lockUntil.setMonth(lockUntil.getMonth() + 3);
      await referralDb.referralAttribution.upsert({
        where: { userId },
        create: {
          userId,
          sponsorVluerUserId: sponsor.userId,
          referralCodeUsed: lastReferralCode,
          codeChangeLockedUntil: lockUntil
        },
        update: {
          sponsorVluerUserId: sponsor.userId,
          referralCodeUsed: lastReferralCode
        }
      });
    }
  }
}

export function remainingPromoMonthsForUser(state: BenefitStateSnapshot): number {
  return promoMonthsRemaining(state.accumulatedBenefitMonths);
}

export function isPastPromoBenefitWindow(state: BenefitStateSnapshot): boolean {
  return state.accumulatedBenefitMonths >= PROMO_BENEFIT_MONTHS;
}
