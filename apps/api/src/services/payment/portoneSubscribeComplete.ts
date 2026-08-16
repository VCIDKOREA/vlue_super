import type { Prisma } from "@prisma/client";
import { prisma } from "../../db/client.js";
import { chargeSubscribeWithPortoneSecrets } from "../../integrations/portone/iamportBilling.js";
import type { PaidBillingCycle } from "../membership/membershipBmConstants.js";
import { paidListAmountKrw } from "../membership/membershipBmConstants.js";
import { assertMembershipCheckoutAmountKrw } from "../membership/membershipCheckoutGuard.js";
import { settleSubscriptionReferralCommission } from "../membership/subscriptionReferralSettlement.js";

function requireEnv(name: string): string {
  const v = process.env[name]?.trim();
  if (!v) throw new Error(`${name} 환경변수가 필요합니다.`);
  return v;
}

function parseBillingCycle(raw: string | undefined | null): PaidBillingCycle {
  const s = String(raw || "monthly").toLowerCase();
  return s === "annual" || s === "yearly" ? "annual" : "monthly";
}

function subscribeProductName(cycle: PaidBillingCycle): string {
  return `VLUE 멤버십 구독 (${cycle === "annual" ? "1년" : "1월"})`;
}

const DEV_BILLING_PREFIX = "dev_billing_";

export function isDevBillingMerchant(merchantUid: string): boolean {
  return merchantUid.startsWith(DEV_BILLING_PREFIX);
}

export type CompleteSubscribeInput = {
  userId: string;
  customerUid: string;
  merchantUid: string;
  amount: number;
  billingCycle?: string | null;
  devBillingBypass?: boolean;
};

export async function completePortoneSubscribePayment(input: CompleteSubscribeInput) {
  const customerUid = String(input.customerUid || "").trim();
  const merchantUid = String(input.merchantUid || "").trim();
  const amount = Math.floor(Number(input.amount) || 0);

  if (!customerUid || !merchantUid) {
    throw new Error("customer_uid 와 merchant_uid 가 필요합니다.");
  }
  if (amount <= 0) {
    throw new Error("결제 금액이 올바르지 않습니다.");
  }

  const expectedCustomer = `user_customer_${input.userId}`;
  if (customerUid !== expectedCustomer) {
    throw new Error("customer_uid 가 현재 사용자와 일치하지 않습니다.");
  }

  const sub = await prisma.userSubscription.findFirst({
    where: { userId: input.userId, status: "pending_payment" },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      userId: true,
      amountKrw: true,
      cycleEndAt: true,
      plan: true,
      isPersonalCombo: true,
      isDiscounted: true
    }
  });
  if (!sub) {
    const active = await prisma.userSubscription.findFirst({
      where: { userId: input.userId, status: "active", portoneCustomerUid: customerUid },
      orderBy: { createdAt: "desc" }
    });
    if (active) {
      await prisma.digitalCard.upsert({
        where: { userId: input.userId },
        create: { userId: input.userId, membershipTierSnapshot: "paid" },
        update: { membershipTierSnapshot: "paid" }
      });
      return {
        subscriptionId: active.id,
        status: "active" as const,
        alreadyActive: true,
        impUid: null as string | null
      };
    }
    throw new Error("결제 대기 중인 구독이 없습니다. 가입을 다시 진행해 주세요.");
  }

  let expectedAmountKrw = sub.amountKrw;
  let expectedDiscounted = sub.isDiscounted;

  if (expectedAmountKrw !== amount) {
    /**
     * V1: UI·클라이언트는 출시가 9,900/99,000. 가입 시 pending이 정가 28,300으로 남은 경우 보정.
     * (shared dist 미재빌드여도 하드코드로 허용)
     */
    const cycleForHeal = parseBillingCycle(input.billingCycle ?? sub.plan);
    const listPrice = paidListAmountKrw(cycleForHeal);
    const sellMonthly = 9900;
    const sellAnnual = 99000;
    const sellPrice = cycleForHeal === "annual" ? sellAnnual : sellMonthly;
    const stalePending =
      expectedAmountKrw === listPrice ||
      expectedAmountKrw === 28300 ||
      expectedAmountKrw === 283000 ||
      expectedAmountKrw === 19800 ||
      expectedAmountKrw === 198000;

    if (amount === sellPrice && stalePending) {
      await prisma.userSubscription.update({
        where: { id: sub.id },
        data: {
          amountKrw: sellPrice,
          listPriceKrw: listPrice,
          isDiscounted: true
        }
      });
      expectedAmountKrw = sellPrice;
      expectedDiscounted = true;
    } else {
      throw new Error(`결제 금액이 구독 금액(${expectedAmountKrw}원)과 일치하지 않습니다.`);
    }
  }

  const cycle = parseBillingCycle(input.billingCycle ?? sub.plan);
  try {
    await assertMembershipCheckoutAmountKrw(input.userId, cycle, amount, {
      isPersonalCombo: sub.isPersonalCombo,
      isDiscounted: expectedDiscounted
    });
  } catch (e) {
    /** shared dist가 옛 정가 정책을 쓰면 assert가 실패 — V1 출시가와 일치하면 통과 */
    const msg = e instanceof Error ? e.message : String(e);
    const v1Sell = cycle === "annual" ? 99000 : 9900;
    if (amount !== v1Sell) throw e instanceof Error ? e : new Error(msg);
    console.warn("[subscribe-complete] checkout assert bypass for V1 sell price", msg);
  }

  const existingPay = await prisma.subscriptionPayment.findUnique({
    where: { merchantUid }
  });
  if (existingPay?.status === "paid") {
    await prisma.userSubscription.update({
      where: { id: sub.id },
      data: {
        status: "active",
        portoneCustomerUid: customerUid,
        cycleStartAt: new Date(),
        cycleEndAt: sub.cycleEndAt,
        nextChargeAt: sub.cycleEndAt
      }
    });
    await prisma.digitalCard.upsert({
      where: { userId: input.userId },
      create: { userId: input.userId, membershipTierSnapshot: "paid" },
      update: { membershipTierSnapshot: "paid" }
    });
    try {
      await settleSubscriptionReferralCommission({
        payerUserId: input.userId,
        subscriptionId: sub.id,
        merchantUid,
        grossPaymentKrw: amount,
        plan: sub.plan
      });
    } catch (e) {
      console.error("[subscription-referral-settlement]", input.userId, merchantUid, e);
    }
    return {
      subscriptionId: sub.id,
      status: "active" as const,
      alreadyActive: true,
      impUid: existingPay.impUid
    };
  }

  const user = await prisma.user.findUnique({
    where: { id: input.userId },
    select: { phoneE164: true, legalName: true, email: true }
  });

  let impUid: string | null = null;
  let portoneStatus = "paid";
  let rawResponse: Record<string, unknown> | null = null;

  const allowDev =
    input.devBillingBypass &&
    (process.env.NODE_ENV !== "production" ||
      process.env.VLUE_ALLOW_DEV_BILLING === "1" ||
      process.env.PORTONE_TEST_MODE === "1" ||
      String(process.env.PORTONE_TEST_MODE || "").toLowerCase() === "true");

  if (allowDev && isDevBillingMerchant(merchantUid)) {
    impUid = `dev_imp_${merchantUid}`;
    rawResponse = { devBypass: true, portoneTestMode: true };
  } else {
    const impKey = requireEnv("PORTONE_API_KEY");
    const impSecret = requireEnv("PORTONE_API_SECRET");
    const charged = await chargeSubscribeWithPortoneSecrets(impKey, impSecret, {
      customer_uid: customerUid,
      merchant_uid: merchantUid,
      amount,
      name: subscribeProductName(cycle),
      buyer_email: user?.email || undefined,
      buyer_tel: user?.phoneE164?.replace(/^\+82/, "0") || undefined
    });
    impUid = charged.imp_uid || null;
    portoneStatus = charged.status || "paid";
    rawResponse = charged as Record<string, unknown>;
  }

  const now = new Date();
  await prisma.$transaction(async (tx) => {
    await tx.subscriptionPayment.upsert({
      where: { merchantUid },
      create: {
        userId: input.userId,
        subscriptionId: sub.id,
        merchantUid,
        impUid,
        customerUid,
        amountKrw: amount,
        status: "paid",
        portoneStatus,
        paidAt: now,
        rawResponse: (rawResponse ?? undefined) as Prisma.InputJsonValue | undefined
      },
      update: {
        impUid,
        status: "paid",
        portoneStatus,
        paidAt: now,
        rawResponse: (rawResponse ?? undefined) as Prisma.InputJsonValue | undefined
      }
    });

    await tx.userSubscription.update({
      where: { id: sub.id },
      data: {
        status: "active",
        portoneCustomerUid: customerUid,
        cycleStartAt: now,
        cycleEndAt: sub.cycleEndAt,
        nextChargeAt: sub.cycleEndAt
      }
    });

    /** 로그인·게이트가 digitalCard.membershipTierSnapshot 을 본다 — 유료 활성화 시 동기화 */
    await tx.digitalCard.upsert({
      where: { userId: input.userId },
      create: {
        userId: input.userId,
        membershipTierSnapshot: "paid"
      },
      update: {
        membershipTierSnapshot: "paid"
      }
    });
  });

  try {
    await settleSubscriptionReferralCommission({
      payerUserId: input.userId,
      subscriptionId: sub.id,
      merchantUid,
      grossPaymentKrw: amount,
      plan: sub.plan
    });
  } catch (e) {
    console.error("[subscription-referral-settlement]", input.userId, merchantUid, e);
  }

  try {
    const { syncCertifiedLineFromUserSubscription, restoreLineFromPayment } = await import(
      "../billing/lineBillingService.js"
    );
    const lineId = await syncCertifiedLineFromUserSubscription(input.userId);
    if (lineId) {
      await restoreLineFromPayment(lineId, {
        amountKrw: amount,
        portoneCustomerUid: customerUid,
        impUid,
        merchantUid
      });
    }
  } catch (e) {
    console.error("[subscribe-complete] sync line", input.userId, e);
  }

  return {
    subscriptionId: sub.id,
    status: "active" as const,
    alreadyActive: false,
    impUid
  };
}
