import { prisma } from "../../db/client.js";
import { referralDb } from "../../db/referralDb.js";
import { isUserB2bSettlementExcluded } from "../b2b/vluerEligibility.js";
import { resolveProfileGrade } from "../vluer/tierEngine.js";
import { recordCommissionLedger } from "../vluer/settlementEngine.js";
import type { CommissionLedgerKind } from "../vluer/settlementEngine.js";
import { quoteSubscriptionReferralCommission } from "../vluer/referralSettlementPolicy.js";
import { gradeSpec } from "../vluer/tierPolicyConstants.js";
import type { VluerTierCode } from "../vluer/tierEngine.js";
import { countPaidDirectReferrals } from "../vluer/paidReferralCount.js";
import { billingCycleFromPlan } from "./subscriptionBilling.js";
import {
  advanceBenefitStateAfterPaid,
  getOrCreateBenefitState
} from "./memberReferralBenefitService.js";
import type { PaidBillingCycle } from "./membershipBmConstants.js";

function subscriptionLedgerRef(merchantUid: string) {
  return `sub:${merchantUid}`;
}

function ledgerKind(cycle: PaidBillingCycle): CommissionLedgerKind {
  return cycle === "annual" ? "subscription_annual" : "subscription_monthly";
}

/** 구독 결제 완료·갱신 시 VLUER 레퍼럴 정산 (멱등) */
export async function settleSubscriptionReferralCommission(input: {
  payerUserId: string;
  subscriptionId: string;
  merchantUid: string;
  grossPaymentKrw: number;
  plan: string;
}) {
  const ref = subscriptionLedgerRef(input.merchantUid);
  const existing = await prisma.commissionLedger.findFirst({
    where: { referralCode: ref },
    select: { id: true }
  });
  if (existing) {
    return { skipped: true as const, reason: "already_settled" as const };
  }

  const cycle = billingCycleFromPlan(input.plan);
  const sub = await prisma.userSubscription.findUnique({
    where: { id: input.subscriptionId },
    select: {
      sponsorVluerUserId: true,
      referralCodeUsed: true,
      isDiscounted: true
    }
  });

  let sponsorUserId = sub?.sponsorVluerUserId ?? null;
  let referralCodeUsed = sub?.referralCodeUsed ?? null;

  if (!sponsorUserId) {
    try {
      const attr = await referralDb.referralAttribution.findUnique({
        where: { userId: input.payerUserId },
        select: { sponsorVluerUserId: true, referralCodeUsed: true }
      });
      sponsorUserId = attr?.sponsorVluerUserId ?? null;
      referralCodeUsed = attr?.referralCodeUsed ?? referralCodeUsed;
    } catch {
      return { skipped: true as const, reason: "referral_db_unavailable" as const };
    }
  }

  if (!sponsorUserId) {
    await advanceBenefitStateAfterPaid(input.payerUserId, cycle);
    return { skipped: true as const, reason: "no_sponsor" as const };
  }

  const payerIsB2b = await isUserB2bSettlementExcluded(input.payerUserId);
  const vluerIsB2bBlocked = await isUserB2bSettlementExcluded(sponsorUserId);

  if (payerIsB2b || vluerIsB2bBlocked) {
    await advanceBenefitStateAfterPaid(input.payerUserId, cycle);
    return {
      skipped: true as const,
      reason: "b2b_settlement_excluded" as const,
      commissionKrw: 0
    };
  }

  const benefitBefore = await getOrCreateBenefitState(input.payerUserId);
  const sponsorPenaltyActive = benefitBefore.sponsorPenaltyMonthsLeft > 0;

  const profile = await prisma.userVluerProfile.findUnique({ where: { userId: sponsorUserId } });
  const grade = profile ? resolveProfileGrade(profile) : "general";
  const tierCode = grade as VluerTierCode;
  const paidReferrals = profile ? await countPaidDirectReferrals(sponsorUserId) : 0;

  if (paidReferrals < 1) {
    await advanceBenefitStateAfterPaid(input.payerUserId, cycle);
    return { skipped: true as const, reason: "no_b2c_referrals" as const, commissionKrw: 0 };
  }

  const benefitAfterPay = await advanceBenefitStateAfterPaid(input.payerUserId, cycle);
  const quote = quoteSubscriptionReferralCommission({
    sponsorGrade: grade,
    benefitMonthIndex: benefitAfterPay.benefitMonthIndex,
    sponsorPenaltyActive,
    billingCycle: cycle
  });

  const spec = gradeSpec(grade);
  const payoutMode = spec.payoutMode;
  const blockedReason = quote.blockedReason;

  const result = {
    commissionKrw: quote.commissionKrw,
    blockedReason,
    tierCode,
    payoutMode,
    pgFeeKrw: 0
  };

  const ledger = await recordCommissionLedger({
    vluerUserId: sponsorUserId,
    payerUserId: input.payerUserId,
    kind: ledgerKind(cycle),
    grossPaymentKrw: input.grossPaymentKrw,
    referralCode: ref,
    payerIsB2bMember: payerIsB2b,
    vluerIsB2bBlocked,
    result
  });

  return {
    skipped: false as const,
    commissionKrw: quote.commissionKrw,
    tierCode,
    phase: quote.phase,
    blockedReason,
    ledgerId: ledger?.id ?? null,
    benefitMonthIndex: benefitAfterPay.benefitMonthIndex
  };
}
