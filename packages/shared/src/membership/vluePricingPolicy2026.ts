/**
 * VLUÉ 가격·추천인·파트너·재가입 정책 (2026-10 명세서)
 * — CI(본인인증) 기준 최초 1회만 추천 할인·수수료 대상
 */

export const PRICE_LIST_MONTHLY_KRW = 28_300;
/** 모바일 이벤트(추천인 없음) */
export const PRICE_MOBILE_PROMO_MONTHLY_KRW = 14_100;
export const PRICE_MOBILE_PROMO_ANNUAL_KRW = 141_000;
/** 추천인 코드 + CI 최초 가입만 */
export const PRICE_REFERRAL_MONTHLY_KRW = 9_900;
export const PRICE_REFERRAL_ANNUAL_KRW = 99_000;
/** 추천인 할인액 (14,100 − 9,900) */
export const REFERRAL_DISCOUNT_KRW = 4_200;
/** 내선·대표번호 추가 (추천인 할인 불가) */
export const PRICE_EXTENSION_LINE_MONTHLY_KRW = 5_200;
export const PRICE_EXTENSION_LINE_LIST_MONTHLY_KRW = 14_100;

export const ANNUAL_FREE_MONTHS = 2;
export const COMMISSION_HOLD_DAYS = 14;

/** 정직원 — 유치 결제액 최대 10% */
export const EMPLOYEE_COMMISSION_RATE = 0.1;
/** 정직원 — 하부 외부파트너 매출 관리 포상 3% */
export const EMPLOYEE_DOWNLINE_OVERRIDE_RATE = 0.03;
/** 외부 파트너 — 최대 7%, 유치일로부터 12개월 */
export const EXTERNAL_PARTNER_COMMISSION_RATE = 0.07;
export const EXTERNAL_PARTNER_PAYOUT_MONTHS = 12;
/** 외부 파트너 월 최소 신규 유료 유치 */
export const EXTERNAL_PARTNER_MIN_MONTHLY_REFERRALS = 10;
/** 개인 파트너 원천징수 */
export const PARTNER_WITHHOLDING_TAX_RATE = 0.033;

export type PartnerProgramType = "EMPLOYEE" | "EXTERNAL_PARTNER";
export type PartnerProgramStatus = "ACTIVE" | "SUSPENDED" | "TERMINATED";

export type PaidBillingCycle = "monthly" | "annual";

export type ChargeQuoteInput = {
  cycle: PaidBillingCycle;
  /** CI 기준 최초 가입이면 true */
  isFirstJoin: boolean;
  /** 유효한 추천인 코드가 있으면 true (재가입·내선은 false) */
  hasReferrerCode: boolean;
  /** 내선/대표번호 추가 회선 */
  isExtensionLine?: boolean;
};

export type ChargeQuote = {
  amountKrw: number;
  listPriceKrw: number;
  referralDiscountApplied: boolean;
  tier: "list" | "mobile_promo" | "referral" | "extension_line";
  blockedReferralReason: string | null;
};

/**
 * 결제 금액 산정 — 재가입(CI)은 추천 할인 불가, 내선은 추천 할인 불가.
 */
export function quotePaidCharge(input: ChargeQuoteInput): ChargeQuote {
  const cycle = input.cycle === "annual" ? "annual" : "monthly";

  if (input.isExtensionLine) {
    return {
      amountKrw: PRICE_EXTENSION_LINE_MONTHLY_KRW,
      listPriceKrw: PRICE_EXTENSION_LINE_LIST_MONTHLY_KRW,
      referralDiscountApplied: false,
      tier: "extension_line",
      blockedReferralReason: input.hasReferrerCode ? "extension_line_no_referral" : null
    };
  }

  const listPriceKrw = cycle === "annual" ? PRICE_LIST_MONTHLY_KRW * 12 : PRICE_LIST_MONTHLY_KRW;

  if (input.isFirstJoin && input.hasReferrerCode) {
    return {
      amountKrw: cycle === "annual" ? PRICE_REFERRAL_ANNUAL_KRW : PRICE_REFERRAL_MONTHLY_KRW,
      listPriceKrw,
      referralDiscountApplied: true,
      tier: "referral",
      blockedReferralReason: null
    };
  }

  const blocked =
    !input.isFirstJoin && input.hasReferrerCode
      ? "rejoin_ci_no_referral"
      : !input.isFirstJoin
        ? "rejoin_ci"
        : null;

  return {
    amountKrw: cycle === "annual" ? PRICE_MOBILE_PROMO_ANNUAL_KRW : PRICE_MOBILE_PROMO_MONTHLY_KRW,
    listPriceKrw,
    referralDiscountApplied: false,
    tier: "mobile_promo",
    blockedReferralReason: blocked
  };
}

export function partnerCommissionRate(type: PartnerProgramType): number {
  return type === "EMPLOYEE" ? EMPLOYEE_COMMISSION_RATE : EXTERNAL_PARTNER_COMMISSION_RATE;
}

export function addDaysUtc(from: Date, days: number): Date {
  const d = new Date(from.getTime());
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

export const REFERRAL_EVENT_TERMS_KO = [
  "추천 혜택 적용 대상: 추천인 할인 및 파트너 수수료 지급은 VLUÉ 서비스에 최초로 가입하는 신규 회원(본인인증 CI 기준 1회)에 한하여 적용됩니다.",
  "재가입자 제한: 기존 회원이 탈퇴 후 재가입하거나, 동일한 사용자 정보(본인인증 식별값 CI 등)로 중복 가입하는 경우 추천인 코드 적용이 불가하며, 정상 결제 금액(모바일 이벤트가 또는 정가)이 적용됩니다.",
  "부정행위 제재: 가입과 탈퇴를 반복하는 등 부정한 방법으로 추천 혜택을 다회 수급하거나 파트너 수수료를 발생시킨 경우, 해당 계정의 혜택은 즉시 취소되며 지급된 성과금은 환수될 수 있습니다.",
  "정직원 인센티브: 추천 성과금은 근로의 대가인 기본 급여와 별개의 비정기적 경영 포상금이며, 근로기준법상 평균임금·퇴직금 산정 대상에서 제외됩니다. 퇴직일 즉시 수급 권리는 소멸하고 회사에 귀속됩니다.",
  "외부 파트너: 독립 계약자로서 4대보험·퇴직금·연차 등 근로기준법상 권리를 주장할 수 없으며, 수수료는 결제 후 14일 환불 유예가 지난 확정 매출에 한해 발생합니다. 개인은 3.3% 원천징수, 사업자는 세금계산서 발행이 필요합니다.",
  "외부 파트너 유지: 매월 최소 10명 이상 신규 유료 가입 유치가 필요하며, 미달 시 자격이 일시 정지되고 기존 유치 고객 수수료 권리는 회사에 귀속됩니다."
] as const;
