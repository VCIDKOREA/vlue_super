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
export const PAID_MONTHLY_DISCOUNTED_KRW = 19800;
export const PAID_ANNUAL_DISCOUNTED_KRW = 198000;

export const REFERRAL_DISCOUNT_NOTICE =
  "※ 추천인 코드 입력 시 30% 즉시 할인이 적용됩니다. (월결제 19,800원 / 1년 구독 198,000원 — 2개월 무료 포함) 추천인 없이 정가로 가입하더라도 언제든지 사후 등록이 가능하며, 이 경우 '가입일자에 맞춰 다음 결제 주기부터 할인이 갱신·적용'됩니다. (예: 12일 정가 가입 후 20일 추천인 등록 시, 다음 달 12일부터 할인 가격으로 결제)";

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
