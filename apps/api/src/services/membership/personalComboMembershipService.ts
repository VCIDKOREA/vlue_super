import { prisma } from "../../db/client.js";
import type { PaidBillingCycle } from "./membershipBmConstants.js";
import { personalComboAddonAmountKrw } from "./membershipBmConstants.js";
import { referralDb } from "../../db/referralDb.js";
import {
  canUsePersonalComboPricing,
  resolveMembershipCheckoutAmountKrw
} from "./personalComboPricing.js";
import { getEnterpriseReferralSummaryForUser } from "./enterpriseReferralAttribution.js";
import { billingCycleFromPlan } from "./subscriptionBilling.js";

function addMonthsLocal(d: Date, months: number) {
  const x = new Date(d);
  x.setMonth(x.getMonth() + months);
  return x;
}

/**
 * 이미 유료 개인 구독 중인 사용자가 회사 인증을 마치면
 * 재결제 없이 임직원 콤보(5,100)로 플래그·다음 청구액만 전환.
 */
export async function applyPersonalComboPricingToActiveSubscription(userId: string): Promise<{
  converted: boolean;
  subscriptionId: string | null;
  nextAmountKrw: number | null;
}> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      enterpriseRole: true,
      enterpriseGroupId: true,
      isEnterpriseVerified: true
    }
  });
  if (!user || !canUsePersonalComboPricing(user)) {
    return { converted: false, subscriptionId: null, nextAmountKrw: null };
  }

  const active = await prisma.userSubscription.findFirst({
    where: { userId, status: "active", cycleEndAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" }
  });
  if (!active) {
    return { converted: false, subscriptionId: null, nextAmountKrw: null };
  }

  const cycle = billingCycleFromPlan(active.plan);
  const addon = personalComboAddonAmountKrw(cycle);
  if (active.isPersonalCombo && active.amountKrw === addon) {
    return { converted: false, subscriptionId: active.id, nextAmountKrw: addon };
  }

  await prisma.userSubscription.update({
    where: { id: active.id },
    data: {
      isPersonalCombo: true,
      amountKrw: addon,
      isDiscounted: false,
      isDiscountedNextCycle: false
    }
  });

  console.warn("[personal-combo] converted active paid → combo pricing", {
    userId,
    subscriptionId: active.id,
    fromAmount: active.amountKrw,
    toAmount: addon
  });

  return { converted: true, subscriptionId: active.id, nextAmountKrw: addon };
}

export async function getPersonalComboStatus(userId: string) {
  let user;
  try {
    user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        enterpriseRole: true,
        enterpriseGroupId: true,
        isEnterpriseVerified: true,
        enterpriseVerifiedAt: true,
        enterpriseVerifiedEmail: true,
        enterpriseVerifyNextCheckAt: true
      }
    });
  } catch (e) {
    console.warn("[personal-combo] user lookup failed", e);
    throw e;
  }
  if (!user) throw new Error("사용자를 찾을 수 없습니다.");

  const isCorporateLine = user.enterpriseRole !== "NONE" || Boolean(user.enterpriseGroupId);

  let activeSub = null;
  let pendingSub = null;
  try {
    activeSub = await prisma.userSubscription.findFirst({
      where: { userId, status: "active", cycleEndAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        plan: true,
        amountKrw: true,
        isPersonalCombo: true,
        cycleEndAt: true,
        nextChargeAt: true
      }
    });

    pendingSub = await prisma.userSubscription.findFirst({
      where: { userId, status: "pending_payment" },
      orderBy: { createdAt: "desc" },
      select: { id: true, plan: true, amountKrw: true, isPersonalCombo: true }
    });
  } catch (e) {
    console.warn("[personal-combo] subscription lookup failed", e);
  }

  let monthlyQuote: Awaited<ReturnType<typeof resolveMembershipCheckoutAmountKrw>> | null = null;
  try {
    if (user.isEnterpriseVerified) {
      monthlyQuote = await resolveMembershipCheckoutAmountKrw(userId, "monthly");
    }
  } catch (e) {
    console.warn("[personal-combo] quote failed", e);
  }

  let enterpriseReferral: Awaited<ReturnType<typeof getEnterpriseReferralSummaryForUser>> = {
    locked: false,
    sponsor: null
  };
  try {
    enterpriseReferral = await getEnterpriseReferralSummaryForUser(userId);
  } catch (e) {
    console.warn("[personal-combo] enterpriseReferral skipped", e);
  }

  const eligibleForComboConvert =
    user.isEnterpriseVerified &&
    !isCorporateLine &&
    Boolean(activeSub) &&
    !activeSub?.isPersonalCombo;

  return {
    isCorporateLine,
    isEnterpriseVerified: user.isEnterpriseVerified,
    enterpriseVerifiedAt: user.enterpriseVerifiedAt?.toISOString() ?? null,
    enterpriseVerifiedEmail: user.enterpriseVerifiedEmail,
    enterpriseVerifyNextCheckAt: user.enterpriseVerifyNextCheckAt?.toISOString() ?? null,
    activeSubscription: activeSub,
    pendingSubscription: pendingSub,
    comboMonthlyAmountKrw: monthlyQuote?.amountKrw ?? null,
    eligibleForComboConvert,
    comboPricingNote:
      "회사 회선(정가 14,700원) + 개인 임직원 콤보(5,100원) = 19,800원. 순서는 무관하며, 개인 유료 이용 중 회사 인증 시에도 다음 청구부터 5,100원으로 전환됩니다.",
    enterpriseReferralLocked: enterpriseReferral.locked,
    enterpriseReferralSponsor: enterpriseReferral.sponsor,
    referralPolicyNote:
      "회사 인증 후 개인 유료 가입 시 개인 추천인 지정 불가 · 기업 인수 VLUE(기업 추천인)으로 자동 귀속"
  };
}

export async function createPersonalComboSubscription(userId: string, billingCycle: PaidBillingCycle) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      enterpriseRole: true,
      enterpriseGroupId: true,
      isEnterpriseVerified: true
    }
  });
  if (!user?.isEnterpriseVerified) {
    throw new Error("유료 콤보 요금제는 회사 인증이 필요합니다.");
  }

  const quote = await resolveMembershipCheckoutAmountKrw(userId, billingCycle);

  /** 이미 유료 구독 중이면 재결제 없이 콤보 전환 */
  const converted = await applyPersonalComboPricingToActiveSubscription(userId);
  if (converted.subscriptionId) {
    const active = await prisma.userSubscription.findUnique({
      where: { id: converted.subscriptionId }
    });
    if (active?.status === "active" && active.isPersonalCombo) {
      return Object.assign(active, { convertedWithoutPayment: true as const });
    }
  }

  const existingPending = await prisma.userSubscription.findFirst({
    where: { userId, status: "pending_payment" }
  });
  if (existingPending) {
    if (existingPending.isPersonalCombo && existingPending.amountKrw === quote.amountKrw) {
      return existingPending;
    }
    await prisma.userSubscription.update({
      where: { id: existingPending.id },
      data: { status: "cancelled", cancelledAt: new Date(), cancelReason: "personal_combo_requote" }
    });
  }

  const now = new Date();
  const cycleEnd = billingCycle === "annual" ? addMonthsLocal(now, 12) : addMonthsLocal(now, 1);

  const attr = await referralDb.referralAttribution.findUnique({
    where: { userId },
    select: { sponsorVluerUserId: true, referralCodeUsed: true }
  });

  return prisma.userSubscription.create({
    data: {
      userId,
      plan: billingCycle === "annual" ? "b2c_annual" : "b2c_monthly",
      status: "pending_payment",
      amountKrw: quote.amountKrw,
      listPriceKrw: quote.listPriceKrw,
      isDiscounted: false,
      isPersonalCombo: true,
      sponsorVluerUserId: attr?.sponsorVluerUserId ?? null,
      referralCodeUsed: attr?.referralCodeUsed ?? null,
      cycleStartAt: now,
      cycleEndAt: cycleEnd,
      nextChargeAt: cycleEnd
    }
  });
}

/** 퇴사·메일 불능 시 콤보 혜택만 회수 — 개인 활동 데이터는 보존 */
export async function revokePersonalComboBenefit(userId: string, reason: string) {
  const now = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: {
        isEnterpriseVerified: false,
        enterpriseVerifiedAt: null,
        enterpriseVerifiedEmail: null,
        enterpriseVerifyNextCheckAt: null
      }
    });

    const subs = await tx.userSubscription.findMany({
      where: { userId, status: { in: ["active", "pending_payment"] }, isPersonalCombo: true }
    });

    for (const sub of subs) {
      await tx.userSubscription.update({
        where: { id: sub.id },
        data: {
          status: "cancelled",
          cancelledAt: now,
          cancelReason: reason.slice(0, 120)
        }
      });
    }

    const card = await tx.digitalCard.findUnique({ where: { userId }, select: { id: true } });
    if (card) {
      await tx.digitalCard.update({
        where: { id: card.id },
        data: { membershipTierSnapshot: "free" }
      });
    }
  });

  return { ok: true as const, revoked: true, reason };
}
