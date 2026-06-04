import type { UserSubscription } from "@prisma/client";
import {
  type PaidBillingCycle,
  paidChargeAmountKrw,
  paidListAmountKrw
} from "./membershipBmConstants.js";
import {
  hadPromoEligibility,
  resolveBenefitAwareChargeKrw
} from "./memberReferralBenefitService.js";
import { resolveSubscriptionChargeFromRecord } from "./personalComboPricing.js";
import type { PersonalAccountFlags } from "./personalComboPricing.js";

export function addMonths(d: Date, months: number): Date {
  const out = new Date(d);
  out.setMonth(out.getMonth() + months);
  return out;
}

export function billingCycleFromPlan(plan: string): PaidBillingCycle {
  return plan === "b2c_annual" ? "annual" : "monthly";
}

/** Asia/Seoul 기준 YYYY-MM-DD */
export function koreaDateKey(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(d);
}

export function startOfKoreaDayUtc(asOf: Date): Date {
  const key = koreaDateKey(asOf);
  return new Date(`${key}T00:00:00+09:00`);
}

export function endOfKoreaDayUtc(asOf: Date): Date {
  const key = koreaDateKey(asOf);
  return new Date(`${key}T23:59:59.999+09:00`);
}

export type ChargeAmountResolution = {
  cycle: PaidBillingCycle;
  listPriceKrw: number;
  amountKrw: number;
  applyDiscount: boolean;
  reason:
    | "list_price"
    | "active_discount"
    | "scheduled_post_referral"
    | "personal_combo_addon"
    | "sliding_promo"
    | "sliding_renewal_15pct";
};

/**
 * 이번 회차 청구 금액
 * - isDiscounted: 현재 할인 구독
 * - isDiscountedNextCycle: 사후 추천인 — 이번 결제 후 isDiscounted 로 전이
 * - 2티어 승급 등으로 isDiscounted=false 이면 정가
 */
export async function resolveSubscriptionChargeAmount(
  sub: Pick<
    UserSubscription,
    | "plan"
    | "isDiscounted"
    | "isDiscountedNextCycle"
    | "amountKrw"
    | "isPersonalCombo"
    | "userId"
    | "referralCodeUsed"
  >,
  user?: PersonalAccountFlags
): Promise<ChargeAmountResolution> {
  if (user && sub.isPersonalCombo) {
    const resolved = resolveSubscriptionChargeFromRecord(sub, user);
    return {
      cycle: resolved.cycle,
      listPriceKrw: resolved.listPriceKrw,
      amountKrw: resolved.amountKrw,
      applyDiscount: resolved.reason === "paid_referral_discount",
      reason:
        resolved.reason === "personal_combo_addon"
          ? "personal_combo_addon"
          : resolved.reason === "paid_referral_discount"
            ? "active_discount"
            : resolved.reason === "paid_list"
              ? "list_price"
              : "list_price"
    };
  }

  const cycle = billingCycleFromPlan(sub.plan);
  const listPriceKrw = paidListAmountKrw(cycle);

  if (sub.isPersonalCombo) {
    const resolved = resolveSubscriptionChargeFromRecord(sub, {
      enterpriseRole: "NONE",
      enterpriseGroupId: null,
      isEnterpriseVerified: true
    });
    return {
      cycle,
      listPriceKrw: resolved.listPriceKrw,
      amountKrw: resolved.amountKrw,
      applyDiscount: false,
      reason: "personal_combo_addon"
    };
  }

  if (sub.isDiscountedNextCycle) {
    return {
      cycle,
      listPriceKrw,
      amountKrw: paidChargeAmountKrw(cycle, true),
      applyDiscount: true,
      reason: "scheduled_post_referral"
    };
  }

  const state = await resolveBenefitAwareChargeKrw(sub.userId, cycle, {
    isDiscounted: sub.isDiscounted,
    referralCodeUsed: sub.referralCodeUsed
  });

  if (
    hadPromoEligibility(
      { isDiscounted: sub.isDiscounted, referralCodeUsed: sub.referralCodeUsed },
      {
        accumulatedBenefitMonths: state.accumulatedBefore,
        sponsorPenaltyMonthsLeft: 0,
        isRejoinFromAbuseLog: false
      }
    )
  ) {
    return {
      cycle,
      listPriceKrw,
      amountKrw: state.amountKrw,
      applyDiscount: state.inPromoWindow,
      reason: state.inPromoWindow ? "sliding_promo" : "sliding_renewal_15pct"
    };
  }

  if (sub.isDiscounted) {
    return {
      cycle,
      listPriceKrw,
      amountKrw: paidChargeAmountKrw(cycle, true),
      applyDiscount: true,
      reason: "active_discount"
    };
  }

  return {
    cycle,
    listPriceKrw,
    amountKrw: listPriceKrw,
    applyDiscount: false,
    reason: "list_price"
  };
}

export function subscribeRenewalProductName(cycle: PaidBillingCycle): string {
  return `VLUE 멤버십 정기결제 (${cycle === "annual" ? "1년" : "1월"})`;
}

export function buildRenewalMerchantUid(subscriptionId: string, asOf: Date): string {
  return `renew_${subscriptionId.slice(0, 8)}_${koreaDateKey(asOf).replace(/-/g, "")}`;
}
