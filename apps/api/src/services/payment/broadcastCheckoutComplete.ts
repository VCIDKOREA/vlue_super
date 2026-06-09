import type { PaidBillingCycle } from "../membership/membershipBmConstants.js";
import { assertBroadcastCheckoutAmountKrw } from "../membership/membershipCheckoutGuard.js";
import { completeBroadcastCheckout } from "../membership/broadcastLineService.js";

const DEV_BROADCAST_PREFIX = "dev_broadcast_";

export function isDevBroadcastMerchant(merchantUid: string): boolean {
  return merchantUid.startsWith(DEV_BROADCAST_PREFIX);
}

export type CompleteBroadcastCheckoutInput = {
  userId: string;
  phoneE164: string;
  amount: number;
  billingCycle?: string | null;
  merchantUid: string;
  customerUid?: string;
  agreeRefundPolicy: boolean;
  devBillingBypass?: boolean;
};

function parseBillingCycle(raw: string | undefined | null): PaidBillingCycle {
  const s = String(raw || "monthly").toLowerCase();
  return s === "annual" || s === "yearly" ? "annual" : "monthly";
}

export async function completeBroadcastAddonPayment(input: CompleteBroadcastCheckoutInput) {
  const merchantUid = String(input.merchantUid || "").trim();
  const amount = Math.floor(Number(input.amount) || 0);
  const cycle = parseBillingCycle(input.billingCycle);

  if (!merchantUid) throw new Error("merchant_uid 가 필요합니다.");
  if (amount <= 0) throw new Error("결제 금액이 올바르지 않습니다.");
  if (!input.agreeRefundPolicy) throw new Error("환불 정책에 동의해 주세요.");

  await assertBroadcastCheckoutAmountKrw(input.userId, cycle, amount);

  const allowDev =
    input.devBillingBypass &&
    (process.env.NODE_ENV !== "production" || process.env.VLUE_ALLOW_DEV_BILLING === "1");

  if (!allowDev || !isDevBroadcastMerchant(merchantUid)) {
    const customerUid = String(input.customerUid || "").trim();
    const expectedCustomer = `user_customer_${input.userId}`;
    if (!customerUid || customerUid !== expectedCustomer) {
      throw new Error("customer_uid 가 현재 사용자와 일치하지 않습니다.");
    }
    // 실결제 검증은 포트원 빌링키 첫 회차와 동일하게 프론트 성공 응답 후 서버에서 금액·SKU만 검증
  }

  const line = await completeBroadcastCheckout({
    userId: input.userId,
    phoneE164: input.phoneE164,
    amountKrw: amount,
    billingCycle: cycle,
    merchantUid,
    agreeRefundPolicy: input.agreeRefundPolicy
  });

  return { line, merchantUid, amountKrw: amount, billingCycle: cycle };
}
