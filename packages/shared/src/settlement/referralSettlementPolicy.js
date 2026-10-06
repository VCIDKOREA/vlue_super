import { roundWon } from "../money/moneyKrw.js";
import { ANNUAL_PAID_MONTHS, WITHHOLDING_TAX_RATE } from "./settlementConstants.js";
import { effectiveSettlementChannel, FRIEND_SPONSOR_RATE_MONTHS_1_12, PROMO_SPONSOR_RATE_MONTHS_13_PLUS, PROMO_SPONSOR_RATE_MONTHS_1_12 } from "../referral/referralChannelPolicy.js";
import { PAID_ANNUAL_DISCOUNTED_KRW, PAID_MONTHLY_DISCOUNTED_KRW, PROMO_BENEFIT_MONTHS, PROMO_SUPPLY_MONTHLY_KRW, SLIDING_RENEWAL_SUPPLY_KRW } from "../membership/membershipBmConstants.js";
export function promoMonthsRemaining(accumulatedBeforeCharge) {
    return Math.max(0, PROMO_BENEFIT_MONTHS - Math.max(0, accumulatedBeforeCharge));
}
export function resolveSlidingConsumerChargeKrw(accumulatedBeforeCharge, cycle, opts) {
    /** 2026-10: 기본 판매 = 모바일 이벤트가. 슬라이딩 정가 복귀 폐지. */
    const promoAmount = cycle === "annual" ? PAID_ANNUAL_DISCOUNTED_KRW : PAID_MONTHLY_DISCOUNTED_KRW;
    if (!opts.hadPromoEligibility) {
        return { amountKrw: promoAmount, inPromoWindow: true };
    }
    if (opts.referralChannel === "friend") {
        return {
            amountKrw: cycle === "annual" ? 99_000 : 9_900,
            inPromoWindow: true
        };
    }
    const remaining = promoMonthsRemaining(accumulatedBeforeCharge);
    if (remaining > 0 && opts.referralChannel === "promo") {
        return {
            amountKrw: cycle === "annual" ? 99_000 : 9_900,
            inPromoWindow: true
        };
    }
    return { amountKrw: promoAmount, inPromoWindow: true };
}
export function benefitMonthIndexAfterCharge(accumulatedBefore, monthsAdded) {
    return accumulatedBefore + monthsAdded;
}
export function referralBenefitPhase(benefitMonthIndex) {
    return benefitMonthIndex > PROMO_BENEFIT_MONTHS ? "months_13_plus" : "months_1_12";
}
function sponsorRateForChannel(channel, phase) {
    if (channel === "friend") {
        if (phase === "months_13_plus")
            return null;
        return { rate: FRIEND_SPONSOR_RATE_MONTHS_1_12, payoutMode: "reward_only" };
    }
    if (phase === "months_13_plus") {
        return { rate: PROMO_SPONSOR_RATE_MONTHS_13_PLUS, payoutMode: "cash_commission" };
    }
    return { rate: PROMO_SPONSOR_RATE_MONTHS_1_12, payoutMode: "cash_commission" };
}
function commissionFromSupply(supplyKrw, rate, payoutMode, billingCycle) {
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
export function quoteSubscriptionReferralCommission(input) {
    const channel = effectiveSettlementChannel(input.attributionChannel, input.sponsorVluerPromoActive);
    const phase = referralBenefitPhase(input.benefitMonthIndex);
    const blocked = (reason) => ({
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
    const supplyKrw = phase === "months_13_plus" ? SLIDING_RENEWAL_SUPPLY_KRW : PROMO_SUPPLY_MONTHLY_KRW;
    const commissionKrw = commissionFromSupply(supplyKrw, rateSpec.rate, rateSpec.payoutMode, input.billingCycle);
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
export function quoteSubscriptionReferralCommissionLegacy(_input) {
    return quoteSubscriptionReferralCommission({
        attributionChannel: "promo",
        sponsorVluerPromoActive: true,
        benefitMonthIndex: _input.benefitMonthIndex,
        sponsorPenaltyActive: _input.sponsorPenaltyActive,
        billingCycle: _input.billingCycle,
        sponsorPaidReferralCount: 1
    });
}
