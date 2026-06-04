/** 수익 시뮬레이터 UI 상수 — 백엔드 revenueSimulatorEngine 과 동기 */

export const SIMULATOR_MAX = 100_000;

export const VAT_RATE = 0.1;

export const PRICING = {
  personalMonthly: 19_800,
  personalAnnual: 198_000,
  b2bLineMonthly: 14_700,
  b2bLineAnnual: 147_000,
  /** VAT 제외 공급가 (결제액 ÷ 1.1, 원 절사) */
  personalMonthlySupply: 18_000,
  personalAnnualSupply: 180_000,
  b2bLineMonthlySupply: 13_363,
  b2bLineAnnualSupply: 133_636
};

export const WITHHOLDING_RATE = 0.033;

export const TIER_RATES = {
  general: 0.05,
  professional: 0.1,
  master: 0.15
};

export const SIMULATOR_DISCLAIMER_CASH =
  "레퍼럴 커미션 · 정산 출금 (VAT 포함 결제액에서 부가세 10% 제외 공급가액 기준. 3.3% 원천징수 차감. 연 구독 2개월 무료 반영.)";
