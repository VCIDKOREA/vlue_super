import type { Prisma } from "@prisma/client";
import { prisma } from "../../db/client.js";
import { floorWon } from "../../lib/moneyKrw.js";

type Tx = Prisma.TransactionClient;

function msPerDay() {
  return 86_400_000;
}

function daySpan(start: Date, end: Date): number {
  const d = Math.ceil((end.getTime() - start.getTime()) / msPerDay());
  return Math.max(0, d);
}

function daysInCalendarMonth(d: Date): number {
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  return new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
}

export type ProrationInput = {
  plan: "b2c_monthly" | "b2c_annual";
  amountKrw: number;
  cycleStartAt: Date;
  cycleEndAt: Date;
  asOf?: Date;
};

/** 잔여 일수 비례 환불액 (월간: 당월 일수 기준, 연간: 결제 주기 일수 기준) */
export function computeProratedRefundKrw(input: ProrationInput): {
  refundAmountKrw: number;
  prorationMeta: Record<string, unknown>;
} {
  const now = input.asOf ?? new Date();
  if (now >= input.cycleEndAt) {
    return {
      refundAmountKrw: 0,
      prorationMeta: { reason: "cycle_ended", asOf: now.toISOString() }
    };
  }

  const cycleDays = Math.max(1, daySpan(input.cycleStartAt, input.cycleEndAt));
  const usedDays = Math.min(cycleDays, daySpan(input.cycleStartAt, now));
  const remainingDays = Math.max(0, cycleDays - usedDays);

  if (input.plan === "b2c_monthly") {
    const monthDays = daysInCalendarMonth(input.cycleStartAt);
    const denom = Math.max(1, monthDays);
    const refundAmountKrw = floorWon(input.amountKrw * (remainingDays / denom));
    return {
      refundAmountKrw,
      prorationMeta: {
        plan: input.plan,
        paidAmountKrw: input.amountKrw,
        usedDays,
        remainingDays,
        monthDays: denom,
        formula: "paid * (remainingDays / monthDays)",
        asOf: now.toISOString()
      }
    };
  }

  const refundAmountKrw = floorWon(input.amountKrw * (remainingDays / cycleDays));
  return {
    refundAmountKrw,
    prorationMeta: {
      plan: input.plan,
      paidAmountKrw: input.amountKrw,
      usedDays,
      remainingDays,
      cycleDays,
      formula: "paid * (remainingDays / cycleDays)",
      asOf: now.toISOString()
    }
  };
}

/** PG 취소 큐 적재 스텁 — 실제 PG 연동 전 pending 레코드만 생성 */
export async function enqueueProratedRefundStub(
  db: Tx | typeof prisma,
  params: {
    userId: string;
    subscriptionId: string;
    refundAmountKrw: number;
    reason: string;
    prorationMeta: Record<string, unknown>;
  }
) {
  if (params.refundAmountKrw <= 0) {
    return { enqueued: false as const, refundAmountKrw: 0 };
  }

  const row = await db.refundQueue.create({
    data: {
      userId: params.userId,
      subscriptionId: params.subscriptionId,
      refundAmountKrw: params.refundAmountKrw,
      reason: params.reason.slice(0, 200),
      status: "pending",
      prorationMeta: params.prorationMeta as Prisma.InputJsonValue
    }
  });

  return { enqueued: true as const, refundQueueId: row.id, refundAmountKrw: params.refundAmountKrw };
}

/** 귀속 승인 시 개인 B2C 정기구독 즉시 해지 + 잔여일 환불 큐 */
export async function cancelPersonalSubscriptions(
  db: Tx,
  userId: string,
  cancelReason: string
): Promise<{ cancelledIds: string[]; refunds: { subscriptionId: string; refundAmountKrw: number }[] }> {
  const active = await db.userSubscription.findMany({
    where: {
      userId,
      status: "active",
      plan: { in: ["b2c_monthly", "b2c_annual"] }
    }
  });

  const now = new Date();
  const cancelledIds: string[] = [];
  const refunds: { subscriptionId: string; refundAmountKrw: number }[] = [];

  for (const sub of active) {
    await db.userSubscription.update({
      where: { id: sub.id },
      data: {
        status: "cancelled",
        cancelledAt: now,
        cancelReason,
        nextChargeAt: null
      }
    });
    cancelledIds.push(sub.id);

    const { refundAmountKrw, prorationMeta } = computeProratedRefundKrw({
      plan: sub.plan,
      amountKrw: sub.amountKrw,
      cycleStartAt: sub.cycleStartAt,
      cycleEndAt: sub.cycleEndAt,
      asOf: now
    });

    const enq = await enqueueProratedRefundStub(db, {
      userId,
      subscriptionId: sub.id,
      refundAmountKrw,
      reason: `corporate_attribution:${cancelReason}`,
      prorationMeta
    });

    if (enq.enqueued) {
      refunds.push({ subscriptionId: sub.id, refundAmountKrw: enq.refundAmountKrw });
    }
  }

  return { cancelledIds, refunds };
}
