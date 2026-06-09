import { floorTo100Won, floorWon } from "../../lib/moneyKrw.js";
import {
  getPricingConfigSync,
  pricingNumbersFromConfig
} from "../pricing/pricingConfigService.js";

/** 부가세율 — 결제액(VAT 포함)에서 공급가액 산출 시 사용 */
export const VAT_RATE = 0.1;

function nums() {
  return pricingNumbersFromConfig(getPricingConfigSync());
}

/** 플랫폼 공식 프리미엄 정가 (VAT 포함) */
export function premiumListPriceKrw(): number {
  return nums().PREMIUM_LIST_PRICE_KRW;
}

/** @deprecated — 런타임 config 연동. 신규 코드는 premiumListPriceKrw() 사용 */
export const PREMIUM_LIST_PRICE_KRW = 28_300;

/**
 * VAT 포함 결제액 → 공급가액(부가세 제외, 원 절사)
 */
export function supplyValueKrw(vatInclusiveKrw: number): number {
  return floorWon(vatInclusiveKrw / (1 + VAT_RATE));
}

export function referralCommissionKrw(vatInclusivePaymentKrw: number, rateBp: number): number {
  const supply = supplyValueKrw(vatInclusivePaymentKrw);
  return floorWon((supply * rateBp) / 10_000);
}

export { ANNUAL_PAID_MONTHS } from "@vlue/shared/settlement/constants";
import { ANNUAL_PAID_MONTHS } from "@vlue/shared/settlement/constants";

/** SOHO 활동형(Primary) 월 요금 — config 기준 */
export function b2cMonthlyPriceKrw(): number {
  return nums().B2C_MONTHLY_PRICE_KRW;
}

export function b2cAnnualPriceKrw(): number {
  return nums().SOHO_ACTIVITY_ANNUAL_KRW;
}

/** @deprecated */
export const B2C_MONTHLY_PRICE_KRW = floorTo100Won(PREMIUM_LIST_PRICE_KRW * 0.7);
export const B2C_ANNUAL_PRICE_KRW = B2C_MONTHLY_PRICE_KRW * ANNUAL_PAID_MONTHS;

export const B2C_PG_FEE_MONTHLY_KRW = 594;
export const B2C_PG_FEE_ANNUAL_KRW = 5_940;

export function b2bMonthlyPerLineKrw(): number {
  return nums().B2B_MONTHLY_PER_LINE_KRW;
}

export function b2bAnnualPerLineKrw(): number {
  return nums().B2B_ANNUAL_PER_LINE_KRW;
}

export function personalComboAddonMonthlyKrw(): number {
  return nums().PERSONAL_COMBO_ADDON_MONTHLY_KRW;
}

/** @deprecated — config 연동 함수 사용 권장 */
export const B2B_MONTHLY_PER_LINE_KRW = 14_700;
export const PERSONAL_COMBO_ADDON_MONTHLY_KRW = 5_100;
export const PERSONAL_COMBO_ADDON_ANNUAL_KRW = 51_000;
export const B2B_ANNUAL_PER_LINE_KRW = B2B_MONTHLY_PER_LINE_KRW * ANNUAL_PAID_MONTHS;

export function sohoBroadcastMonthlyKrw(): number {
  return nums().SOHO_BROADCAST_MONTHLY_KRW;
}

export function sohoBroadcastAnnualKrw(): number {
  return nums().SOHO_BROADCAST_ANNUAL_KRW;
}

export const B2B_MIN_LINES = 10;

export type B2BBillingCycle = "monthly" | "annual";
export type B2CPlanKind = "monthly" | "annual";

export type B2bBillingOptions = {
  hasReferral?: boolean;
};

export function b2bMasterUnitKrw(cycle: B2BBillingCycle, hasReferral: boolean): number {
  if (hasReferral) {
    return cycle === "annual" ? b2bAnnualPerLineKrw() : b2bMonthlyPerLineKrw();
  }
  return cycle === "annual" ? premiumListPriceKrw() * ANNUAL_PAID_MONTHS : premiumListPriceKrw();
}

export function b2bSubordinateUnitKrw(cycle: B2BBillingCycle): number {
  return cycle === "annual" ? b2bAnnualPerLineKrw() : b2bMonthlyPerLineKrw();
}

export function b2bEnterpriseTotalKrw(
  totalLinesIncludingMaster: number,
  cycle: B2BBillingCycle,
  opts: B2bBillingOptions = {}
): number {
  const n = Math.max(0, totalLinesIncludingMaster);
  if (n === 0) return 0;
  const hasReferral = Boolean(opts.hasReferral);
  if (hasReferral) {
    const unit = cycle === "annual" ? b2bAnnualPerLineKrw() : b2bMonthlyPerLineKrw();
    return floorWon(n * unit);
  }
  const master = b2bMasterUnitKrw(cycle, false);
  const subs = Math.max(0, n - 1);
  const subUnit = b2bSubordinateUnitKrw(cycle);
  return floorWon(master + subs * subUnit);
}

export function b2bLineTotalKrw(
  lineCount: number,
  cycle: B2BBillingCycle,
  opts: B2bBillingOptions = {}
): number {
  return b2bEnterpriseTotalKrw(lineCount, cycle, opts);
}

export function b2cPlanPriceKrw(plan: B2CPlanKind): number {
  return plan === "annual" ? b2cAnnualPriceKrw() : b2cMonthlyPriceKrw();
}

export function b2cPgFeeKrw(plan: B2CPlanKind): number {
  return plan === "annual" ? B2C_PG_FEE_ANNUAL_KRW : B2C_PG_FEE_MONTHLY_KRW;
}

export const COMMERCE_PG_FEE_BP = 350;
export const COMMERCE_PLATFORM_SALES_FEE_BP = 330;

export function commerceVluerShareKrw(vatInclusivePaymentKrw: number, shareBp: number): number {
  return floorWon((vatInclusivePaymentKrw * shareBp) / 10_000);
}

export function commercePgFeeKrw(vatInclusivePaymentKrw: number): number {
  return floorWon((vatInclusivePaymentKrw * COMMERCE_PG_FEE_BP) / 10_000);
}
