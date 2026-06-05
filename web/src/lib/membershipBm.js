/** BM 명세 — 멤버십(유료/무료) · VLUER 등급(일반/인증/파트너/공식) */

export const PERSONAL_COMBO_ADDON_MONTHLY_KRW = 5100;
export const PERSONAL_COMBO_ADDON_ANNUAL_KRW = 51000;
export const B2B_SUBORDINATE_MONTHLY_KRW = 14700;
export const PERSONAL_COMBO_PRICING_NOTE =
  "회사 부담 14,700원 + 개인 부담 5,100원 = 유료 회원 19,800원과 동일한 VLUER 혜택";

export const ENTERPRISE_REFERRAL_POLICY_NOTE =
  "회사 인증 후 개인 유료(콤보) 가입 시 개인 추천인 코드를 지정할 수 없으며, 해당 기업을 인수한 VLUE(기업 추천인)으로 자동 귀속됩니다.";

export function personalComboAmountKrw(billingCycle) {
  return billingCycle === "annual" ? PERSONAL_COMBO_ADDON_ANNUAL_KRW : PERSONAL_COMBO_ADDON_MONTHLY_KRW;
}

export function buildPersonalComboPaymentPreview(billingCycle = "monthly") {
  const amountKrw = personalComboAmountKrw(billingCycle);
  return {
    amountKrw,
    amountLabel: formatKrw(amountKrw),
    badges: ["임직원 콤보", "회사 인증 필요"],
    detailLine: PERSONAL_COMBO_PRICING_NOTE,
    compareFrom: formatKrw(PAID_MONTHLY_DISCOUNTED_KRW),
    compareTo: formatKrw(amountKrw)
  };
}

export const PAID_LIST_PRICE_MONTHLY_KRW = 28300;
/** 1년 구독 정가 — 2개월 무료(10개월분) */
export const PAID_LIST_PRICE_ANNUAL_KRW = 283000;
export const ANNUAL_FREE_MONTHS = 2;
export const REFERRAL_DISCOUNT_RATE = 0.3;
export const REFERRAL_DISCOUNT_RATE_SLIDING = 0.15;
export const REFERRAL_BENEFIT_PROMO_MONTHS = 12;
export const PAID_MONTHLY_DISCOUNTED_KRW = 19800;
export const PAID_ANNUAL_DISCOUNTED_KRW = 198000;
/** 13개월째부터 피추천인 영구 15% 할인 (정가 28,300원 기준) */
export const PAID_MONTHLY_SLIDING_DISCOUNTED_KRW = 24050;

/** 피추천인(가입자) 구독 할인 */
export const REFERRAL_DISCOUNT_NOTICE =
  `※ 피추천인(가입자) 구독 할인: 추천인 코드로 유료 가입 시 최초 ${REFERRAL_BENEFIT_PROMO_MONTHS}개월 30% 할인(월 ${PAID_MONTHLY_DISCOUNTED_KRW.toLocaleString("ko-KR")}원 / 1년 ${PAID_ANNUAL_DISCOUNTED_KRW.toLocaleString("ko-KR")}원·2개월 무료). ${REFERRAL_BENEFIT_PROMO_MONTHS + 1}개월째부터 15% 할인(월 ${PAID_MONTHLY_SLIDING_DISCOUNTED_KRW.toLocaleString("ko-KR")}원)이 영구 적용됩니다.`;

/** 추천인(코드 제공 VLUER) 구독 리워드 */
export const REFERRAL_SPONSOR_REWARD_NOTICE =
  `※ 추천인(코드 제공 VLUER) 적립: 추천 코드로 가입·결제한 회원의 구독료 기준, 가입 후 ${REFERRAL_BENEFIT_PROMO_MONTHS}개월 동안 VLUER 등급별 구독 리워드(인증 10%·파트너 15% 캐시 등). ${REFERRAL_BENEFIT_PROMO_MONTHS + 1}개월째부터 해당 회원 구독 분은 5% 고정(영구)으로 조정됩니다.`;

export const REFERRAL_POST_SIGNUP_NOTICE =
  "※ 추천인 없이 정가로 가입해도 사후 등록이 가능하며, 등록 시점의 가입일·결제 주기에 맞춰 위 할인·적립이 순차 적용됩니다. (예: 12일 정가 가입 후 20일 추천인 등록 → 다음 달 12일 결제부터 30% 구간 시작)";

/** 서비스소개·약관용 — 할인 + 스폰서 + 사후등록 */
export const REFERRAL_PROGRAM_NOTICES = [
  REFERRAL_DISCOUNT_NOTICE,
  REFERRAL_SPONSOR_REWARD_NOTICE,
  REFERRAL_POST_SIGNUP_NOTICE
];

export const PAID_MEMBERSHIP_SUBLINE =
  `월 ${PAID_LIST_PRICE_MONTHLY_KRW.toLocaleString("ko-KR")}원 · 1년 ${PAID_LIST_PRICE_ANNUAL_KRW.toLocaleString("ko-KR")}원 (2개월 무료)`;

export const B2B_MEMBERSHIP_SUBLINE =
  "10회선↑ · 대표 28,300원/월(추천인 없음) · 하부 14,700원/월 · AI광고 · 가족보호";

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

export function paidAmountKrw(billingCycle, withReferralDiscount) {
  if (billingCycle === "annual") {
    return withReferralDiscount ? PAID_ANNUAL_DISCOUNTED_KRW : PAID_LIST_PRICE_ANNUAL_KRW;
  }
  return withReferralDiscount ? PAID_MONTHLY_DISCOUNTED_KRW : PAID_LIST_PRICE_MONTHLY_KRW;
}

/** 12개월 월정가 합산 — 2개월 무료 비교용 */
export function annualTwelveMonthListKrw() {
  return PAID_LIST_PRICE_MONTHLY_KRW * 12;
}

/**
 * 예상 결제 UI용 — 금액·할인 문구 분리
 */
export function buildPaymentPreview(billingCycle, withReferralDiscount) {
  const cycle = billingCycle === "annual" ? "annual" : "monthly";
  const amountKrw = paidAmountKrw(cycle, withReferralDiscount);

  if (cycle === "monthly") {
    return {
      amountKrw,
      amountLabel: formatKrw(amountKrw),
      badges: withReferralDiscount ? ["30% 할인"] : [],
      compareFrom: null,
      compareTo: null,
      detailLine: withReferralDiscount
        ? `추천인 할인 (정가 ${PAID_LIST_PRICE_MONTHLY_KRW.toLocaleString("ko-KR")}원)`
        : `정가 ${PAID_LIST_PRICE_MONTHLY_KRW.toLocaleString("ko-KR")}원`
    };
  }

  const twelveMonth = annualTwelveMonthListKrw();
  const badges = ["12개월 이용", "2개월 무료"];
  if (withReferralDiscount) badges.push("30% 할인");

  return {
    amountKrw,
    amountLabel: formatKrw(amountKrw),
    badges,
    compareFrom: formatKrw(twelveMonth),
    compareTo: formatKrw(amountKrw),
    detailLine: `월 ${PAID_LIST_PRICE_MONTHLY_KRW.toLocaleString("ko-KR")}원 × 10개월 분 · ${formatKrw(twelveMonth - amountKrw)} 절약`
  };
}

export function formatKrw(n) {
  return `${Math.max(0, Math.floor(Number(n) || 0)).toLocaleString("ko-KR")}원`;
}
