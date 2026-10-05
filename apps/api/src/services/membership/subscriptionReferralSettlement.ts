import { prisma } from "../../db/client.js";
import { referralDb } from "../../db/referralDb.js";
import { isUserB2bSettlementExcluded } from "../b2b/vluerEligibility.js";
import { resolveProfileGrade } from "../vluer/tierEngine.js";
import { recordCommissionLedger } from "../vluer/settlementEngine.js";
import type { CommissionLedgerKind } from "../vluer/settlementEngine.js";
import { quoteSubscriptionReferralCommission } from "../vluer/referralSettlementPolicy.js";
import { inferReferralChannelFromCode } from "@vlue/shared/referral";
import { isVluerPromoActiveGrade } from "../vluer/tierEngine.js";
import type { ReferralChannel } from "@vlue/shared/referral";
import type { VluerTierCode } from "../vluer/tierEngine.js";
import { countPaidDirectReferrals } from "../vluer/paidReferralCount.js";
import { billingCycleFromPlan } from "./subscriptionBilling.js";
import {
  advanceBenefitStateAfterPaid,
  getOrCreateBenefitState
} from "./memberReferralBenefitService.js";
import type { PaidBillingCycle } from "./membershipBmConstants.js";
import {
  EMPLOYEE_COMMISSION_RATE,
  EMPLOYEE_DOWNLINE_OVERRIDE_RATE,
  EXTERNAL_PARTNER_COMMISSION_RATE,
  EXTERNAL_PARTNER_PAYOUT_MONTHS,
  PARTNER_WITHHOLDING_TAX_RATE
} from "@vlue/shared";

function subscriptionLedgerRef(merchantUid: string) {
  return `sub:${merchantUid}`;
}

function ledgerKind(cycle: PaidBillingCycle): CommissionLedgerKind {
  return cycle === "annual" ? "subscription_annual" : "subscription_monthly";
}

function resolveAttributionChannel(referralCodeUsed: string | null): ReferralChannel {
  return inferReferralChannelFromCode(referralCodeUsed) ?? "promo";
}

/** 구독 결제 완료·갱신 시 추천인 정산 (멱등) */
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
    await advanceBenefitStateAfterPaid(input.payerUserId, cycle, referralCodeUsed);
    return { skipped: true as const, reason: "no_sponsor" as const };
  }

  const payerIsB2b = await isUserB2bSettlementExcluded(input.payerUserId);
  const vluerIsB2bBlocked = await isUserB2bSettlementExcluded(sponsorUserId);

  if (payerIsB2b || vluerIsB2bBlocked) {
    await advanceBenefitStateAfterPaid(input.payerUserId, cycle, referralCodeUsed);
    return {
      skipped: true as const,
      reason: "b2b_settlement_excluded" as const,
      commissionKrw: 0
    };
  }

  const benefitBefore = await getOrCreateBenefitState(input.payerUserId);
  const sponsorPenaltyActive = benefitBefore.sponsorPenaltyMonthsLeft > 0;

  const payer = await prisma.user.findUnique({
    where: { id: input.payerUserId },
    select: { isFirstJoin: true }
  });
  if (payer && payer.isFirstJoin === false) {
    await advanceBenefitStateAfterPaid(input.payerUserId, cycle, referralCodeUsed);
    return {
      skipped: true as const,
      reason: "rejoin_ci_no_commission" as const,
      commissionKrw: 0
    };
  }
  if (benefitBefore.isRejoinFromAbuseLog) {
    await advanceBenefitStateAfterPaid(input.payerUserId, cycle, referralCodeUsed);
    return {
      skipped: true as const,
      reason: "rejoin_abuse_no_commission" as const,
      commissionKrw: 0
    };
  }

  const profile = await prisma.userVluerProfile.findUnique({ where: { userId: sponsorUserId } });
  if (
    profile &&
    (profile.partnerStatus === "SUSPENDED" ||
      profile.partnerStatus === "TERMINATED" ||
      profile.rewardsFrozen ||
      !profile.isEligibleForVluerSettlement)
  ) {
    await advanceBenefitStateAfterPaid(input.payerUserId, cycle, referralCodeUsed);
    return {
      skipped: true as const,
      reason: "partner_not_eligible" as const,
      commissionKrw: 0
    };
  }
  const grade = profile ? resolveProfileGrade(profile) : "general";
  const tierCode = grade as VluerTierCode;
  const paidReferrals = await countPaidDirectReferrals(sponsorUserId);
  const attributionChannel = resolveAttributionChannel(referralCodeUsed);
  const sponsorVluerPromoActive = isVluerPromoActiveGrade(grade);

  const benefitAfterPay = await advanceBenefitStateAfterPaid(
    input.payerUserId,
    cycle,
    referralCodeUsed
  );

  const quote = quoteSubscriptionReferralCommission({
    attributionChannel,
    sponsorVluerPromoActive,
    benefitMonthIndex: benefitAfterPay.benefitMonthIndex,
    sponsorPenaltyActive,
    billingCycle: cycle,
    sponsorPaidReferralCount: paidReferrals
  });

  /**
   * 2026-10 정책: 정직원 10% / 외부 파트너 7%(유치일부터 12개월) — 결제금액 기준.
   * 개인 파트너 3.3% 원천징수. 레거시 quote 차단 사유는 유지.
   */
  let commissionKrw = quote.commissionKrw;
  let blockedReason = quote.blockedReason;
  let payoutMode = quote.payoutMode;
  let rateFraction = quote.rateFraction;

  if (!blockedReason && profile?.partnerType) {
    const partnerType = profile.partnerType as "EMPLOYEE" | "EXTERNAL_PARTNER";
    if (partnerType === "EXTERNAL_PARTNER") {
      const firstPaidAt = await prisma.subscriptionPayment.findFirst({
        where: { userId: input.payerUserId, status: "paid" },
        orderBy: { paidAt: "asc" },
        select: { paidAt: true, createdAt: true }
      });
      const start = firstPaidAt?.paidAt || firstPaidAt?.createdAt || new Date();
      const monthsSince =
        (Date.now() - new Date(start).getTime()) / (1000 * 60 * 60 * 24 * 30.4375);
      if (monthsSince > EXTERNAL_PARTNER_PAYOUT_MONTHS) {
        blockedReason = "external_partner_payout_window_expired";
        commissionKrw = 0;
      } else {
        rateFraction = EXTERNAL_PARTNER_COMMISSION_RATE;
        const preTax = Math.floor(input.grossPaymentKrw * rateFraction);
        commissionKrw = Math.floor(preTax * (1 - PARTNER_WITHHOLDING_TAX_RATE));
        payoutMode = "cash_commission";
      }
    } else if (partnerType === "EMPLOYEE") {
      if (profile.partnerStatus === "TERMINATED") {
        blockedReason = "employee_terminated";
        commissionKrw = 0;
      } else {
        rateFraction = EMPLOYEE_COMMISSION_RATE;
        commissionKrw = Math.floor(input.grossPaymentKrw * rateFraction);
        payoutMode = "cash_commission";
      }
    }
  }

  const result = {
    commissionKrw,
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

  /** 정직원 하부 파트너 관리 포상 3% */
  if (
    ledger &&
    commissionKrw > 0 &&
    !blockedReason &&
    profile?.partnerType === "EXTERNAL_PARTNER" &&
    profile.parentEmployeeUserId
  ) {
    try {
      const parent = await prisma.userVluerProfile.findUnique({
        where: { userId: profile.parentEmployeeUserId },
        select: {
          partnerType: true,
          partnerStatus: true,
          isEligibleForVluerSettlement: true
        }
      });
      if (
        parent?.partnerType === "EMPLOYEE" &&
        parent.partnerStatus === "ACTIVE" &&
        parent.isEligibleForVluerSettlement
      ) {
        const overrideKrw = Math.floor(
          input.grossPaymentKrw * EMPLOYEE_DOWNLINE_OVERRIDE_RATE
        );
        if (overrideKrw > 0) {
          await recordCommissionLedger({
            vluerUserId: profile.parentEmployeeUserId,
            payerUserId: input.payerUserId,
            kind: ledgerKind(cycle),
            grossPaymentKrw: input.grossPaymentKrw,
            referralCode: `${ref}:override3`,
            payerIsB2bMember: payerIsB2b,
            vluerIsB2bBlocked: false,
            result: {
              commissionKrw: overrideKrw,
              blockedReason: null,
              tierCode,
              payoutMode: "cash_commission",
              pgFeeKrw: 0
            }
          });
        }
      }
    } catch (e) {
      console.warn("[referral-settle] employee override 3% failed", e);
    }
  }

  /** 외부 파트너 월 유치 실적 — 수수료 발생(차단 아님) 시에만 +1 */
  if (ledger && commissionKrw > 0 && !blockedReason) {
    try {
      await prisma.userVluerProfile.updateMany({
        where: {
          userId: sponsorUserId,
          partnerType: "EXTERNAL_PARTNER",
          partnerStatus: "ACTIVE"
        },
        data: { monthlyActiveReferrals: { increment: 1 } }
      });
    } catch (e) {
      console.warn("[referral-settle] monthlyActiveReferrals increment failed", sponsorUserId, e);
    }
  }

  return {
    skipped: false as const,
    commissionKrw,
    tierCode,
    channel: quote.channel,
    phase: quote.phase,
    blockedReason,
    ledgerId: ledger?.id ?? null,
    benefitMonthIndex: benefitAfterPay.benefitMonthIndex,
    rateFraction
  };
}
