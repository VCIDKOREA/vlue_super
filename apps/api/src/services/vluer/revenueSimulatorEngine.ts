import { floorWon, roundWon } from "../../lib/moneyKrw.js";
import {
  FRIEND_SPONSOR_RATE_MONTHS_1_12,
  PROMO_SPONSOR_RATE_MONTHS_1_12,
  PROMO_SPONSOR_RATE_MONTHS_13_PLUS,
  type ReferralChannel
} from "@vlue/shared/referral";
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
  "홍보 추천 캐시 · 정산 출금 (VAT 포함 결제액에서 부가세 10%를 제외한 공급가액 기준. 3.3% 원천징수 차감 후 금액. 연 구독 시 2개월 무료 반영.)";

export const SIMULATOR_POINTS_DISCLAIMER =
  "지인 추천 포인트 적립 (출금 불가). 2번째 유료 추천부터 1~12개월 10% 포인트. 공급가액(VAT 제외) 기준. 연 구독 시 2개월 무료 반영.";

export type SimulatorBillingCycle = B2BBillingCycle;

export type ReferralBenefitPhase = "months_1_12" | "months_13_plus";

export type RevenueSimulatorInput = {
  referralChannel: ReferralChannel;
  benefitPhase?: ReferralBenefitPhase;
  billingCycle: SimulatorBillingCycle;
  /** 연간·월간 구독 개인 회원 수 */
  personalMemberCount: number;
  /** B2B 총 회선 수 */
  b2bLineCount: number;
};

export type RevenueSimulatorResult = {
  billingCycle: SimulatorBillingCycle;
  referralChannel: ReferralChannel;
  channelRatePct: number;
  benefitPhase: ReferralBenefitPhase;
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

function channelRate(channel: ReferralChannel, phase: ReferralBenefitPhase): number {
  if (channel === "friend") return FRIEND_SPONSOR_RATE_MONTHS_1_12;
  return phase === "months_13_plus"
    ? PROMO_SPONSOR_RATE_MONTHS_13_PLUS
    : PROMO_SPONSOR_RATE_MONTHS_1_12;
}

/** 결제 주기별 1인(1회선)당 플랫폼 실결제액 — 연간은 10개월치(2개월 무료) */
export function unitPaymentKrw(cycle: SimulatorBillingCycle, kind: "personal" | "b2b_line"): number {
  if (kind === "personal") {
    return cycle === "annual" ? B2C_ANNUAL_PRICE_KRW : B2C_MONTHLY_PRICE_KRW;
  }
  return cycle === "annual" ? B2B_ANNUAL_PER_LINE_KRW : B2B_MONTHLY_PER_LINE_KRW;
}

export function runRevenueSimulation(input: RevenueSimulatorInput): RevenueSimulatorResult {
  const personal = Math.min(SIMULATOR_MAX_MEMBERS, Math.max(0, Math.floor(input.personalMemberCount)));
  const lines = Math.min(SIMULATOR_MAX_MEMBERS, Math.max(0, Math.floor(input.b2bLineCount)));
  const phase = input.benefitPhase ?? "months_1_12";
  const channel = input.referralChannel;
  const rate = channelRate(channel, phase);
  const isRewardPoints = channel === "friend";
  const channelRatePct = Math.round(rate * 1000) / 10;

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
    afterTaxCommissionKrw = roundWon(net);
    withholdingTaxKrw = floorWon(preTaxCommission - afterTaxCommissionKrw);
  }

  const periodLabel = input.billingCycle === "annual" ? "연 예상 세후 수익" : "월 예상 세후 수익";
  const displayAmountKrw = isRewardPoints ? afterTaxPoints : afterTaxCommissionKrw;
  const displayLabel = isRewardPoints ? formatPoints(afterTaxPoints) : formatKrw(afterTaxCommissionKrw);

  const period = input.billingCycle === "annual" ? "연간" : "월간";
  const formulaSummary =
    `세전 ${period} = (${personal.toLocaleString("ko-KR")}명×${formatKrw(personalSupplyUnit)} + ${lines.toLocaleString("ko-KR")}회선×${formatKrw(lineSupplyUnit)}) 공급가×${channelRatePct}% = ${formatKrw(preTaxCommission)}`;

  const benefitSubtitle = isRewardPoints
    ? "지인 추천 포인트 · 출금 불가 (2번째 유료 추천부터)"
    : phase === "months_13_plus"
      ? "홍보 추천 캐시 5% · 정산 출금"
      : "홍보 추천 캐시 15% · 정산 출금";

  return {
    billingCycle: input.billingCycle,
    referralChannel: channel,
    channelRatePct,
    benefitPhase: phase,
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
    benefitSubtitle,
    disclaimer: isRewardPoints ? SIMULATOR_POINTS_DISCLAIMER : SIMULATOR_RESULT_DISCLAIMER,
    formulaSummary
  };
}
