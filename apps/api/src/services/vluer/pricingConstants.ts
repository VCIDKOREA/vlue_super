import { floorTo100Won, floorWon } from "../../lib/moneyKrw.js";

/** 부가세율 — 결제액(VAT 포함)에서 공급가액 산출 시 사용 */
export const VAT_RATE = 0.1;

/** 플랫폼 공식 프리미엄 정가 (VAT 포함) */
export const PREMIUM_LIST_PRICE_KRW = 28_300;

/**
 * VAT 포함 결제액 → 공급가액(부가세 제외, 원 절사)
 * 예: 19,800원 → 18,000원
 */
export function supplyValueKrw(vatInclusiveKrw: number): number {
  return floorWon(vatInclusiveKrw / (1 + VAT_RATE));
}

/**
 * 레퍼럴·리워드 산정 기준액 = 공급가액 × 티어율(bp)
 * grossPaymentKrw 는 VAT 포함 최종 결제액
 */
export function referralCommissionKrw(vatInclusivePaymentKrw: number, rateBp: number): number {
  const supply = supplyValueKrw(vatInclusivePaymentKrw);
  return floorWon((supply * rateBp) / 10_000);
}

export { ANNUAL_PAID_MONTHS } from "@vlue/shared/settlement/constants";
import { ANNUAL_PAID_MONTHS } from "@vlue/shared/settlement/constants";

/** B2C 추천코드 30% 할인 후 10원→100원 단위 절사 → 월 19,800원 */
export const B2C_MONTHLY_PRICE_KRW = floorTo100Won(PREMIUM_LIST_PRICE_KRW * 0.7);

/** 연간: 2달 무료(10개월치) = 198,000원 */
export const B2C_ANNUAL_PRICE_KRW = B2C_MONTHLY_PRICE_KRW * ANNUAL_PAID_MONTHS;

export const B2C_PG_FEE_MONTHLY_KRW = 594;
export const B2C_PG_FEE_ANNUAL_KRW = 5_940;

/** B2B 단체 특가 (회선당, VAT 포함) — 수익 시뮬레이터·10회선 147,000원/월 기준 */
export const B2B_MONTHLY_PER_LINE_KRW = 14_700;
/** 임직원 개인 콤보 추가금 (회사 14,700 + 개인 5,100 = 유료 19,800) */
export const PERSONAL_COMBO_ADDON_MONTHLY_KRW = 5_100;
export const PERSONAL_COMBO_ADDON_ANNUAL_KRW = 51_000;
/** 연간: 월 14,700 × 10개월(2개월 무료) */
export const B2B_ANNUAL_PER_LINE_KRW = B2B_MONTHLY_PER_LINE_KRW * ANNUAL_PAID_MONTHS;

export const B2B_MIN_LINES = 10;

export type B2BBillingCycle = "monthly" | "annual";
export type B2CPlanKind = "monthly" | "annual";

export type B2bBillingOptions = {
  /** 추천인 있으면 전 회선 B2B 단가(14,700원). 없으면 대표 정가(28,300원)+하부 14,700원 */
  hasReferral?: boolean;
};

/** 대표(VLUE 인증) 회선 단가 */
export function b2bMasterUnitKrw(cycle: B2BBillingCycle, hasReferral: boolean): number {
  if (hasReferral) {
    return cycle === "annual" ? B2B_ANNUAL_PER_LINE_KRW : B2B_MONTHLY_PER_LINE_KRW;
  }
  return cycle === "annual" ? PREMIUM_LIST_PRICE_KRW * ANNUAL_PAID_MONTHS : PREMIUM_LIST_PRICE_KRW;
}

/** 하부(직원) 회선 단가 — 추천인 여부와 무관 */
export function b2bSubordinateUnitKrw(cycle: B2BBillingCycle): number {
  return cycle === "annual" ? B2B_ANNUAL_PER_LINE_KRW : B2B_MONTHLY_PER_LINE_KRW;
}

/**
 * B2B 청구 합계
 * @param totalLinesIncludingMaster VLUE 대표 1 + 직원 회선 (가입 plannedLineCount)
 */
export function b2bEnterpriseTotalKrw(
  totalLinesIncludingMaster: number,
  cycle: B2BBillingCycle,
  opts: B2bBillingOptions = {}
): number {
  const n = Math.max(0, totalLinesIncludingMaster);
  if (n === 0) return 0;
  const hasReferral = Boolean(opts.hasReferral);
  if (hasReferral) {
    const unit = cycle === "annual" ? B2B_ANNUAL_PER_LINE_KRW : B2B_MONTHLY_PER_LINE_KRW;
    return floorWon(n * unit);
  }
  const master = b2bMasterUnitKrw(cycle, false);
  const subs = Math.max(0, n - 1);
  const subUnit = b2bSubordinateUnitKrw(cycle);
  return floorWon(master + subs * subUnit);
}

/** @deprecated 호환 — 추천인 없을 때는 b2bEnterpriseTotalKrw 사용 권장 */
export function b2bLineTotalKrw(
  lineCount: number,
  cycle: B2BBillingCycle,
  opts: B2bBillingOptions = {}
): number {
  return b2bEnterpriseTotalKrw(lineCount, cycle, opts);
}

export function b2cPlanPriceKrw(plan: B2CPlanKind): number {
  return plan === "annual" ? B2C_ANNUAL_PRICE_KRW : B2C_MONTHLY_PRICE_KRW;
}

export function b2cPgFeeKrw(plan: B2CPlanKind): number {
  return plan === "annual" ? B2C_PG_FEE_ANNUAL_KRW : B2C_PG_FEE_MONTHLY_KRW;
}

/** 쇼핑 PG 수수료 3.5% (결제액 VAT 포함 기준) */
export const COMMERCE_PG_FEE_BP = 350;

/** 플랫폼 판매수수료 3.3% (정산 참고용) */
export const COMMERCE_PLATFORM_SALES_FEE_BP = 330;

/**
 * 쇼핑 VLUER 쉐어 — 결제액(VAT 포함) × shareBp
 * 인증 0.3% (30bp), 파트너 0.8% (80bp)
 */
export function commerceVluerShareKrw(vatInclusivePaymentKrw: number, shareBp: number): number {
  return floorWon((vatInclusivePaymentKrw * shareBp) / 10_000);
}

export function commercePgFeeKrw(vatInclusivePaymentKrw: number): number {
  return floorWon((vatInclusivePaymentKrw * COMMERCE_PG_FEE_BP) / 10_000);
}
