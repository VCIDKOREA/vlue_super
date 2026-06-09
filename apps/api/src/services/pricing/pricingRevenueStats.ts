import { prisma } from "../../db/client.js";
import { loadPricingConfig } from "./pricingConfigService.js";

type RevenueFilter = {
  planSku?: string;
  from?: string;
  to?: string;
};

function classifyPayment(amountKrw: number, cfg: Awaited<ReturnType<typeof loadPricingConfig>>) {
  const b2b = cfg.plans.b2b_full_package.monthlyKrw;
  const soho = cfg.plans.soho_activity.monthlyKrw;
  const broadcast = cfg.plans.soho_broadcast_addon.monthlyKrw;
  if (amountKrw === broadcast || amountKrw === cfg.plans.soho_broadcast_addon.annualKrw) {
    return "soho_broadcast_addon";
  }
  if (amountKrw === b2b || amountKrw === cfg.plans.b2b_full_package.annualKrw) {
    return "b2b_full_package";
  }
  if (amountKrw === soho || amountKrw === cfg.plans.soho_activity.annualKrw) {
    return "soho_activity";
  }
  if (amountKrw === cfg.legacy.personalComboAddonMonthlyKrw) return "legacy_personal_combo";
  return "other";
}

export async function getPricingRevenueStats(filter: RevenueFilter = {}) {
  const cfg = await loadPricingConfig();
  const fromDate = filter.from ? new Date(filter.from) : undefined;
  const toDate = filter.to ? new Date(filter.to) : undefined;

  const payments = await prisma.subscriptionPayment.findMany({
    where: {
      status: "paid",
      ...(fromDate || toDate
        ? {
            paidAt: {
              ...(fromDate ? { gte: fromDate } : {}),
              ...(toDate ? { lte: toDate } : {})
            }
          }
        : {})
    },
    select: { amountKrw: true, paidAt: true, userId: true }
  });

  const buckets: Record<
    string,
    { planSku: string; label: string; count: number; totalKrw: number }
  > = {
    b2b_full_package: {
      planSku: "b2b_full_package",
      label: cfg.plans.b2b_full_package.label,
      count: 0,
      totalKrw: 0
    },
    soho_activity: {
      planSku: "soho_activity",
      label: cfg.plans.soho_activity.label,
      count: 0,
      totalKrw: 0
    },
    soho_broadcast_addon: {
      planSku: "soho_broadcast_addon",
      label: cfg.plans.soho_broadcast_addon.label,
      count: 0,
      totalKrw: 0
    },
    legacy_personal_combo: {
      planSku: "legacy_personal_combo",
      label: "레거시 임직원 콤보",
      count: 0,
      totalKrw: 0
    },
    other: { planSku: "other", label: "기타", count: 0, totalKrw: 0 }
  };

  for (const p of payments) {
    const sku = classifyPayment(p.amountKrw, cfg);
    if (filter.planSku && sku !== filter.planSku) continue;
    const bucket = buckets[sku] || buckets.other;
    bucket.count += 1;
    bucket.totalKrw += p.amountKrw;
  }

  const rows = Object.values(buckets).filter((b) => b.count > 0 || !filter.planSku);
  const grandTotal = rows.reduce((s, r) => s + r.totalKrw, 0);

  return {
    filter,
    grandTotalKrw: grandTotal,
    byPlan: rows,
    configVersion: cfg.version,
    vatIncluded: cfg.vatIncluded
  };
}
