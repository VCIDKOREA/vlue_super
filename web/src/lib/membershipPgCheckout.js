/**
 * 멤버십 구독 결제 — 설정 › KPN 테스트 결제와 동일한 포트원 V2(KPN) 결제창 호출.
 * 모바일은 PG 페이지로 리다이렉트 후 /app/payment/v2/callback 에서 applyPendingMembershipPayment 로 마무리.
 */
import { defaultPortoneV2RedirectUrl, requestPortoneV2Payment } from "./portoneV2Payment.js";
import { getPortoneV2ChannelKey, getPortoneV2StoreId } from "./portoneV2Env.js";
import { resolveAuthValidityPeriod, writeMembershipBillingMeta } from "./authValidityPeriod.js";
import { clearPendingPayment } from "./postSignupPayment.js";

const PENDING_KEY = "vlue_v2_pay_membership";

export function membershipOrderName(tier) {
  return tier === "b2b" ? "VLUE 비즈니스 플랜" : "VLUE 유료 플랜";
}

/**
 * @param {object} opts
 * @param {"paid"|"b2b"} opts.tier
 * @param {number} opts.amount
 * @param {"monthly"|"annual"} [opts.billingCycle]
 * @param {string|null} [opts.referralCode]
 * @returns {Promise<{ redirected?: boolean, paymentId: string, complete?: object }>}
 */
export async function openPaymentGateway({ tier, amount, billingCycle = "monthly", referralCode = null }) {
  if (!getPortoneV2StoreId() || !getPortoneV2ChannelKey()) {
    throw new Error("결제 설정(Store/Channel)이 없습니다. 웹 배포 환경변수를 확인해 주세요.");
  }
  const orderName = membershipOrderName(tier);
  const pending = { tier, billingCycle, referralCode, amount };
  try {
    sessionStorage.setItem("vlue_v2_pay_amount", String(amount));
    sessionStorage.setItem("vlue_v2_pay_order_name", orderName);
    sessionStorage.setItem(PENDING_KEY, JSON.stringify(pending));
  } catch {
    /* ignore */
  }

  const result = await requestPortoneV2Payment({
    orderName,
    totalAmount: amount,
    payMethod: "CARD",
    redirectUrl: defaultPortoneV2RedirectUrl(),
    customData: { source: "membership_checkout", membershipTier: tier, billingCycle }
  });

  if (!result.redirected) {
    applyMembershipPaid(pending);
  }
  return result;
}

/** PG 승인(서버 검증) 완료 후 로컬 등급·결제 메타 반영 */
export function applyMembershipPaid({ tier, billingCycle = "monthly", referralCode = null }) {
  const cycle = billingCycle === "annual" ? "annual" : "monthly";
  try {
    const paidAt = new Date();
    localStorage.setItem("vlue_subscription_paid", "1");
    localStorage.setItem("membershipTier", tier);
    localStorage.setItem("vlue_membership_tier", tier);
    localStorage.setItem("vlue_membership_kind", tier);
    if (referralCode) localStorage.setItem("vlue_used_referral_code", referralCode);
    const validity = resolveAuthValidityPeriod({ billingCycle: cycle, paidAt });
    writeMembershipBillingMeta({ billingCycle: cycle, paidAt, cycleEndAt: validity?.validUntil || null });
    sessionStorage.removeItem(PENDING_KEY);
  } catch {
    /* ignore */
  }
  clearPendingPayment();
  try {
    window.dispatchEvent(
      new CustomEvent("vlue-membership-changed", { detail: { membershipTier: tier, tier } })
    );
  } catch {
    /* ignore */
  }
}

/** 리다이렉트 복귀 시 대기 중인 멤버십 결제가 있으면 반영하고 그 정보를 반환 */
export function applyPendingMembershipPayment() {
  let pending = null;
  try {
    pending = JSON.parse(sessionStorage.getItem(PENDING_KEY) || "null");
  } catch {
    pending = null;
  }
  if (!pending?.tier) return null;
  applyMembershipPaid(pending);
  return pending;
}

export function clearPendingMembershipPayment() {
  try {
    sessionStorage.removeItem(PENDING_KEY);
  } catch {
    /* ignore */
  }
}
