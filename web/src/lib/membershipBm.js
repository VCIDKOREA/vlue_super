/** BM 명세 — V1 멤버십(무료/유료/B2B) · 출시 이벤트 요금 */

import { getPricingConfigSync, pricingNumbers } from "./pricingConfig.js";

function nums() {
  return pricingNumbers();
}

export const PERSONAL_COMBO_ADDON_MONTHLY_KRW = 4700;
export const B2B_STAFF_PERSONAL_010_MONTHLY_KRW = 4700;
export const PERSONAL_COMBO_ADDON_ANNUAL_KRW = 51000;
export const B2B_SUBORDINATE_MONTHLY_KRW = 14700;
export const B2B_STAFF_EVENT_MONTHLY_KRW = 5200;
export const SOHO_BROADCAST_MONTHLY_KRW = 4200;
export const SOHO_BROADCAST_ANNUAL_KRW = 42000;

export function personalComboPricingNote() {
  const n = nums();
  return `회사 부담 ${n.b2bMonthly.toLocaleString("ko-KR")}원 + 개인 부담 ${n.personalComboMonthly.toLocaleString("ko-KR")}원`;
}

export const PERSONAL_COMBO_PRICING_NOTE =
  "회사 회선(정가 14,700원) + 직원 개인 010(4,700원). 업무용 계정 생성·이메일 인증 후 개인 휴대폰 등록 시 적용됩니다.";

export const ENTERPRISE_REFERRAL_POLICY_NOTE =
  "V1에서는 추천인 프로그램을 운영하지 않습니다.";

export function personalComboAmountKrw(billingCycle) {
  const n = nums();
  return billingCycle === "annual" ? n.personalComboAnnual : n.personalComboMonthly;
}

export function buildPersonalComboPaymentPreview(billingCycle = "monthly") {
  const amountKrw = personalComboAmountKrw(billingCycle);
  return {
    amountKrw,
    amountLabel: formatKrw(amountKrw),
    badges: ["임직원 콤보", "회사 인증 필요"],
    detailLine: personalComboPricingNote(),
    compareFrom: formatKrw(nums().paidListMonthly),
    compareTo: formatKrw(amountKrw)
  };
}

/** 유료 정가 (표시·취소선용) */
export const PAID_LIST_PRICE_MONTHLY_KRW = 28300;
/** 1년 구독 정가 — 12개월분 표시용 */
export const PAID_LIST_PRICE_ANNUAL_KRW = 283000;
export const ANNUAL_FREE_MONTHS = 2;

/** V1 출시 이벤트가 — 판매가 */
export const PAID_EVENT_MONTHLY_KRW = 9900;
export const PAID_EVENT_ANNUAL_KRW = 99000;
export const PAID_LAUNCH_DISCOUNT_NOTE =
  "VLUE V1 출시 기념 파격 65% 특별 할인 (종료 시까지!)";
export const PAID_ANNUAL_BENEFIT_NOTE =
  "(연간 구독 시 2개월 추가 무료 혜택: 연 99,000원)";

/** @deprecated 별칭 — V1 이벤트가 */
export const PAID_MONTHLY_DISCOUNTED_KRW = PAID_EVENT_MONTHLY_KRW;
/** @deprecated 별칭 — V1 연간 이벤트가 */
export const PAID_ANNUAL_DISCOUNTED_KRW = PAID_EVENT_ANNUAL_KRW;

/** V1 미운영 — 하위 호환용 상수 */
export const REFERRAL_DISCOUNT_RATE = 0;
export const REFERRAL_DISCOUNT_RATE_SLIDING = 0;
export const REFERRAL_BENEFIT_PROMO_MONTHS = 0;
export const PAID_MONTHLY_SLIDING_DISCOUNTED_KRW = PAID_EVENT_MONTHLY_KRW;

export const REFERRAL_FRIEND_DISCOUNT_NOTICE = "※ V1에서는 추천인 할인·리워드를 운영하지 않습니다.";
export const REFERRAL_PROMO_DISCOUNT_NOTICE = REFERRAL_FRIEND_DISCOUNT_NOTICE;
export const REFERRAL_PROMO_SPONSOR_NOTICE = REFERRAL_FRIEND_DISCOUNT_NOTICE;
export const REFERRAL_DISCOUNT_NOTICE = REFERRAL_FRIEND_DISCOUNT_NOTICE;
export const REFERRAL_SPONSOR_REWARD_NOTICE = REFERRAL_FRIEND_DISCOUNT_NOTICE;
export const REFERRAL_POST_SIGNUP_NOTICE = REFERRAL_FRIEND_DISCOUNT_NOTICE;
export const REFERRAL_PROGRAM_NOTICES = [];

export const PAID_MEMBERSHIP_SUBLINE = `월 ${PAID_EVENT_MONTHLY_KRW.toLocaleString("ko-KR")}원 · 연 ${PAID_EVENT_ANNUAL_KRW.toLocaleString("ko-KR")}원 · ${PAID_LAUNCH_DISCOUNT_NOTE}`;

export const B2B_REP_LIST_MONTHLY_KRW = 28300;
export const B2B_STAFF_LIST_MONTHLY_KRW = 14700;
export const B2B_EVENT_NOTE = "이벤트가격 (종료시까지)";

export const B2B_MEMBERSHIP_SUBLINE = `대표자 ${B2B_REP_LIST_MONTHLY_KRW.toLocaleString("ko-KR")}원 + 직원 회선 ${B2B_STAFF_EVENT_MONTHLY_KRW.toLocaleString("ko-KR")}원(${B2B_EVENT_NOTE})`;

export const SOHO_BROADCAST_MEMBERSHIP_SUBLINE =
  "대표자 계정 외 추가번호 쇼케이스만 제공 · 월 +4,200원(할인 적용 안 됨)";

export const SOHO_BROADCAST_NO_DISCOUNT_NOTE = "할인 적용 안 됨";

export const POST_SIGNUP_PAYMENT_NOTICE =
  "회원가입·본인인증이 완료되었습니다. 유료·기업 멤버십은 아래 결제창에서 첫 구독 요금을 결제해 주세요.";

export function isB2bMembershipKind(kind) {
  return String(kind || "").toLowerCase() === "b2b";
}

export function isPaidMembershipKind(kind) {
  const k = String(kind || "free").toLowerCase();
  return k === "paid" || k === "standard" || k === "premium";
}

/** 유료·기업 — 결제 대상 */
export function isBillableMembershipKind(kind) {
  return isPaidMembershipKind(kind) || isB2bMembershipKind(kind);
}

/** legacy standard/premium → paid, b2b 유지 */
export function normalizeMembershipKind(raw) {
  const k = String(raw || "free").toLowerCase();
  if (isB2bMembershipKind(k)) return "b2b";
  if (isPaidMembershipKind(k)) return "paid";
  return "free";
}

/** V1 판매가 — 출시 이벤트가(추천 할인 미운영) */
export function paidAmountKrw(billingCycle, _withReferralDiscount) {
  const n = nums();
  if (billingCycle === "annual") {
    return n.sohoAnnual;
  }
  return n.sohoMonthly;
}

export function broadcastAddonAmountKrw(billingCycle) {
  const n = nums();
  return billingCycle === "annual" ? n.broadcastAnnual : n.broadcastMonthly;
}

export function sohoActivityPlanDescription() {
  return getPricingConfigSync().plans.soho_activity.description;
}

export function sohoBroadcastPlanDescription() {
  return getPricingConfigSync().plans.soho_broadcast_addon.description;
}

export function b2bPlanDescription() {
  return getPricingConfigSync().plans.b2b_full_package.description;
}

/** 12개월 월정가 합산 — 2개월 무료 비교용 */
export function annualTwelveMonthListKrw() {
  return nums().paidListMonthly * 12;
}

/**
 * 예상 결제 UI용 — 금액·할인 문구 분리 (V1 출시 이벤트)
 */
export function buildPaymentPreview(billingCycle, _withReferralDiscount) {
  const cycle = billingCycle === "annual" ? "annual" : "monthly";
  const amountKrw = paidAmountKrw(cycle, false);
  const n = nums();

  if (cycle === "monthly") {
    return {
      amountKrw,
      amountLabel: formatKrw(amountKrw),
      badges: ["V1 65% 특별 할인"],
      compareFrom: formatKrw(n.paidListMonthly),
      compareTo: formatKrw(amountKrw),
      detailLine: PAID_LAUNCH_DISCOUNT_NOTE
    };
  }

  const twelveMonth = annualTwelveMonthListKrw();
  return {
    amountKrw,
    amountLabel: formatKrw(amountKrw),
    badges: ["12개월 이용", "2개월 추가 무료", "V1 특별 할인"],
    compareFrom: formatKrw(twelveMonth),
    compareTo: formatKrw(amountKrw),
    detailLine: PAID_ANNUAL_BENEFIT_NOTE
  };
}

export function formatKrw(n) {
  return `${Math.max(0, Math.floor(Number(n) || 0)).toLocaleString("ko-KR")}원`;
}
