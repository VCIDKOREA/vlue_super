import type { User, UserSubscription } from "@prisma/client";
import { prisma } from "../../db/client.js";
import {
  type PaidBillingCycle,
  paidChargeAmountKrw,
  paidListAmountKrw,
  personalComboAddonAmountKrw
} from "./membershipBmConstants.js";
import { billingCycleFromPlan } from "./subscriptionBilling.js";

export type PersonalAccountFlags = Pick<
  User,
  "enterpriseRole" | "enterpriseGroupId" | "isEnterpriseVerified"
>;

/** 순수 개인 계정 — B2B 회선에 묶이지 않음 */
export function isStandalonePersonalAccount(user: PersonalAccountFlags): boolean {
  return user.enterpriseRole === "NONE" && !user.enterpriseGroupId;
}

export function canUsePersonalComboPricing(user: PersonalAccountFlags): boolean {
  return isStandalonePersonalAccount(user) && user.isEnterpriseVerified;
}

export type MembershipCheckoutResolution = {
  cycle: PaidBillingCycle;
  amountKrw: number;
  listPriceKrw: number;
  isPersonalCombo: boolean;
  reason: "personal_combo_addon" | "paid_list" | "paid_referral_discount";
};

/**
 * 멤버십 checkout·갱신 금액 — 개인 콤보 인증 시 5,100원(월)만 청구
 * 기업 User FK 없이 isEnterpriseVerified 플래그만 사용
 */
export async function resolveMembershipCheckoutAmountKrw(
  userId: string,
  cycle: PaidBillingCycle,
  opts: { isDiscounted?: boolean; forcePersonalCombo?: boolean } = {}
): Promise<MembershipCheckoutResolution> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      enterpriseRole: true,
      enterpriseGroupId: true,
      isEnterpriseVerified: true
    }
  });
  if (!user) {
    throw new Error("사용자를 찾을 수 없습니다.");
  }

  const comboEligible = canUsePersonalComboPricing(user) || Boolean(opts.forcePersonalCombo);
  if (comboEligible) {
    const addon = personalComboAddonAmountKrw(cycle);
    return {
      cycle,
      amountKrw: addon,
      listPriceKrw: paidListAmountKrw(cycle),
      isPersonalCombo: true,
      reason: "personal_combo_addon"
    };
  }

  const sub = await prisma.userSubscription.findFirst({
    where: { userId, status: { in: ["active", "pending_payment"] } },
    orderBy: { createdAt: "desc" },
    select: { isDiscounted: true, referralCodeUsed: true }
  });

  const sliding = await import("./memberReferralBenefitService.js").then((m) =>
    m.resolveBenefitAwareChargeKrw(userId, cycle, {
      isDiscounted: Boolean(opts.isDiscounted || sub?.isDiscounted),
      referralCodeUsed: sub?.referralCodeUsed ?? null
    })
  );

  if (
    sub?.referralCodeUsed ||
    opts.isDiscounted ||
    sub?.isDiscounted ||
    sliding.accumulatedBefore > 0
  ) {
    return {
      cycle,
      amountKrw: sliding.amountKrw,
      listPriceKrw: paidListAmountKrw(cycle),
      isPersonalCombo: false,
      reason: sliding.inPromoWindow ? "paid_referral_discount" : "paid_list"
    };
  }

  const discounted = Boolean(opts.isDiscounted);
  return {
    cycle,
    amountKrw: paidChargeAmountKrw(cycle, discounted),
    listPriceKrw: paidListAmountKrw(cycle),
    isPersonalCombo: false,
    reason: discounted ? "paid_referral_discount" : "paid_list"
  };
}

export function resolveSubscriptionChargeFromRecord(
  sub: Pick<
    UserSubscription,
    "plan" | "isDiscounted" | "isDiscountedNextCycle" | "amountKrw" | "isPersonalCombo"
  >,
  user: PersonalAccountFlags
): MembershipCheckoutResolution {
  const cycle = billingCycleFromPlan(sub.plan);

  /**
   * 순서 무관: 회사 인증된 개인 계정이면 활성 유료(비콤보)도 다음 청구는 임직원 콤보(5,100)로.
   */
  if (canUsePersonalComboPricing(user) || sub.isPersonalCombo) {
    if (!canUsePersonalComboPricing(user) && sub.isPersonalCombo) {
      return {
        cycle,
        amountKrw: paidListAmountKrw(cycle),
        listPriceKrw: paidListAmountKrw(cycle),
        isPersonalCombo: false,
        reason: "paid_list"
      };
    }
    const addon = personalComboAddonAmountKrw(cycle);
    return {
      cycle,
      amountKrw: addon,
      listPriceKrw: paidListAmountKrw(cycle),
      isPersonalCombo: true,
      reason: "personal_combo_addon"
    };
  }

  const listPriceKrw = paidListAmountKrw(cycle);
  if (sub.isDiscountedNextCycle || sub.isDiscounted) {
    return {
      cycle,
      amountKrw: paidChargeAmountKrw(cycle, true),
      listPriceKrw,
      isPersonalCombo: false,
      reason: "paid_referral_discount"
    };
  }

  return {
    cycle,
    amountKrw: listPriceKrw,
    listPriceKrw,
    isPersonalCombo: false,
    reason: "paid_list"
  };
}
