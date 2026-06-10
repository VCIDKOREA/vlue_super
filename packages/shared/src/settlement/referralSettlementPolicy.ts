import { roundWon } from "../money/moneyKrw.js";
import { ANNUAL_PAID_MONTHS, WITHHOLDING_TAX_RATE } from "./settlementConstants.js";
import {
  effectiveSettlementChannel,
  FRIEND_SPONSOR_RATE_MONTHS_1_12,
  PROMO_SPONSOR_RATE_MONTHS_13_PLUS,
  PROMO_SPONSOR_RATE_MONTHS_1_12,
  type ReferralChannel
} from "../referral/referralChannelPolicy.js";
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

export type ReferralBenefitPhase = "months_1_12" | "months_13_plus";

export type SubscriptionCommissionQuote = {
  phase: ReferralBenefitPhase;
  channel: ReferralChannel;
  commissionKrw: number;
  supplyKrw: number;
  rateFraction: number;
  payoutMode: "reward_only" | "cash_commission";
  blockedReason: string | null;
};

export function promoMonthsRemaining(accumulatedBeforeCharge: number): number {
  return Math.max(0, PROMO_BENEFIT_MONTHS - Math.max(0, accumulatedBeforeCharge));
}

export function resolveSlidingConsumerChargeKrw(
  accumulatedBeforeCharge: number,
  cycle: PaidBillingCycle,
  opts: { hadPromoEligibility: boolean; referralChannel?: ReferralChannel | null }
): { amountKrw: number; inPromoWindow: boolean } {
  if (!opts.hadPromoEligibility) {
    return {
      amountKrw: cycle === "annual" ? PAID_LIST_PRICE_ANNUAL_KRW : PAID_LIST_PRICE_MONTHLY_KRW,
      inPromoWindow: false
    };
  }

  /** 지인 추천 피추천인: 구독 시 30% 할인 유지 (15% 슬라이딩 없음) */
  if (opts.referralChannel === "friend") {
    return {
      amountKrw: cycle === "annual" ? PAID_ANNUAL_DISCOUNTED_KRW : PAID_MONTHLY_DISCOUNTED_KRW,
      inPromoWindow: true
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

export function benefitMonthIndexAfterCharge(accumulatedBefore: number, monthsAdded: number): number {
  return accumulatedBefore + monthsAdded;
}

export function referralBenefitPhase(benefitMonthIndex: number): ReferralBenefitPhase {
  return benefitMonthIndex > PROMO_BENEFIT_MONTHS ? "months_13_plus" : "months_1_12";
}

function sponsorRateForChannel(
  channel: ReferralChannel,
  phase: ReferralBenefitPhase
): { rate: number; payoutMode: "reward_only" | "cash_commission" } | null {
  if (channel === "friend") {
    if (phase === "months_13_plus") return null;
    return { rate: FRIEND_SPONSOR_RATE_MONTHS_1_12, payoutMode: "reward_only" };
  }
  if (phase === "months_13_plus") {
    return { rate: PROMO_SPONSOR_RATE_MONTHS_13_PLUS, payoutMode: "cash_commission" };
  }
  return { rate: PROMO_SPONSOR_RATE_MONTHS_1_12, payoutMode: "cash_commission" };
}

function commissionFromSupply(
  supplyKrw: number,
  rate: number,
  payoutMode: "reward_only" | "cash_commission",
  billingCycle: PaidBillingCycle
): number {
  let preTax = supplyKrw * rate;
  if (payoutMode === "cash_commission") {
    preTax = preTax * (1 - WITHHOLDING_TAX_RATE);
  }
  let commissionKrw = roundWon(preTax);
  if (billingCycle === "annual") {
    commissionKrw = roundWon(commissionKrw * ANNUAL_PAID_MONTHS);
  }
  return commissionKrw;
}

export function quoteSubscriptionReferralCommission(input: {
  attributionChannel: ReferralChannel;
  sponsorVluerPromoActive: boolean;
  benefitMonthIndex: number;
  sponsorPenaltyActive: boolean;
  billingCycle: PaidBillingCycle;
  sponsorPaidReferralCount: number;
}): SubscriptionCommissionQuote {
  const channel = effectiveSettlementChannel(
    input.attributionChannel,
    input.sponsorVluerPromoActive
  );
  const phase = referralBenefitPhase(input.benefitMonthIndex);

  const blocked = (reason: string): SubscriptionCommissionQuote => ({
    phase,
    channel,
    commissionKrw: 0,
    supplyKrw: 0,
    rateFraction: 0,
    payoutMode: channel === "friend" ? "reward_only" : "cash_commission",
    blockedReason: reason
  });

  if (input.sponsorPenaltyActive) {
    return blocked("rejoin_abuse_penalty");
  }

  const minReferrals = channel === "friend" && !input.sponsorVluerPromoActive ? 2 : 1;
  if (input.sponsorPaidReferralCount < minReferrals) {
    return blocked("insufficient_paid_referrals");
  }

  const rateSpec = sponsorRateForChannel(channel, phase);
  if (!rateSpec) {
    return blocked("friend_channel_month_13_plus");
  }

  const supplyKrw =
    phase === "months_13_plus" ? SLIDING_RENEWAL_SUPPLY_KRW : PROMO_SUPPLY_MONTHLY_KRW;
  const commissionKrw = commissionFromSupply(
    supplyKrw,
    rateSpec.rate,
    rateSpec.payoutMode,
    input.billingCycle
  );

  return {
    phase,
    channel,
    commissionKrw,
    supplyKrw,
    rateFraction: rateSpec.rate,
    payoutMode: rateSpec.payoutMode,
    blockedReason: null
  };
}

/** @deprecated 구 등급 기반 API 호환 — 신규는 quoteSubscriptionReferralCommission 사용 */
export function quoteSubscriptionReferralCommissionLegacy(_input: {
  sponsorGrade: string;
  benefitMonthIndex: number;
  sponsorPenaltyActive: boolean;
  billingCycle: PaidBillingCycle;
}): SubscriptionCommissionQuote {
  return quoteSubscriptionReferralCommission({
    attributionChannel: "promo",
    sponsorVluerPromoActive: true,
    benefitMonthIndex: _input.benefitMonthIndex,
    sponsorPenaltyActive: _input.sponsorPenaltyActive,
    billingCycle: _input.billingCycle,
    sponsorPaidReferralCount: 1
  });
}
