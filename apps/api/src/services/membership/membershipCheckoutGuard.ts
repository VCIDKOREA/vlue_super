import type { PaidBillingCycle } from "./membershipBmConstants.js";
import { resolveMembershipCheckoutAmountKrw } from "./personalComboPricing.js";

/**
 * 멤버십 checkout 금액 가드 — 개인 콤보 5,100원 / 일반 유료 19,800·28,300
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
