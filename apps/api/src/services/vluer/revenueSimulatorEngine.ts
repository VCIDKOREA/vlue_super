import { floorWon, roundWon } from "../../lib/moneyKrw.js";
import type { VluerTierCode } from "./tierEngine.js";
import { gradeSpec } from "./tierPolicyConstants.js";
import {
  B2B_ANNUAL_PER_LINE_KRW,
  B2B_MONTHLY_PER_LINE_KRW,
  B2C_ANNUAL_PRICE_KRW,
  B2C_MONTHLY_PRICE_KRW,
  supplyValueKrw,
  type B2BBillingCycle
} from "./pricingConstants.js";

export { WITHHOLDING_TAX_RATE } from "@vlue/shared/settlement/constants";
import { WITHHOLDING_TAX_RATE } from "@vlue/shared/settlement/constants";
export const SIMULATOR_MAX_MEMBERS = 100_000;
import { ANNUAL_PAID_MONTHS } from "./pricingConstants.js";

export { ANNUAL_PAID_MONTHS };

export const SIMULATOR_RESULT_DISCLAIMER =
  "레퍼럴 커미션 · 정산 출금 (VAT 포함 결제액에서 부가세 10%를 제외한 공급가액 기준. 3.3% 원천징수 차감 후 금액. 연 구독 시 2개월 무료 반영.)";

export const SIMULATOR_POINTS_DISCLAIMER =
  "리워드 포인트 적립 (출금 불가). 공급가액(VAT 제외) × 티어율 기준. 연 구독 시 2개월 무료 반영.";

export type SimulatorBillingCycle = B2BBillingCycle;

export type RevenueSimulatorInput = {
  tierCode: VluerTierCode;
  billingCycle: SimulatorBillingCycle;
  /** 연간·월간 구독 개인 회원 수 */
  personalMemberCount: number;
  /** B2B 총 회선 수 */
  b2bLineCount: number;
};

export type RevenueSimulatorResult = {
  billingCycle: SimulatorBillingCycle;
  tierCode: VluerTierCode;
  tierRatePct: number;
  isRewardPoints: boolean;
  personalMemberCount: number;
  b2bLineCount: number;
  personalUnitKrw: number;
  b2bLineUnitKrw: number;
  personalGrossKrw: number;
  b2bGrossKrw: number;
  totalGrossKrw: number;
  totalSupplyKrw: number;
  personalSupplyUnitKrw: number;
  b2bLineSupplyUnitKrw: number;
  preTaxCommissionKrw: number;
  withholdingTaxKrw: number;
  afterTaxCommissionKrw: number;
  afterTaxPoints: number;
  displayAmountKrw: number;
  displayLabel: string;
  periodLabel: string;
  benefitSubtitle: string;
  disclaimer: string;
  formulaSummary: string;
};

function formatKrw(n: number) {
  return `${floorWon(n).toLocaleString("ko-KR")}원`;
}

function formatPoints(n: number) {
  return `${floorWon(n).toLocaleString("ko-KR")}P`;
}

/** 결제 주기별 1인(1회선)당 플랫폼 실결제액 — 연간은 10개월치(2개월 무료) */
export function unitPaymentKrw(cycle: SimulatorBillingCycle, kind: "personal" | "b2b_line"): number {
  if (kind === "personal") {
    return cycle === "annual" ? B2C_ANNUAL_PRICE_KRW : B2C_MONTHLY_PRICE_KRW;
  }
  return cycle === "annual" ? B2B_ANNUAL_PER_LINE_KRW : B2B_MONTHLY_PER_LINE_KRW;
}

/**
 * 세전 커미션 = (개인·회선 공급가액 합) × 티어%
 * 공급가액 = VAT 포함 결제액 ÷ 1.1 (원 절사)
 * SV/MV 세후 = 세전 × (1 - 0.033), VLUER는 포인트(세금 없음)
 */
export function runRevenueSimulation(input: RevenueSimulatorInput): RevenueSimulatorResult {
  const personal = Math.min(SIMULATOR_MAX_MEMBERS, Math.max(0, Math.floor(input.personalMemberCount)));
  const lines = Math.min(SIMULATOR_MAX_MEMBERS, Math.max(0, Math.floor(input.b2bLineCount)));
  const spec = gradeSpec(input.tierCode);
  const rate = spec.ratePct / 100;
  const isRewardPoints = spec.payoutMode === "reward_only";

  const personalUnit = unitPaymentKrw(input.billingCycle, "personal");
  const lineUnit = unitPaymentKrw(input.billingCycle, "b2b_line");
  const personalSupplyUnit = supplyValueKrw(personalUnit);
  const lineSupplyUnit = supplyValueKrw(lineUnit);

  const personalGross = floorWon(personal * personalUnit);
  const b2bGross = floorWon(lines * lineUnit);
  const totalGross = floorWon(personalGross + b2bGross);
  const totalSupply = floorWon(personal * personalSupplyUnit + lines * lineSupplyUnit);

  const preTaxCommission = floorWon(totalSupply * rate);

  let withholdingTaxKrw = 0;
  let afterTaxCommissionKrw = 0;
  let afterTaxPoints = 0;

  if (isRewardPoints) {
    afterTaxPoints = preTaxCommission;
  } else {
    const net = preTaxCommission * (1 - WITHHOLDING_TAX_RATE);
    /** 파트너 최종 지급액: 원천징수 후 반올림(정수 원) */
    afterTaxCommissionKrw = roundWon(net);
    withholdingTaxKrw = floorWon(preTaxCommission - afterTaxCommissionKrw);
  }

  const periodLabel = input.billingCycle === "annual" ? "연 예상 세후 수익" : "월 예상 세후 수익";
  const displayAmountKrw = isRewardPoints ? afterTaxPoints : afterTaxCommissionKrw;
  const displayLabel = isRewardPoints ? formatPoints(afterTaxPoints) : formatKrw(afterTaxCommissionKrw);

  const period = input.billingCycle === "annual" ? "연간" : "월간";
  const formulaSummary =
    `세전 ${period} = (${personal.toLocaleString("ko-KR")}명×${formatKrw(personalSupplyUnit)} + ${lines.toLocaleString("ko-KR")}회선×${formatKrw(lineSupplyUnit)}) 공급가×${spec.ratePct}% = ${formatKrw(preTaxCommission)}`;

  return {
    billingCycle: input.billingCycle,
    tierCode: input.tierCode,
    tierRatePct: spec.ratePct,
    isRewardPoints,
    personalMemberCount: personal,
    b2bLineCount: lines,
    personalUnitKrw: personalUnit,
    b2bLineUnitKrw: lineUnit,
    personalGrossKrw: personalGross,
    b2bGrossKrw: b2bGross,
    totalGrossKrw: totalGross,
    totalSupplyKrw: totalSupply,
    personalSupplyUnitKrw: personalSupplyUnit,
    b2bLineSupplyUnitKrw: lineSupplyUnit,
    preTaxCommissionKrw: preTaxCommission,
    withholdingTaxKrw,
    afterTaxCommissionKrw,
    afterTaxPoints,
    displayAmountKrw,
    displayLabel,
    periodLabel,
    benefitSubtitle: isRewardPoints ? "리워드 포인트 · 정산 출금 불가" : "레퍼럴 커미션 · 정산 출금",
    disclaimer: isRewardPoints ? SIMULATOR_POINTS_DISCLAIMER : SIMULATOR_RESULT_DISCLAIMER,
    formulaSummary
  };
}
