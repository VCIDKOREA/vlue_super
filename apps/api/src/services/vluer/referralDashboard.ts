import { prisma } from "../../db/client.js";
import { referralDb } from "../../db/referralDb.js";
import { floorWon } from "../../lib/moneyKrw.js";
import { TIER_DISPLAY } from "./tierLabels.js";
import type { VluerTierCode } from "@prisma/client";
import type { VluerGrade } from "./vluerGradeTypes.js";
import { resolveProfileGrade, countAcquiredEnterprises, countDownlineUsers, syncUserVluerTier } from "./tierEngine.js";
import { buildVluerUpgradeEligibility } from "./vluerUpgradeEngine.js";
import {
  b2bLineTotalKrw,
  b2cPlanPriceKrw,
  B2B_MIN_LINES,
  PREMIUM_LIST_PRICE_KRW,
  supplyValueKrw
} from "./pricingConstants.js";
import {
  FRIEND_SPONSOR_RATE_MONTHS_1_12,
  PROMO_SPONSOR_RATE_MONTHS_1_12,
  type ReferralChannel
} from "@vlue/shared/referral";
import { totalMemberCount } from "./tierPolicyConstants.js";
import { isVluerPromoActiveGrade } from "./tierEngine.js";

function formatKrw(n: number) {
  return `${floorWon(n).toLocaleString("ko-KR")}원`;
}

function formatPoints(n: number) {
  return `${floorWon(n).toLocaleString("ko-KR")}P`;
}

/** 월 환산 — 지인 추천 10% 포인트 · 홍보 VLUER 15% 캐시 */
function estimateMonthlyBenefit(
  tierCode: VluerGrade,
  downlineUsers: number,
  enterprises: number
): { amount: number; label: string; isPoints: boolean; channel: ReferralChannel } {
  const promoActive = isVluerPromoActiveGrade(tierCode);
  const channel: ReferralChannel = promoActive ? "promo" : "friend";
  const rate = promoActive ? PROMO_SPONSOR_RATE_MONTHS_1_12 : FRIEND_SPONSOR_RATE_MONTHS_1_12;
  const b2cMonthly = b2cPlanPriceKrw("monthly");
  const entPaymentPerEnterprise = b2bLineTotalKrw(B2B_MIN_LINES, "monthly");
  const userRev = downlineUsers * floorWon(supplyValueKrw(b2cMonthly) * rate);
  const entRev = enterprises * floorWon(supplyValueKrw(entPaymentPerEnterprise) * rate);
  const amount = floorWon(userRev + entRev);
  const isPoints = !promoActive;
  return {
    amount,
    label: isPoints ? formatPoints(amount) : formatKrw(amount),
    isPoints,
    channel
  };
}

export async function buildVluerDashboard(userId: string) {
  const synced = await syncUserVluerTier(userId);
  const tierCode = resolveProfileGrade(synced);
  const display = TIER_DISPLAY[tierCode];
  let upgradeEligibility;
  try {
    upgradeEligibility = await buildVluerUpgradeEligibility(userId);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const soft =
      msg.includes("does not exist") ||
      msg.includes("Invalid `prisma") ||
      msg.includes("Cannot read properties of undefined");
    if (!soft) throw err;
    upgradeEligibility = {
      currentGrade: tierCode,
      currentGradeLabel: display.label,
      paidReferralCount: 0,
      certified: { available: false, reason: null },
      partner: { available: false, reason: null },
      priceChangeNotice: "",
      certifiedRewardNotice: "",
      partnerRewardNotice: ""
    };
  }

  const downlineUsers = await countDownlineUsers(userId);
  const enterprises = await countAcquiredEnterprises(userId);
  const totalMembers = totalMemberCount(downlineUsers, enterprises);
  const monthly = estimateMonthlyBenefit(tierCode, downlineUsers, enterprises);
  const promoActive = isVluerPromoActiveGrade(tierCode);

  let pendingChurn = 0;
  let activePenalties = 0;
  try {
    pendingChurn = await referralDb.vluerCodeChangeRequest.count({
      where: { currentSponsorUserId: userId, status: "pending" }
    });
    activePenalties = await referralDb.vluerReferralPenalty.count({
      where: {
        sponsorUserId: userId,
        isActive: true,
        endsAt: { gt: new Date() }
      }
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const soft =
      msg.includes("does not exist") ||
      msg.includes("Invalid `prisma") ||
      msg.includes("Cannot read properties of undefined") ||
      msg.includes("is not a function");
    if (!soft) throw err;
  }

  const nextTier: VluerGrade | null = upgradeEligibility.partner.available
    ? "partner"
    : upgradeEligibility.certified.available
      ? "certified"
      : null;
  const nextDisplay = nextTier ? TIER_DISPLAY[nextTier] : null;
  const projectedIfNext =
    nextTier != null ? estimateMonthlyBenefit(nextTier, downlineUsers, enterprises) : monthly;

  let platformRetainedTotalKrw = 0;
  try {
    const retainedSum = await prisma.commissionLedger.aggregate({
      where: { vluerUserId: userId, blockedReason: "platform_retained_revenue" },
      _sum: { grossPaymentKrw: true }
    });
    platformRetainedTotalKrw = retainedSum._sum.grossPaymentKrw ?? 0;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const soft = msg.includes("does not exist") || msg.includes("Invalid `prisma");
    if (!soft) throw err;
  }

  return {
    tierCode,
    vluerGrade: tierCode,
    tierDisplay: display,
    referralChannel: monthly.channel,
    promoActive,
    stats: {
      downlineUsers,
      enterprises,
      totalMembers,
      paidReferrals: upgradeEligibility.paidReferralCount,
      monthlyEstimatedKrw: monthly.isPoints ? 0 : monthly.amount,
      monthlyEstimatedPoints: monthly.isPoints ? monthly.amount : 0,
      monthlyEstimatedLabel: monthly.label,
      monthlyIsPoints: monthly.isPoints,
      canWithdraw: display.canWithdraw,
      pendingChurnRequests: pendingChurn,
      activePenaltyVictims: activePenalties,
      platformRetainedTotalKrw
    },
    upgrade: {
      nextTierCode: nextTier,
      nextTierDisplay: nextDisplay,
      projectedMonthlyLabel: projectedIfNext.label,
      projectedMonthlyKrw: projectedIfNext.isPoints ? 0 : projectedIfNext.amount,
      certifiedAvailable: upgradeEligibility.certified.available,
      partnerAvailable: upgradeEligibility.partner.available,
      certifiedNotice: upgradeEligibility.certifiedRewardNotice,
      partnerNotice: upgradeEligibility.partnerRewardNotice,
      priceChangeNotice: upgradeEligibility.priceChangeNotice
    },
    vluerUpgrade: upgradeEligibility,
    fear: {
      lockMonths: 3,
      penaltyMonths: 6,
      penaltyFullPriceKrw: PREMIUM_LIST_PRICE_KRW,
      message:
        pendingChurn > 0
          ? `산하 ${pendingChurn}건 가입코드 변경 신청 대기 — 승인 시 6개월 정가·레퍼럴·리워드 미지급`
          : "가입코드 변경 승인 시 6개월간 월 28,300원 정가 · 해당 기간 레퍼럴 수익·리워드포인트 미지급"
    }
  };
}

export async function listOrgMap(userId: string) {
  const downlines = await referralDb.referralAttribution.findMany({
    where: { sponsorVluerUserId: userId },
    orderBy: { attributedAt: "desc" },
    take: 80,
    include: {
      user: {
        select: {
          id: true,
          publicHandle: true,
          legalName: true,
          nickFeed: true,
          createdAt: true
        }
      }
    }
  });

  const pendingByMember = new Set(
    (
      await referralDb.vluerCodeChangeRequest.findMany({
        where: { currentSponsorUserId: userId, status: "pending" },
        select: { memberUserId: true }
      })
    ).map((r: { memberUserId: string }) => r.memberUserId)
  );

  const members = downlines.map((d: {
    userId: string;
    attributedAt: Date;
    codeChangeLockedUntil: Date;
    referralCodeUsed: string | null;
    user: { legalName: string | null; nickFeed: string | null; publicHandle: string | null };
  }) => ({
    kind: "user" as const,
    userId: d.userId,
    name: d.user.legalName || d.user.nickFeed || d.user.publicHandle || "회원",
    handle: d.user.publicHandle,
    joinedAt: d.attributedAt,
    lockUntil: d.codeChangeLockedUntil,
    churnRisk: pendingByMember.has(d.userId),
    referralCodeUsed: d.referralCodeUsed
  }));

  const enterprises = await referralDb.b2BEnterpriseAccount.findMany({
    where: { acquiredByVluerUserId: userId },
    orderBy: { createdAt: "desc" },
    take: 40,
    select: {
      id: true,
      companyName: true,
      status: true,
      totalBillingAmountKrw: true,
      cartLines: { select: { id: true } }
    }
  });

  const orgEnterprises = enterprises.map((e: {
    id: string;
    companyName: string;
    status: string;
    totalBillingAmountKrw: number;
    cartLines: { id: string }[];
  }) => ({
    kind: "enterprise" as const,
    enterpriseId: e.id,
    name: e.companyName,
    status: e.status,
    lineCount: e.cartLines.length,
    billingKrw: e.totalBillingAmountKrw,
    churnRisk: false
  }));

  return { members, enterprises: orgEnterprises };
}

export async function listSettlementHistory(userId: string, limit = 30) {
  const rows = await prisma.commissionLedger.findMany({
    where: { vluerUserId: userId },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      payerUser: { select: { publicHandle: true, legalName: true, nickFeed: true } }
    }
  });

  return rows.map((r) => {
    const pct = TIER_DISPLAY[r.tierCode as unknown as VluerGrade]?.commissionPct ?? 0;
    const retained = r.blockedReason === "platform_retained_revenue";
    return {
      id: r.id,
      createdAt: r.createdAt,
      kind: r.kind,
      tierCode: r.tierCode,
      tierLabel: TIER_DISPLAY[r.tierCode as unknown as VluerGrade]?.code ?? r.tierCode,
      commissionPct: pct,
      grossPaymentKrw: r.grossPaymentKrw,
      commissionKrw: r.commissionKrw,
      retained,
      payerLabel:
        r.payerUser?.legalName ||
        r.payerUser?.nickFeed ||
        r.payerUser?.publicHandle ||
        "1단계 매출",
      payoutMode: r.payoutMode,
      isRewardPoints: r.payoutMode === "reward_only",
      note: retained ? "platform_retained" : r.blockedReason || null
    };
  });
}

export type SimulatorInput = {
  extraDownlineUsers?: number;
  extraEnterprises?: number;
  targetTier?: VluerTierCode;
};

export function simulateRevenue(
  currentTier: VluerTierCode,
  downlineUsers: number,
  enterprises: number,
  input: SimulatorInput
) {
  const u = downlineUsers + (input.extraDownlineUsers ?? 0);
  const e = enterprises + (input.extraEnterprises ?? 0);
  const tier = input.targetTier ?? currentTier;
  const current = estimateMonthlyBenefit(currentTier, downlineUsers, enterprises);
  const projected = estimateMonthlyBenefit(tier, u, e);
  const total = totalMemberCount(u, e);
  return {
    currentMonthlyLabel: current.label,
    projectedMonthlyLabel: projected.label,
    currentMonthlyKrw: current.isPoints ? 0 : current.amount,
    projectedMonthlyKrw: projected.isPoints ? 0 : projected.amount,
    projectedMonthlyPoints: projected.isPoints ? projected.amount : 0,
    deltaKrw: floorWon(
      (projected.isPoints ? projected.amount : projected.amount) -
        (current.isPoints ? current.amount : current.amount)
    ),
    assumedDownlineUsers: u,
    assumedEnterprises: e,
    assumedTotalMembers: total,
    tierCode: tier,
    tierDisplay: TIER_DISPLAY[tier as unknown as VluerGrade]
  };
}
