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
 * NHN KCP PG 승인 심사 기준: 월간 결제 전용 및 "(1개월)" 형태 명시.
 * @param {object} [opts]
 * @param {string} [opts.kind] paid | b2b | extension_line | multi_profile
 * @param {string} [opts.tier] paid | b2b (kind 없을 때)
 * @param {"monthly"|"annual"} [opts.billingCycle]
 */
export function membershipOrderName(opts = {}) {
  const kind = String(opts.kind || opts.tier || "paid").toLowerCase();
  // NHN KCP PG 승인 심사 기준: 월간 결제 전용 및 "(1개월)" 형태 고정
  const cycleLabel = "1개월";

  switch (kind) {
    case "b2b":
      return `VLUE B2B 플랜 (${cycleLabel})`;
    case "b2b_admin":
      return `VLUE B2B 대표자 계정 (${cycleLabel})`;
    case "extension_line":
      return `VLUE 내선 대표번호 추가 회선 (${cycleLabel})`;
    case "multi_profile":
      return `VLUE 멀티 프로필 추가 슬롯 (${cycleLabel})`;
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
  const membershipTier =
    tier === "b2b" || productKind === "b2b" || productKind === "b2b_admin" ? "b2b" : "paid";
  // 심사 보완: 월간 결제 전용 고정
  const cycle = "monthly";
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
    goods_name: orderName,
    good_name: orderName,
    totalAmount: amount,
    payMethod: "CARD",
    redirectUrl: defaultPortoneV2RedirectUrl(),
    // NHN KCP / KPN 심사 보완: 서비스 제공기간 "구매일로부터 1개월" 명시
    period: "구매일로부터 1개월",
    service_period: "구매일로부터 1개월",
    servicePeriod: "구매일로부터 1개월",
    offerPeriod: { interval: "1m" },
    bypass: {
      kcp_v2: {
        good_expr: "1M",
        good_name: orderName,
        goods_name: orderName,
        service_period: "구매일로부터 1개월",
        period: "구매일로부터 1개월"
      },
      kcp: {
        good_expr: "1M",
        good_name: orderName,
        goods_name: orderName,
        service_period: "구매일로부터 1개월",
        period: "구매일로부터 1개월"
      },
      kpn: {
        good_expr: "1M",
        good_name: orderName,
        goods_name: orderName,
        service_period: "구매일로부터 1개월",
        period: "구매일로부터 1개월"
      }
    },
    customData: {
      source: "membership_checkout",
      membershipTier,
      productKind,
      billingCycle: cycle,
      period: "구매일로부터 1개월",
      service_period: "구매일로부터 1개월",
      goods_name: orderName
    }
  });

  if (!result.redirected) {
    applyMembershipPaid(pending);
  }
  return result;
}

/** PG 승인(서버 검증) 완료 후 로컬 등급·결제 메타 반영 */
export function applyMembershipPaid({ tier, billingCycle = "monthly", referralCode = null }) {
  const cycle = "monthly";
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
