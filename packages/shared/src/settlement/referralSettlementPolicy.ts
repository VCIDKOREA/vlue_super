import { roundWon } from "../money/moneyKrw.js";
import { ANNUAL_PAID_MONTHS, WITHHOLDING_TAX_RATE } from "./settlementConstants.js";
import type { VluerGrade } from "../vluer/vluerGradeTypes.js";
import { gradeSpec } from "../vluer/tierPolicy.js";
import {
  PAID_ANNUAL_DISCOUNTED_KRW,
  PAID_LIST_PRICE_ANNUAL_KRW,
  PAID_LIST_PRICE_MONTHLY_KRW,
  PAID_MONTHLY_DISCOUNTED_KRW,
  PROMO_BENEFIT_MONTHS,
  PROMO_SUPPLY_MONTHLY_KRW,
  SLIDING_RENEWAL_MONTHLY_KRW,
  SLIDING_RENEWAL_SUPPLY_KRW,
  type PaidBillingCycle
} from "../membership/membershipBmConstants.js";

export const LEGACY_REFERRAL_RATE = 0.05;
export const FIXED_PAYOUT_CERTIFIED_PROMO_KRW = 1_741;
export const FIXED_PAYOUT_PARTNER_PROMO_KRW = 2_611;
export const FIXED_PAYOUT_LEGACY_MONTHLY_KRW = 1_058;

export type ReferralBenefitPhase = "promo_tier" | "legacy_fixed_5pct";

export type SubscriptionCommissionQuote = {
  phase: ReferralBenefitPhase;
  commissionKrw: number;
  supplyKrw: number;
  rateFraction: number;
  blockedReason: string | null;
  isFixedPayout: boolean;
};

export function promoMonthsRemaining(accumulatedBeforeCharge: number): number {
  return Math.max(0, PROMO_BENEFIT_MONTHS - Math.max(0, accumulatedBeforeCharge));
}

export function resolveSlidingConsumerChargeKrw(
  accumulatedBeforeCharge: number,
  cycle: PaidBillingCycle,
  opts: { hadPromoEligibility: boolean }
): { amountKrw: number; inPromoWindow: boolean } {
  if (!opts.hadPromoEligibility) {
    return {
      amountKrw: cycle === "annual" ? PAID_LIST_PRICE_ANNUAL_KRW : PAID_LIST_PRICE_MONTHLY_KRW,
      inPromoWindow: false
    };
  }
  const remaining = promoMonthsRemaining(accumulatedBeforeCharge);
  if (remaining > 0) {
    return {
      amountKrw: cycle === "annual" ? PAID_ANNUAL_DISCOUNTED_KRW : PAID_MONTHLY_DISCOUNTED_KRW,
      inPromoWindow: true
    };
  }
  if (cycle === "annual") {
    return { amountKrw: SLIDING_RENEWAL_MONTHLY_KRW * ANNUAL_PAID_MONTHS, inPromoWindow: false };
  }
  return { amountKrw: SLIDING_RENEWAL_MONTHLY_KRW, inPromoWindow: false };
}

export function partnerNetPayoutKrw(supplyKrw: number, rateFraction: number): number {
  const preTax = supplyKrw * rateFraction;
  const afterWithhold = preTax * (1 - WITHHOLDING_TAX_RATE);
  return roundWon(afterWithhold);
}

export function benefitMonthIndexAfterCharge(accumulatedBefore: number, monthsAdded: number): number {
  return accumulatedBefore + monthsAdded;
}

export function referralBenefitPhase(benefitMonthIndex: number): ReferralBenefitPhase {
  return benefitMonthIndex > PROMO_BENEFIT_MONTHS ? "legacy_fixed_5pct" : "promo_tier";
}

export function quoteSubscriptionReferralCommission(input: {
  sponsorGrade: VluerGrade;
  benefitMonthIndex: number;
  sponsorPenaltyActive: boolean;
  billingCycle: PaidBillingCycle;
}): SubscriptionCommissionQuote {
  if (input.sponsorPenaltyActive) {
    return {
      phase: referralBenefitPhase(input.benefitMonthIndex),
      commissionKrw: 0,
      supplyKrw: 0,
      rateFraction: 0,
      blockedReason: "rejoin_abuse_penalty",
      isFixedPayout: false
    };
  }

  const spec = gradeSpec(input.sponsorGrade);
  if (spec.settlementExcluded) {
    return {
      phase: referralBenefitPhase(input.benefitMonthIndex),
      commissionKrw: 0,
      supplyKrw: 0,
      rateFraction: 0,
      blockedReason: "official_grade_b2b_only",
      isFixedPayout: false
    };
  }

  const phase = referralBenefitPhase(input.benefitMonthIndex);

  if (phase === "legacy_fixed_5pct") {
    let commissionKrw = FIXED_PAYOUT_LEGACY_MONTHLY_KRW;
    if (input.billingCycle === "annual") {
      commissionKrw = roundWon(commissionKrw * ANNUAL_PAID_MONTHS);
    }
    return {
      phase,
      commissionKrw,
      supplyKrw: SLIDING_RENEWAL_SUPPLY_KRW,
      rateFraction: LEGACY_REFERRAL_RATE,
      blockedReason: null,
      isFixedPayout: true
    };
  }

  if (spec.payoutMode === "reward_only") {
    let commissionKrw = roundWon(PROMO_SUPPLY_MONTHLY_KRW * (spec.ratePct / 100));
    if (input.billingCycle === "annual") {
      commissionKrw = roundWon(commissionKrw * ANNUAL_PAID_MONTHS);
    }
    return {
      phase,
      commissionKrw,
      supplyKrw: PROMO_SUPPLY_MONTHLY_KRW,
      rateFraction: spec.ratePct / 100,
      blockedReason: null,
      isFixedPayout: false
    };
  }

  const rateFraction = spec.ratePct / 100;
  let commissionKrw =
    input.sponsorGrade === "certified"
      ? FIXED_PAYOUT_CERTIFIED_PROMO_KRW
      : input.sponsorGrade === "partner"
        ? FIXED_PAYOUT_PARTNER_PROMO_KRW
        : partnerNetPayoutKrw(PROMO_SUPPLY_MONTHLY_KRW, rateFraction);
  const isFixedPayout = input.sponsorGrade === "certified" || input.sponsorGrade === "partner";

  if (input.billingCycle === "annual") {
    commissionKrw = roundWon(commissionKrw * ANNUAL_PAID_MONTHS);
  }

  return {
    phase,
    commissionKrw,
    supplyKrw: PROMO_SUPPLY_MONTHLY_KRW,
    rateFraction,
    blockedReason: null,
    isFixedPayout
  };
}
