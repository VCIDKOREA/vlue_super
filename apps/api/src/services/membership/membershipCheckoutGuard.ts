import type { PaidBillingCycle } from "./membershipBmConstants.js";
import { loadPricingConfig } from "../pricing/pricingConfigService.js";
import { resolveMembershipCheckoutAmountKrw } from "./personalComboPricing.js";
import { resolveMembershipAccessSafe } from "./membershipAccessService.js";

/**
 * 멤버십 checkout 금액 가드 — 개인 콤보 / SOHO 활동형(Primary) / 정가
 */
export async function assertMembershipCheckoutAmountKrw(
  userId: string,
  billingCycle: PaidBillingCycle,
  requestedAmountKrw: number,
  opts: { isPersonalCombo?: boolean; isDiscounted?: boolean } = {}
) {
  const quote = await resolveMembershipCheckoutAmountKrw(userId, billingCycle, {
    isDiscounted: opts.isDiscounted
  });

  if (opts.isPersonalCombo && !quote.isPersonalCombo) {
    throw new Error("회사 인증이 만료되었거나 콤보 요금제를 이용할 수 없습니다.");
  }

  if (quote.amountKrw !== requestedAmountKrw) {
    throw new Error(
      `멤버십 결제 금액 불일치: 요청 ${requestedAmountKrw.toLocaleString("ko-KR")}원, 정책 ${quote.amountKrw.toLocaleString("ko-KR")}원`
    );
  }

  return quote;
}

/** SOHO 영업 송출 옵션(Secondary) — Primary 보유 + 4,200원(설정값) 결제 */
export async function assertBroadcastCheckoutAmountKrw(
  userId: string,
  billingCycle: PaidBillingCycle,
  requestedAmountKrw: number
) {
  const cfg = await loadPricingConfig();
  const plan = cfg.plans.soho_broadcast_addon;
  const expected = billingCycle === "annual" ? plan.annualKrw : plan.monthlyKrw;
  if (requestedAmountKrw !== expected) {
    throw new Error(
      `영업 송출 옵션 금액 불일치: 요청 ${requestedAmountKrw.toLocaleString("ko-KR")}원, 정책 ${expected.toLocaleString("ko-KR")}원`
    );
  }
  const access = await resolveMembershipAccessSafe(userId);
  if (!access.hasPrimarySoho) {
    throw new Error("영업 송출 옵션은 SOHO 활동형 Primary 계정이 먼저 필요합니다.");
  }
  return { amountKrw: expected, planSku: plan.sku, cycle: billingCycle };
}
