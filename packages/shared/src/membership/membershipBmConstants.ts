export const PAID_LIST_PRICE_MONTHLY_KRW = 28300;
export const PAID_LIST_PRICE_ANNUAL_KRW = 283000;
export const ANNUAL_FREE_MONTHS = 2;
export const REFERRAL_DISCOUNT_RATE = 0.3;
export const SLIDING_DISCOUNT_RATE = 0.15;
export const PROMO_BENEFIT_MONTHS = 12;
export const REJOIN_REFERRAL_PENALTY_MONTHS = 6;
export const REFERRAL_LOCK_MONTHS = 3;
export const SLIDING_RENEWAL_MONTHLY_KRW = 24_050;
export const SLIDING_RENEWAL_SUPPLY_KRW = 21_863.6;
export const PROMO_SUPPLY_MONTHLY_KRW = 18_000;

/** V1 출시 이벤트가(판매가) — 정가 28,300원 대비 */
export const PAID_EVENT_MONTHLY_KRW = 9900;
export const PAID_EVENT_ANNUAL_KRW = 99000;
/** @deprecated V1 — 이벤트 판매가와 동일 */
export const PAID_MONTHLY_DISCOUNTED_KRW = PAID_EVENT_MONTHLY_KRW;
/** @deprecated V1 — 이벤트 판매가와 동일 */
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
 * V1 청구액 — 출시 이벤트 판매가(월 9,900 / 연 99,000).
 * 정가(list)는 표시·취소선용. `_isDiscounted` 는 하위 호환용으로 무시.
 */
export function paidChargeAmountKrw(cycle: PaidBillingCycle, _isDiscounted?: boolean): number {
  return cycle === "annual" ? PAID_EVENT_ANNUAL_KRW : PAID_EVENT_MONTHLY_KRW;
}

export const PERSONAL_COMBO_ADDON_MONTHLY_KRW = 5100;
export const PERSONAL_COMBO_ADDON_ANNUAL_KRW = 51000;

export function personalComboAddonAmountKrw(cycle: PaidBillingCycle): number {
  return cycle === "annual" ? PERSONAL_COMBO_ADDON_ANNUAL_KRW : PERSONAL_COMBO_ADDON_MONTHLY_KRW;
}
