import { prisma } from "../../db/client.js";
import { chargeSubscribeWithPortoneSecrets } from "../../integrations/portone/iamportBilling.js";
import {
  addMonths,
  buildRenewalMerchantUid,
  resolveSubscriptionChargeAmount,
  subscribeRenewalProductName
} from "./subscriptionBilling.js";
import { canUsePersonalComboPricing } from "./personalComboPricing.js";
import { revokePersonalComboBenefit } from "./personalComboMembershipService.js";
import { settleSubscriptionReferralCommission } from "./subscriptionReferralSettlement.js";

function requireEnv(name: string): string {
  const v = process.env[name]?.trim();
  if (!v) throw new Error(`${name} 환경변수가 필요합니다.`);
  return v;
}

export type RenewalResult =
  | {
      ok: true;
      subscriptionId: string;
      userId: string;
      amountKrw: number;
      impUid: string | null;
      merchantUid: string;
      discountApplied: boolean;
      postReferralActivated: boolean;
    }
  | {
      ok: false;
      subscriptionId: string;
      userId: string;
      error: string;
      merchantUid?: string;
    };

export async function renewUserSubscription(
  subscriptionId: string,
  asOf: Date
): Promise<RenewalResult> {
  const sub = await prisma.userSubscription.findUnique({
    where: { id: subscriptionId },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          phoneE164: true,
          legalName: true,
          enterpriseRole: true,
          enterpriseGroupId: true,
          isEnterpriseVerified: true
        }
      }
    }
  });
  if (!sub) {
    return { ok: false, subscriptionId, userId: "", error: "구독을 찾을 수 없습니다." };
  }
  if (sub.status !== "active") {
    return { ok: false, subscriptionId, userId: sub.userId, error: `구독 상태: ${sub.status}` };
  }
  if (!sub.portoneCustomerUid) {
    return { ok: false, subscriptionId, userId: sub.userId, error: "빌링키(portoneCustomerUid) 없음" };
  }

  if (sub.isPersonalCombo && sub.user && !canUsePersonalComboPricing(sub.user)) {
    await revokePersonalComboBenefit(sub.userId, "enterprise_verify_lapsed_before_renewal");
    return {
      ok: false,
      subscriptionId: sub.id,
      userId: sub.userId,
      error: "회사 인증이 만료되어 콤보 구독이 해지되었습니다."
    };
  }

  const charge = await resolveSubscriptionChargeAmount(sub, sub.user);
  const merchantUid = buildRenewalMerchantUid(sub.id, asOf);

  const existingPay = await prisma.subscriptionPayment.findUnique({
    where: { merchantUid }
  });
  if (existingPay?.status === "paid") {
    return {
      ok: true,
      subscriptionId: sub.id,
      userId: sub.userId,
      amountKrw: existingPay.amountKrw,
      impUid: existingPay.impUid,
      merchantUid,
      discountApplied: sub.isDiscounted,
      postReferralActivated: false
    };
  }

  let impUid: string | null = null;
  let portoneStatus = "paid";
  let rawResponse: Record<string, unknown> | null = null;

  const allowDev =
    process.env.VLUE_CRON_DEV_BYPASS_BILLING === "1" ||
    (process.env.NODE_ENV !== "production" && process.env.VLUE_ALLOW_DEV_BILLING === "1");

  try {
    if (allowDev) {
      impUid = `dev_renew_${merchantUid}`;
      rawResponse = { devBypass: true, cron: true };
    } else {
      const impKey = requireEnv("PORTONE_API_KEY");
      const impSecret = requireEnv("PORTONE_API_SECRET");
      const charged = await chargeSubscribeWithPortoneSecrets(impKey, impSecret, {
        customer_uid: sub.portoneCustomerUid,
        merchant_uid: merchantUid,
        amount: charge.amountKrw,
        name: subscribeRenewalProductName(charge.cycle),
        buyer_email: sub.user?.email || undefined,
        buyer_tel: sub.user?.phoneE164?.replace(/^\+82/, "0") || undefined
      });
      impUid = charged.imp_uid || null;
      portoneStatus = charged.status || "paid";
      rawResponse = charged as Record<string, unknown>;
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await prisma.subscriptionPayment.upsert({
      where: { merchantUid },
      create: {
        userId: sub.userId,
        subscriptionId: sub.id,
        merchantUid,
        customerUid: sub.portoneCustomerUid,
        amountKrw: charge.amountKrw,
        status: "failed",
        portoneStatus: "failed",
        rawResponse: { error: msg }
      },
      update: {
        status: "failed",
        portoneStatus: "failed",
        rawResponse: { error: msg }
      }
    });
    try {
      const { enterGraceForUserSubscription } = await import("../billing/lineBillingService.js");
      await enterGraceForUserSubscription(sub.id, "payment_failed", asOf);
    } catch (graceErr) {
      console.error("[subscription-renewal] enter grace", sub.id, graceErr);
    }
    return { ok: false, subscriptionId: sub.id, userId: sub.userId, error: msg, merchantUid };
  }

  const now = new Date();
  const cycleMonths = charge.cycle === "annual" ? 12 : 1;
  const cycleEnd = addMonths(now, cycleMonths);
  const postReferralActivated = Boolean(sub.isDiscountedNextCycle);

  await prisma.$transaction(async (tx) => {
    await tx.subscriptionPayment.upsert({
      where: { merchantUid },
      create: {
        userId: sub.userId,
        subscriptionId: sub.id,
        merchantUid,
        impUid,
        customerUid: sub.portoneCustomerUid || `renew_${sub.id}`,
        amountKrw: charge.amountKrw,
        status: "paid",
        portoneStatus,
        paidAt: now,
        rawResponse: { ...(rawResponse ?? {}), billingReason: charge.reason, cycle: charge.cycle } as import("@prisma/client").Prisma.InputJsonValue
      },
      update: {
        impUid,
        status: "paid",
        portoneStatus,
        paidAt: now,
        rawResponse: { ...(rawResponse ?? {}), billingReason: charge.reason, cycle: charge.cycle } as import("@prisma/client").Prisma.InputJsonValue
      }
    });

    await tx.userSubscription.update({
      where: { id: sub.id },
      data: {
        amountKrw: charge.amountKrw,
        listPriceKrw: charge.listPriceKrw,
        cycleStartAt: now,
        cycleEndAt: cycleEnd,
        nextChargeAt: cycleEnd,
        ...(charge.reason === "personal_combo_addon" ? { isPersonalCombo: true } : {}),
        ...(postReferralActivated
          ? {
              isDiscounted: true,
              isDiscountedNextCycle: false
            }
          : sub.isDiscounted
            ? { isDiscounted: true }
            : { isDiscounted: false })
      }
    });
  });

  try {
    await settleSubscriptionReferralCommission({
      payerUserId: sub.userId,
      subscriptionId: sub.id,
      merchantUid,
      grossPaymentKrw: charge.amountKrw,
      plan: sub.plan
    });
  } catch (e) {
    console.error("[subscription-referral-settlement]", sub.userId, merchantUid, e);
  }

  try {
    const { syncCertifiedLineFromUserSubscription, restoreLineFromPayment } = await import(
      "../billing/lineBillingService.js"
    );
    const lineId = await syncCertifiedLineFromUserSubscription(sub.userId);
    if (lineId) {
      await restoreLineFromPayment(lineId, {
        amountKrw: charge.amountKrw,
        cycleMonths,
        portoneCustomerUid: sub.portoneCustomerUid,
        impUid,
        merchantUid
      });
    }
  } catch (e) {
    console.error("[subscription-renewal] restore line", sub.id, e);
  }

  return {
    ok: true,
    subscriptionId: sub.id,
    userId: sub.userId,
    amountKrw: charge.amountKrw,
    impUid,
    merchantUid,
    discountApplied: charge.applyDiscount,
    postReferralActivated
  };
}
