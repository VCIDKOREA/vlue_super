import { prisma } from "../db/client.js";
import { EXTERNAL_PARTNER_MIN_MONTHLY_REFERRALS } from "@vlue/shared";

export type PartnerMonthlySuspendResult = {
  evaluated: number;
  suspended: number;
  resetCounters: number;
  retainedLedgers: number;
  errors: string[];
};

/**
 * 매월 1일 — 외부 파트너 전월 신규 유치 < 10명이면 SUSPENDED,
 * 기존 수수료 매핑은 company_retained 로 귀속.
 * monthlyActiveReferrals 카운터는 평가 후 0으로 리셋.
 */
export async function runPartnerMonthlyEligibilityCron(opts?: {
  dryRun?: boolean;
}): Promise<PartnerMonthlySuspendResult> {
  const dryRun = Boolean(opts?.dryRun);
  const result: PartnerMonthlySuspendResult = {
    evaluated: 0,
    suspended: 0,
    resetCounters: 0,
    retainedLedgers: 0,
    errors: []
  };

  let partners: Array<{
    userId: string;
    monthlyActiveReferrals: number;
    partnerStatus: string;
  }> = [];

  try {
    partners = await prisma.userVluerProfile.findMany({
      where: {
        partnerType: "EXTERNAL_PARTNER",
        partnerStatus: { in: ["ACTIVE", "SUSPENDED"] }
      },
      select: {
        userId: true,
        monthlyActiveReferrals: true,
        partnerStatus: true
      }
    });
  } catch (e) {
    result.errors.push(
      e instanceof Error ? e.message : "partner_query_failed"
    );
    return result;
  }

  result.evaluated = partners.length;
  const now = new Date();

  for (const p of partners) {
    try {
      const underQuota =
        Number(p.monthlyActiveReferrals || 0) < EXTERNAL_PARTNER_MIN_MONTHLY_REFERRALS;

      if (underQuota && p.partnerStatus === "ACTIVE") {
        if (!dryRun) {
          await prisma.userVluerProfile.update({
            where: { userId: p.userId },
            data: {
              partnerStatus: "SUSPENDED",
              partnerSuspendedAt: now,
              isEligibleForVluerSettlement: false,
              rewardsFrozen: true,
              rewardsFrozenAt: now,
              monthlyActiveReferrals: 0
            }
          });

          const retained = await prisma.commissionLedger.updateMany({
            where: {
              vluerUserId: p.userId,
              settlementStatus: { in: ["pending_hold", "confirmed"] }
            },
            data: {
              settlementStatus: "company_retained",
              blockedReason: "partner_suspended_monthly_quota",
              confirmedAt: now
            }
          });
          result.retainedLedgers += retained.count;
        }
        result.suspended += 1;
        result.resetCounters += 1;
        continue;
      }

      if (!dryRun) {
        await prisma.userVluerProfile.update({
          where: { userId: p.userId },
          data: { monthlyActiveReferrals: 0 }
        });
      }
      result.resetCounters += 1;
    } catch (e) {
      result.errors.push(
        `${p.userId}:${e instanceof Error ? e.message : "update_failed"}`
      );
    }
  }

  return result;
}

/**
 * 14일 유예 경과 pending_hold → confirmed
 */
export async function confirmHeldCommissions(opts?: { dryRun?: boolean }) {
  const dryRun = Boolean(opts?.dryRun);
  const now = new Date();
  if (dryRun) {
    const count = await prisma.commissionLedger.count({
      where: {
        settlementStatus: "pending_hold",
        eligibleAt: { lte: now },
        commissionKrw: { gt: 0 }
      }
    });
    return { confirmed: count, dryRun: true };
  }
  const updated = await prisma.commissionLedger.updateMany({
    where: {
      settlementStatus: "pending_hold",
      eligibleAt: { lte: now },
      commissionKrw: { gt: 0 }
    },
    data: {
      settlementStatus: "confirmed",
      confirmedAt: now
    }
  });
  return { confirmed: updated.count, dryRun: false };
}
