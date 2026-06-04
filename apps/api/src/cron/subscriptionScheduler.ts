import { prisma } from "../db/client.js";
import {
  endOfKoreaDayUtc,
  koreaDateKey,
  startOfKoreaDayUtc
} from "../services/membership/subscriptionBilling.js";
import { renewUserSubscription } from "../services/membership/subscriptionRenewal.js";

export type SubscriptionCronOptions = {
  /** 기준일 (기본: now). 테스트 시 YYYY-MM-DD */
  asOf?: Date;
  /** true 이면 오늘 이전에 밀린 nextChargeAt 도 포함 */
  includeOverdue?: boolean;
  /** dryRun: 조회만, 결제 미실행 */
  dryRun?: boolean;
};

export type SubscriptionCronSummary = {
  asOfDateKst: string;
  scanned: number;
  dueCount: number;
  succeeded: number;
  failed: number;
  skippedDryRun: number;
  results: Array<Record<string, unknown>>;
};

/**
 * 매일 실행 — nextChargeAt(다음 결제일)이 기준일(KST)인 active 구독 정기 청구
 */
export async function runSubscriptionBillingBatch(
  opts: SubscriptionCronOptions = {}
): Promise<SubscriptionCronSummary> {
  const asOf = opts.asOf ?? new Date();
  const dayStart = startOfKoreaDayUtc(asOf);
  const dayEnd = endOfKoreaDayUtc(asOf);
  const includeOverdue = opts.includeOverdue ?? process.env.VLUE_SUBSCRIPTION_CRON_OVERDUE === "1";

  const dueWhere = includeOverdue
    ? { lte: dayEnd }
    : { gte: dayStart, lte: dayEnd };

  const candidates = await prisma.userSubscription.findMany({
    where: {
      status: "active",
      portoneCustomerUid: { not: null },
      nextChargeAt: dueWhere
    },
    orderBy: { nextChargeAt: "asc" },
    select: {
      id: true,
      userId: true,
      nextChargeAt: true,
      isDiscounted: true,
      isDiscountedNextCycle: true,
      isPersonalCombo: true,
      amountKrw: true,
      plan: true,
      portoneCustomerUid: true
    }
  });

  const summary: SubscriptionCronSummary = {
    asOfDateKst: koreaDateKey(asOf),
    scanned: candidates.length,
    dueCount: candidates.length,
    succeeded: 0,
    failed: 0,
    skippedDryRun: 0,
    results: []
  };

  if (opts.dryRun) {
    summary.skippedDryRun = candidates.length;
    summary.results = candidates.map((s) => ({
      subscriptionId: s.id,
      userId: s.userId,
      nextChargeAt: s.nextChargeAt?.toISOString(),
      dryRun: true
    }));
    return summary;
  }

  for (const sub of candidates) {
    const result = await renewUserSubscription(sub.id, asOf);
    if (result.ok) {
      summary.succeeded += 1;
      summary.results.push({
        subscriptionId: result.subscriptionId,
        userId: result.userId,
        amountKrw: result.amountKrw,
        merchantUid: result.merchantUid,
        impUid: result.impUid,
        discountApplied: result.discountApplied,
        postReferralActivated: result.postReferralActivated,
        ok: true
      });
    } else {
      summary.failed += 1;
      summary.results.push({
        subscriptionId: result.subscriptionId,
        userId: result.userId,
        error: result.error,
        merchantUid: result.merchantUid,
        ok: false
      });
    }
  }

  console.info("[subscription-cron]", JSON.stringify({
    asOf: summary.asOfDateKst,
    scanned: summary.scanned,
    succeeded: summary.succeeded,
    failed: summary.failed
  }));

  return summary;
}
