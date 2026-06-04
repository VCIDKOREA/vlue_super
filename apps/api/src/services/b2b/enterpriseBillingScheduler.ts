import type { Prisma } from "@prisma/client";
import { prisma } from "../../db/client.js";
import { buildInvoicePreview, type B2BBillingCycle } from "./cartEngine.js";

type Tx = Prisma.TransactionClient;

/** 차기 법인 통합 청구일 — 익월 1일 00:00 UTC (스케줄러 스텁) */
export function nextCorporateBillingAt(from = new Date()): Date {
  return new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth() + 1, 1, 0, 0, 0));
}

export async function recalculateEnterpriseBilling(
  enterpriseId: string,
  db: Tx | typeof prisma = prisma
) {
  const enterprise = await db.b2BEnterpriseAccount.findUnique({
    where: { id: enterpriseId },
    include: { cartLines: true }
  });
  if (!enterprise) {
    return { ok: false as const, error: "enterprise_not_found" };
  }

  const lineCount = enterprise.cartLines.length;
  const cycle = enterprise.billingCycle as B2BBillingCycle;
  const sub = await db.userSubscription.findFirst({
    where: { userId: enterprise.adminUserId },
    orderBy: { createdAt: "desc" },
    select: { referralCodeUsed: true }
  });
  const invoice = buildInvoicePreview(lineCount, cycle, {
    hasReferral: Boolean(sub?.referralCodeUsed)
  });
  const nextBillingAt = enterprise.nextBillingAt ?? nextCorporateBillingAt();

  await db.b2BEnterpriseAccount.update({
    where: { id: enterpriseId },
    data: {
      totalBillingAmountKrw: invoice.totalKrw,
      nextBillingAt
    }
  });

  await db.enterpriseBillingSchedule.upsert({
    where: { enterpriseId },
    create: {
      enterpriseId,
      totalBillingAmountKrw: invoice.totalKrw,
      lineCount: invoice.lineCount,
      billingCycle: enterprise.billingCycle,
      nextBillingAt,
      status: "active"
    },
    update: {
      totalBillingAmountKrw: invoice.totalKrw,
      lineCount: invoice.lineCount,
      billingCycle: enterprise.billingCycle,
      nextBillingAt,
      status: "active"
    }
  });

  return {
    ok: true as const,
    enterpriseId,
    lineCount: invoice.lineCount,
    unitPriceKrw: invoice.unitPriceKrw,
    totalBillingAmountKrw: invoice.totalKrw,
    billingCycle: cycle,
    nextBillingAt: nextBillingAt.toISOString()
  };
}
