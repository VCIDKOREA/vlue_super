/**
 * 멤버십 구독 결제 — 설정 › KPN 테스트 결제와 동일한 포트원 V2(KPN) 결제창 호출.
 * 모바일은 PG 페이지로 리다이렉트 후 /app/payment/v2/callback 에서 applyPendingMembershipPayment 로 마무리.
 */
import { defaultPortoneV2RedirectUrl, requestPortoneV2Payment } from "./portoneV2Payment.js";
import { getPortoneV2ChannelKey, getPortoneV2StoreId } from "./portoneV2Env.js";
import { resolveAuthValidityPeriod, writeMembershipBillingMeta } from "./authValidityPeriod.js";
import { clearPendingPayment } from "./postSignupPayment.js";

const PENDING_KEY = "vlue_v2_pay_membership";

/**
 * PG 결제창에 표시할 상품명 (종류·결제주기별).
 * @param {object} [opts]
 * @param {string} [opts.kind] paid | b2b | extension_line | multi_profile
 * @param {string} [opts.tier] paid | b2b (kind 없을 때)
 * @param {"monthly"|"annual"} [opts.billingCycle]
 */
export function membershipOrderName(opts = {}) {
  const kind = String(opts.kind || opts.tier || "paid").toLowerCase();
  const cycleLabel = opts.billingCycle === "annual" ? "연간" : "월간";

  switch (kind) {
    case "b2b":
      return `VLUE 비즈니스 플랜 (${cycleLabel})`;
    case "extension_line":
      return "VLUE 내선 대표번호 추가 회선";
    case "multi_profile":
      return "VLUE 멀티 프로필 추가 슬롯";
    case "paid":
    default:
      return `VLUE 유료 플랜 (${cycleLabel})`;
  }
}

/**
 * @param {object} opts
 * @param {"paid"|"b2b"} opts.tier 결제 후 반영할 멤버십 등급
 * @param {string} [opts.kind] 상품 종류 (표시명·메타용)
 * @param {number} opts.amount
 * @param {"monthly"|"annual"} [opts.billingCycle]
 * @param {string|null} [opts.referralCode]
 * @returns {Promise<{ redirected?: boolean, paymentId: string, complete?: object }>}
 */
export async function openPaymentGateway({
  tier,
  kind,
  amount,
  billingCycle = "monthly",
  referralCode = null
}) {
  if (!getPortoneV2StoreId() || !getPortoneV2ChannelKey()) {
    throw new Error("결제 설정(Store/Channel)이 없습니다. 웹 배포 환경변수를 확인해 주세요.");
  }
  const productKind = kind || tier || "paid";
  const membershipTier = tier === "b2b" ? "b2b" : productKind === "b2b" ? "b2b" : "paid";
  const cycle = billingCycle === "annual" ? "annual" : "monthly";
  const orderName = membershipOrderName({ kind: productKind, billingCycle: cycle });
  const pending = { tier: membershipTier, kind: productKind, billingCycle: cycle, referralCode, amount, orderName };
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
    customData: {
      source: "membership_checkout",
      membershipTier,
      productKind,
      billingCycle: cycle
    }
  });

  if (!result.redirected) {
    applyMembershipPaid(pending);
  }
  return result;
}

/** PG 승인(서버 검증) 완료 후 로컬 등급·결제 메타 반영 */
export function applyMembershipPaid({ tier, billingCycle = "monthly", referralCode = null }) {
  const cycle = billingCycle === "annual" ? "annual" : "monthly";
  const membershipTier = tier === "b2b" ? "b2b" : "paid";
  try {
    const paidAt = new Date();
    localStorage.setItem("vlue_subscription_paid", "1");
    localStorage.setItem("membershipTier", membershipTier);
    localStorage.setItem("vlue_membership_tier", membershipTier);
    localStorage.setItem("vlue_membership_kind", membershipTier);
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
      new CustomEvent("vlue-membership-changed", {
        detail: { membershipTier, tier: membershipTier }
      })
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
  if (!pending?.tier && !pending?.kind) return null;
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
