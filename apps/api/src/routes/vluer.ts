import { Hono } from "hono";
import { prisma } from "../db/client.js";
import { requireUserHeader } from "../middleware/cardGate.js";
import {
  assertCanActAsVluer,
  isUserB2bSettlementExcluded
} from "../services/b2b/vluerEligibility.js";
import {
  calculateVluerCommission,
  expectedSubscriptionCommissionKrw
} from "../services/vluer/settlementEngine.js";
import {
  b2cPlanPriceKrw,
  type B2CPlanKind
} from "../services/vluer/pricingConstants.js";
import {
  syncUserVluerTier,
  runVluerTierSchedulerBatch,
  countAcquiredEnterprises
} from "../services/vluer/tierEngine.js";
import { TIER_DISPLAY } from "../services/vluer/tierLabels.js";
import {
  buildVluerDashboard,
  listOrgMap,
  listSettlementHistory
} from "../services/vluer/referralDashboard.js";
import { runRevenueSimulation } from "../services/vluer/revenueSimulatorEngine.js";
import {
  createCodeChangeRequest,
  approveCodeChangeRequest
} from "../services/vluer/referralLockEngine.js";
import { resolveProfileGrade, type VluerTierCode } from "../services/vluer/tierEngine.js";
import {
  buildVluerUpgradeEligibility,
  upgradeVluerGrade
} from "../services/vluer/vluerUpgradeEngine.js";
import type { UpgradeTargetGrade } from "../services/vluer/vluerGradeTypes.js";
import { handleVluerRouteError } from "../lib/vluerRouteError.js";

export const vluerRoutes = new Hono();

vluerRoutes.use("*", requireUserHeader);

const TIER_LABELS: Record<string, string> = {
  general: TIER_DISPLAY.general.label,
  certified: TIER_DISPLAY.certified.label,
  partner: TIER_DISPLAY.partner.label,
  official: TIER_DISPLAY.official.label
};

vluerRoutes.get("/me", async (c) => {
  const me = c.get("vlueUserId")!;
  const excluded = await isUserB2bSettlementExcluded(me);
  const profile = await prisma.userVluerProfile.upsert({
    where: { userId: me },
    create: { userId: me },
    update: {}
  });
  const policy = await prisma.vluerTierPolicy.findUnique({
    where: { tierCode: profile.tierCode }
  });

  const sub = await prisma.userSubscription.findFirst({
    where: { userId: me, status: "active" },
    orderBy: { createdAt: "desc" },
    select: { isDiscounted: true, plan: true, amountKrw: true, referralCodeUsed: true }
  });

  const grade = resolveProfileGrade(profile);

  return c.json({
    profile,
    vluerGrade: grade,
    tierCode: grade,
    tierLabel: TIER_LABELS[grade] || grade,
    policy,
    subscription: sub,
    canActAsVluer: excluded ? false : profile.canActAsVluer,
    isEligibleForVluerSettlement: excluded ? false : profile.isEligibleForVluerSettlement,
    b2bSettlementExcluded: excluded
  });
});

vluerRoutes.post("/referral-code/issue", async (c) => {
  const me = c.get("vlueUserId")!;
  const gate = await assertCanActAsVluer(me);
  if (!gate.ok) return c.json({ error: gate.error }, 403);

  const synced = await syncUserVluerTier(me);
  const code =
    synced.referralCode ||
    `V${me.replace(/-/g, "").slice(0, 8).toUpperCase()}`;

  const updated = await prisma.userVluerProfile.update({
    where: { userId: me },
    data: { referralCode: code }
  });

  return c.json({ referralCode: updated.referralCode, tierCode: updated.tierCode });
});

vluerRoutes.post("/commission/preview", async (c) => {
  const me = c.get("vlueUserId")!;
  const body = (await c.req.json().catch(() => ({}))) as {
    kind?: string;
    plan?: B2CPlanKind;
    commerceAmountKrw?: number;
    payerUserId?: string;
  };

  const plan = body.plan === "annual" ? "annual" : "monthly";
  const kind =
    body.kind === "commerce"
      ? "commerce"
      : plan === "annual"
        ? "subscription_annual"
        : "subscription_monthly";

  const gross =
    kind === "commerce"
      ? Number(body.commerceAmountKrw) || 0
      : b2cPlanPriceKrw(plan);

  const payerExcluded = body.payerUserId
    ? await isUserB2bSettlementExcluded(body.payerUserId)
    : false;
  const vluerExcluded = await isUserB2bSettlementExcluded(me);

  const result = await calculateVluerCommission({
    vluerUserId: me,
    payerUserId: body.payerUserId || null,
    kind,
    grossPaymentKrw: gross,
    payerIsB2bMember: payerExcluded,
    vluerIsB2bBlocked: vluerExcluded
  });

  const profile = await prisma.userVluerProfile.findUnique({ where: { userId: me } });
  const tierCode = profile?.tierCode ?? "general";

  return c.json({
    grossPaymentKrw: gross,
    expectedBySpec: expectedSubscriptionCommissionKrw(tierCode, plan),
    result,
    tierLabel: TIER_LABELS[tierCode]
  });
});

vluerRoutes.get("/dashboard", async (c) => {
  const me = c.get("vlueUserId")!;
  try {
    const dashboard = await buildVluerDashboard(me);
    return c.json(dashboard);
  } catch (e) {
    return handleVluerRouteError(c, "/dashboard", e);
  }
});

vluerRoutes.get("/dashboard/org-map", async (c) => {
  const me = c.get("vlueUserId")!;
  try {
    const org = await listOrgMap(me);
    return c.json(org);
  } catch (e) {
    return handleVluerRouteError(c, "/dashboard/org-map", e);
  }
});

vluerRoutes.get("/dashboard/settlements", async (c) => {
  const me = c.get("vlueUserId")!;
  try {
    const limit = Math.min(50, Number(c.req.query("limit")) || 30);
    const rows = await listSettlementHistory(me, limit);
    return c.json({ items: rows });
  } catch (e) {
    return handleVluerRouteError(c, "/dashboard/settlements", e);
  }
});

vluerRoutes.post("/dashboard/simulate", async (c) => {
  const me = c.get("vlueUserId")!;
  try {
    const body = (await c.req.json().catch(() => ({}))) as {
      billingCycle?: string;
      personalMemberCount?: number;
      b2bLineCount?: number;
      extraDownlineUsers?: number;
      extraEnterprises?: number;
      extraB2bLines?: number;
      targetTier?: string;
    };
    const profile = await syncUserVluerTier(me);
    const tierCode = resolveProfileGrade(profile) as VluerTierCode;
    const downline = profile.cumulativeB2cReferrals;
    const ent = await countAcquiredEnterprises(me);

    const target =
      body.targetTier === "partner" ||
      body.targetTier === "certified" ||
      body.targetTier === "general" ||
      body.targetTier === "official"
        ? body.targetTier
        : tierCode;

    const billingCycle = body.billingCycle === "annual" ? "annual" : "monthly";

    const personal =
      body.personalMemberCount != null
        ? Number(body.personalMemberCount)
        : downline + (Number(body.extraDownlineUsers) || 0);

    const b2bLine =
      body.b2bLineCount != null
        ? Number(body.b2bLineCount)
        : ent * 10 + (Number(body.extraB2bLines) || Number(body.extraEnterprises) * 10 || 0);

    const result = runRevenueSimulation({
      tierCode: target,
      billingCycle,
      personalMemberCount: personal,
      b2bLineCount: b2bLine
    });

    return c.json({
      ...result,
      tierDisplay: TIER_DISPLAY[target],
      projectedMonthlyLabel: result.displayLabel,
      projectedMonthlyKrw: result.isRewardPoints ? 0 : result.afterTaxCommissionKrw,
      projectedMonthlyPoints: result.isRewardPoints ? result.afterTaxPoints : 0
    });
  } catch (e) {
    return handleVluerRouteError(c, "/dashboard/simulate", e);
  }
});

vluerRoutes.post("/code-change/request", async (c) => {
  const me = c.get("vlueUserId")!;
  const body = (await c.req.json().catch(() => ({}))) as { referralCode?: string };
  try {
    const req = await createCodeChangeRequest(me, String(body.referralCode ?? ""));
    return c.json({ request: req, message: "코드 변경 신청이 접수되었습니다. 승인 시 6개월 정가 페널티가 적용됩니다." });
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : "신청 실패" }, 400);
  }
});

vluerRoutes.post("/tier/sync", async (c) => {
  const me = c.get("vlueUserId")!;
  const profile = await syncUserVluerTier(me);
  return c.json({ profile, tierLabel: TIER_LABELS[profile.tierCode] });
});

/** VLUER 업그레이드 가능 여부 (인원 수치 미노출) */
vluerRoutes.get("/upgrade/status", async (c) => {
  const me = c.get("vlueUserId")!;
  try {
    const status = await buildVluerUpgradeEligibility(me);
    const { paidReferralCount: _omit, ...publicStatus } = status;
    return c.json(publicStatus);
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : "조회 실패" }, 400);
  }
});

/** VLUER 등급 업그레이드 — 인증(50~999 유료 추천) · 파트너(1000+) */
vluerRoutes.post("/upgrade", async (c) => {
  const me = c.get("vlueUserId")!;
  try {
    const body = (await c.req.json().catch(() => ({}))) as {
      targetGrade?: string;
      confirmPriceChange?: boolean;
    };
    const target = String(body.targetGrade || "").trim() as UpgradeTargetGrade;
    if (target !== "certified" && target !== "partner") {
      return c.json({ error: "targetGrade 는 certified 또는 partner 여야 합니다." }, 400);
    }
    const out = await upgradeVluerGrade(me, target, {
      confirmPriceChange: Boolean(body.confirmPriceChange)
    });
    return c.json(out);
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : "업그레이드 실패" }, 400);
  }
});

vluerRoutes.post("/tier/scheduler-run", async (c) => {
  const secret = c.req.header("x-vluer-scheduler-secret");
  if (process.env.VLUER_SCHEDULER_SECRET && secret !== process.env.VLUER_SCHEDULER_SECRET) {
    return c.json({ error: "unauthorized" }, 401);
  }
  const result = await runVluerTierSchedulerBatch(500);
  return c.json(result);
});

vluerRoutes.post("/code-change/:id/approve", async (c) => {
  const secret = c.req.header("x-admin-device-id");
  if (!secret) return c.json({ error: "admin required" }, 403);
  try {
    const out = await approveCodeChangeRequest(c.req.param("id"));
    return c.json(out);
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : "승인 실패" }, 400);
  }
});
