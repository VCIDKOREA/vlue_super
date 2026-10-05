import {
  PRICE_LIST_MONTHLY_KRW,
  PRICE_MOBILE_PROMO_ANNUAL_KRW,
  PRICE_MOBILE_PROMO_MONTHLY_KRW,
  PRICE_REFERRAL_ANNUAL_KRW,
  PRICE_REFERRAL_MONTHLY_KRW,
  ANNUAL_FREE_MONTHS as POLICY_ANNUAL_FREE_MONTHS,
  quotePaidCharge,
  type ChargeQuoteInput
} from "./vluePricingPolicy2026.js";

export const PAID_LIST_PRICE_MONTHLY_KRW = PRICE_LIST_MONTHLY_KRW;
/** 정가 12개월 표시용 */
export const PAID_LIST_PRICE_ANNUAL_KRW = PRICE_LIST_MONTHLY_KRW * 12;
export const ANNUAL_FREE_MONTHS = POLICY_ANNUAL_FREE_MONTHS;

/** @deprecated 슬라이딩 % — 신규는 quotePaidCharge 사용 */
export const REFERRAL_DISCOUNT_RATE = 0.3;
export const SLIDING_DISCOUNT_RATE = 0.15;
export const PROMO_BENEFIT_MONTHS = 12;
export const REJOIN_REFERRAL_PENALTY_MONTHS = 6;
export const REFERRAL_LOCK_MONTHS = 3;
export const SLIDING_RENEWAL_MONTHLY_KRW = 24_050;
export const SLIDING_RENEWAL_SUPPLY_KRW = 21_863.6;
export const PROMO_SUPPLY_MONTHLY_KRW = 18_000;

/** 모바일 이벤트가 (추천인 없음) — 기본 판매가 */
export const PAID_EVENT_MONTHLY_KRW = PRICE_MOBILE_PROMO_MONTHLY_KRW;
export const PAID_EVENT_ANNUAL_KRW = PRICE_MOBILE_PROMO_ANNUAL_KRW;
/** 추천인+최초가입 판매가 */
export const PAID_REFERRAL_MONTHLY_KRW = PRICE_REFERRAL_MONTHLY_KRW;
export const PAID_REFERRAL_ANNUAL_KRW = PRICE_REFERRAL_ANNUAL_KRW;

/** @deprecated 별칭 — 모바일 이벤트가 */
export const PAID_MONTHLY_DISCOUNTED_KRW = PAID_EVENT_MONTHLY_KRW;
/** @deprecated 별칭 — 모바일 연간 이벤트가 */
export const PAID_ANNUAL_DISCOUNTED_KRW = PAID_EVENT_ANNUAL_KRW;

export type MembershipKind = "free" | "paid" | "b2b";
export type PaidBillingCycle = "monthly" | "annual";

export function isB2bMembershipKind(raw: string | undefined | null): boolean {
  return String(raw || "").toLowerCase() === "b2b";
}

export function isPaidMembershipKind(raw: string | undefined | null): boolean {
  const k = String(raw || "free").toLowerCase();
  return k === "paid" || k === "standard" || k === "premium";
}

export function isBillableMembershipKind(raw: string | undefined | null): boolean {
  return isPaidMembershipKind(raw) || isB2bMembershipKind(raw);
}

export function normalizeMembershipKind(raw: string | undefined | null): MembershipKind {
  const k = String(raw || "free").toLowerCase();
  if (isB2bMembershipKind(k)) return "b2b";
  if (isPaidMembershipKind(k)) return "paid";
  return "free";
}

export function paidListAmountKrw(cycle: PaidBillingCycle): number {
  return cycle === "annual" ? PAID_LIST_PRICE_ANNUAL_KRW : PAID_LIST_PRICE_MONTHLY_KRW;
}

/**
 * 청구액 — 기본은 모바일 이벤트가.
 * 최초가입+추천인코드면 추천가. opts 없으면 모바일 이벤트가(하위호환).
 */
export function paidChargeAmountKrw(
  cycle: PaidBillingCycle,
  isDiscountedOrOpts?: boolean | Partial<ChargeQuoteInput>
): number {
  if (typeof isDiscountedOrOpts === "object" && isDiscountedOrOpts) {
    return quotePaidCharge({
      cycle,
      isFirstJoin: Boolean(isDiscountedOrOpts.isFirstJoin),
      hasReferrerCode: Boolean(isDiscountedOrOpts.hasReferrerCode),
      isExtensionLine: Boolean(isDiscountedOrOpts.isExtensionLine)
    }).amountKrw;
  }
  /* 레거시: isDiscounted=true 를 추천가로 해석하지 않고 모바일 이벤트(기본 판매)로 유지 */
  return cycle === "annual" ? PAID_EVENT_ANNUAL_KRW : PAID_EVENT_MONTHLY_KRW;
}

export { quotePaidCharge };
export type { ChargeQuoteInput };

export const PERSONAL_COMBO_ADDON_MONTHLY_KRW = 5100;
export const PERSONAL_COMBO_ADDON_ANNUAL_KRW = 51000;

export function personalComboAddonAmountKrw(cycle: PaidBillingCycle): number {
  return cycle === "annual" ? PERSONAL_COMBO_ADDON_ANNUAL_KRW : PERSONAL_COMBO_ADDON_MONTHLY_KRW;
}
