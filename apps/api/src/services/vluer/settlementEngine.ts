import { prisma } from "../../db/client.js";
import { resolveProfileGrade, type VluerTierCode } from "./tierEngine.js";
import { commerceVluerShareBp, gradeSpec } from "./tierPolicyConstants.js";

export type CommissionLedgerKind =
  | "subscription_monthly"
  | "subscription_annual"
  | "commerce";
import { floorWon } from "../../lib/moneyKrw.js";
import {
  b2cPgFeeKrw,
  commercePgFeeKrw,
  commerceVluerShareKrw,
  type B2CPlanKind
} from "./pricingConstants.js";
import { getTierPolicy } from "./tierEngine.js";
import { countPaidDirectReferrals } from "./paidReferralCount.js";
import { getActivePenaltyForPayer, platformRetainedCommissionResult } from "./referralLockEngine.js";
import { getOrCreateBenefitState } from "../membership/memberReferralBenefitService.js";
import { quoteSubscriptionReferralCommission } from "./referralSettlementPolicy.js";
import { SLIDING_RENEWAL_MONTHLY_KRW } from "../membership/membershipBmConstants.js";

export type SettlementInput = {
  vluerUserId: string;
  payerUserId: string | null;
  kind: CommissionLedgerKind;
  /** B2C 최종 결제액(VAT 포함). commerce 시 쇼핑 총액 */
  grossPaymentKrw: number;
  referralCode?: string;
  /** B2B 결제·유치 건이면 무조건 0 */
  payerIsB2bMember?: boolean;
  vluerIsB2bBlocked?: boolean;
};

export type SettlementResult = {
  commissionKrw: number;
  blockedReason: string | null;
  tierCode: VluerTierCode;
  payoutMode: "reward_only" | "cash_commission";
  pgFeeKrw: number;
  platformRetainedKrw?: number;
};

/**
 * B2B·기업 귀속 직원: 정산 0 · 레코드 생성 안 함 권장
 * 일반 VLUER: 쇼핑 0% · 인증 0.3% · 파트너 0.8% (결제액 기준, PG 3.5% 별도)
 */
export async function calculateVluerCommission(input: SettlementInput): Promise<SettlementResult> {
  const {
    vluerUserId,
    payerUserId,
    kind,
    grossPaymentKrw,
    payerIsB2bMember = false,
    vluerIsB2bBlocked = false
  } = input;

  const blockedReason =
    payerIsB2bMember || vluerIsB2bBlocked
      ? "b2b_settlement_excluded"
      : null;

  if (blockedReason) {
    return {
      commissionKrw: 0,
      blockedReason,
      tierCode: "general",
      payoutMode: "reward_only",
      pgFeeKrw: 0
    };
  }

  if (payerUserId) {
    const benefit = await prisma.memberReferralBenefitState.findUnique({
      where: { userId: payerUserId }
    });
    if (benefit && benefit.sponsorPenaltyMonthsLeft > 0) {
      const profile = await prisma.userVluerProfile.findUnique({ where: { userId: vluerUserId } });
      return {
        commissionKrw: 0,
        blockedReason: "rejoin_abuse_penalty",
        tierCode: (profile?.tierCode ?? "general") as VluerTierCode,
        payoutMode: "cash_commission" as const,
        pgFeeKrw: 0
      };
    }

    const penalty = await getActivePenaltyForPayer(payerUserId);
    if (penalty) {
      const profile = await prisma.userVluerProfile.findUnique({ where: { userId: vluerUserId } });
      const retained = platformRetainedCommissionResult(grossPaymentKrw);
      return {
        ...retained,
        tierCode: profile?.tierCode ?? "general",
        payoutMode: "cash_commission" as const
      };
    }
  }

  const profile = await prisma.userVluerProfile.findUnique({ where: { userId: vluerUserId } });
  const grade = profile ? resolveProfileGrade(profile) : "general";
  const tierCode = grade as VluerTierCode;
  const paidReferrals = profile ? await countPaidDirectReferrals(vluerUserId) : 0;

  if (gradeSpec(grade).settlementExcluded) {
    return {
      commissionKrw: 0,
      blockedReason: "official_grade_b2b_only",
      tierCode,
      payoutMode: "cash_commission" as const,
      pgFeeKrw: 0
    };
  }

  if (paidReferrals < 1) {
    return {
      commissionKrw: 0,
      blockedReason: "no_b2c_referrals",
      tierCode,
      payoutMode: "reward_only",
      pgFeeKrw: 0
    };
  }

  const policy = await getTierPolicy(tierCode);
  if (!policy) {
    return {
      commissionKrw: 0,
      blockedReason: "tier_policy_missing",
      tierCode,
      payoutMode: "reward_only",
      pgFeeKrw: 0
    };
  }

  if (kind === "commerce") {
    const shareBp = commerceVluerShareBp(grade);
    if (shareBp <= 0) {
      return {
        commissionKrw: 0,
        blockedReason: "tier1_commerce_excluded",
        tierCode,
        payoutMode: policy.payoutMode,
        pgFeeKrw: 0
      };
    }
    const commissionKrw = commerceVluerShareKrw(grossPaymentKrw, shareBp);
    const pgFeeKrw = commercePgFeeKrw(grossPaymentKrw);
    return {
      commissionKrw,
      blockedReason: null,
      tierCode,
      payoutMode: policy.payoutMode,
      pgFeeKrw
    };
  }

  const cycle = kind === "subscription_annual" ? "annual" : "monthly";
  let benefitMonthIndex = grossPaymentKrw >= SLIDING_RENEWAL_MONTHLY_KRW ? 13 : 1;
  let sponsorPenaltyActive = false;
  if (payerUserId) {
    const state = await getOrCreateBenefitState(payerUserId);
    benefitMonthIndex = state.accumulatedBenefitMonths + 1;
    sponsorPenaltyActive = state.sponsorPenaltyMonthsLeft > 0;
  }

  const quote = quoteSubscriptionReferralCommission({
    sponsorGrade: grade,
    benefitMonthIndex,
    sponsorPenaltyActive,
    billingCycle: cycle
  });

  const pgFeeKrw = b2cPgFeeKrw(cycle === "annual" ? "annual" : "monthly");

  return {
    commissionKrw: quote.commissionKrw,
    blockedReason: quote.blockedReason,
    tierCode,
    payoutMode: policy.payoutMode,
    pgFeeKrw
  };
}

export async function recordCommissionLedger(
  input: SettlementInput & { result: SettlementResult }
) {
  if (input.result.blockedReason && input.result.commissionKrw === 0) {
    return null;
  }
  if (input.result.commissionKrw <= 0 && input.result.blockedReason) {
    return null;
  }

  if (input.result.blockedReason === "platform_retained_revenue") {
    return prisma.commissionLedger.create({
      data: {
        vluerUserId: input.vluerUserId,
        payerUserId: input.payerUserId,
        kind: input.kind,
        tierCode: input.result.tierCode,
        payoutMode: input.result.payoutMode,
        grossPaymentKrw: floorWon(input.grossPaymentKrw),
        pgFeeKrw: 0,
        commissionKrw: 0,
        blockedReason: "platform_retained_revenue",
        referralCode: input.referralCode ?? null
      }
    });
  }

  return prisma.commissionLedger.create({
    data: {
      vluerUserId: input.vluerUserId,
      payerUserId: input.payerUserId,
      kind: input.kind,
      tierCode: input.result.tierCode,
      payoutMode: input.result.payoutMode,
      grossPaymentKrw: floorWon(input.grossPaymentKrw),
      pgFeeKrw: input.result.pgFeeKrw,
      commissionKrw: input.result.commissionKrw,
      blockedReason: input.result.blockedReason,
      referralCode: input.referralCode ?? null
    }
  });
}

/** B2C 구독 결제 시 스펙 검증용 — 공급가액(VAT 제외) × 티어율 */
export function expectedSubscriptionCommissionKrw(
  tierCode: VluerTierCode,
  plan: B2CPlanKind,
  opts: { benefitMonthIndex?: number } = {}
): number {
  const grade =
    tierCode === "certified" || tierCode === "partner" || tierCode === "official"
      ? tierCode
      : "general";
  const quote = quoteSubscriptionReferralCommission({
    sponsorGrade: grade,
    benefitMonthIndex: opts.benefitMonthIndex ?? 1,
    sponsorPenaltyActive: false,
    billingCycle: plan === "annual" ? "annual" : "monthly"
  });
  return quote.commissionKrw;
}
