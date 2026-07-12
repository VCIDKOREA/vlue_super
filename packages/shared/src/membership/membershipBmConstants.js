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
/** V1 출시 이벤트가(판매가) */
export const PAID_EVENT_MONTHLY_KRW = 9900;
export const PAID_EVENT_ANNUAL_KRW = 99000;
export const PAID_MONTHLY_DISCOUNTED_KRW = PAID_EVENT_MONTHLY_KRW;
export const PAID_ANNUAL_DISCOUNTED_KRW = PAID_EVENT_ANNUAL_KRW;
export function isB2bMembershipKind(raw) {
    return String(raw || "").toLowerCase() === "b2b";
}
export function isPaidMembershipKind(raw) {
    const k = String(raw || "free").toLowerCase();
    return k === "paid" || k === "standard" || k === "premium";
}
export function isBillableMembershipKind(raw) {
    return isPaidMembershipKind(raw) || isB2bMembershipKind(raw);
}
export function normalizeMembershipKind(raw) {
    const k = String(raw || "free").toLowerCase();
    if (isB2bMembershipKind(k))
        return "b2b";
    if (isPaidMembershipKind(k))
        return "paid";
    return "free";
}
export function paidListAmountKrw(cycle) {
    return cycle === "annual" ? PAID_LIST_PRICE_ANNUAL_KRW : PAID_LIST_PRICE_MONTHLY_KRW;
}
/** V1 청구액 — 출시 이벤트 판매가 */
export function paidChargeAmountKrw(cycle, _isDiscounted) {
    return cycle === "annual" ? PAID_EVENT_ANNUAL_KRW : PAID_EVENT_MONTHLY_KRW;
}
export const PERSONAL_COMBO_ADDON_MONTHLY_KRW = 5100;
export const PERSONAL_COMBO_ADDON_ANNUAL_KRW = 51000;
export function personalComboAddonAmountKrw(cycle) {
    return cycle === "annual" ? PERSONAL_COMBO_ADDON_ANNUAL_KRW : PERSONAL_COMBO_ADDON_MONTHLY_KRW;
}
