import { randomUUID } from "node:crypto";
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
import { resolveProfileGrade, isVluerPromoActiveGrade, type VluerTierCode } from "../services/vluer/tierEngine.js";
import type { ReferralChannel } from "@vlue/shared/referral";
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
      referralChannel?: string;
      benefitPhase?: string;
      /** @deprecated — referralChannel 사용 */
      targetTier?: string;
    };
    const profile = await syncUserVluerTier(me);
    const tierCode = resolveProfileGrade(profile) as VluerTierCode;
    const downline = profile.cumulativeB2cReferrals;
    const ent = await countAcquiredEnterprises(me);

    const defaultChannel: ReferralChannel = isVluerPromoActiveGrade(tierCode) ? "promo" : "friend";
    let referralChannel: ReferralChannel = defaultChannel;
    if (body.referralChannel === "friend" || body.referralChannel === "promo") {
      referralChannel = body.referralChannel;
    } else if (
      body.targetTier === "certified" ||
      body.targetTier === "partner"
    ) {
      referralChannel = "promo";
    } else if (body.targetTier === "general") {
      referralChannel = "friend";
    }

    const benefitPhase =
      body.benefitPhase === "months_13_plus" ? "months_13_plus" : "months_1_12";

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
      referralChannel,
      benefitPhase,
      billingCycle,
      personalMemberCount: personal,
      b2bLineCount: b2bLine
    });

    return c.json({
      ...result,
      tierRatePct: result.channelRatePct,
      projectedMonthlyLabel: result.displayLabel,
      projectedMonthlyKrw: result.isRewardPoints ? 0 : result.afterTaxCommissionKrw,
      projectedMonthlyPoints: result.isRewardPoints ? result.afterTaxPoints : 0
    });
  } catch (e) {
    return handleVluerRouteError(c, "/dashboard/simulate", e);
  }
});

/** 홍보 VLUER 신청 — SNS 인증 링크 접수 (승인은 운영 처리) */
vluerRoutes.get("/promo/apply/status", async (c) => {
  const me = c.get("vlueUserId")!;
  const profile = await prisma.userVluerProfile.findUnique({ where: { userId: me } });
  const grade = resolveProfileGrade(profile ?? { tierCode: "general" });
  if (isVluerPromoActiveGrade(grade)) {
    return c.json({ status: "approved", promoActive: true });
  }
  try {
    const pending = await prisma.verificationLog.findFirst({
      where: { userId: me, action: "vluer_promo_apply", outcome: "pending" },
      orderBy: { createdAt: "desc" }
    });
    if (pending) {
      return c.json({ status: "pending", promoActive: false, appliedAt: pending.createdAt });
    }
  } catch {
    /* verification_logs 미준비 */
  }
  return c.json({ status: "none", promoActive: false });
});

function isPromoUrl(raw: string): boolean {
  const t = String(raw || "").trim();
  if (!t) return false;
  try {
    const url = /^https?:\/\//i.test(t) ? new URL(t) : new URL(`https://${t}`);
    const host = url.hostname.replace(/^www\./i, "");
    if (!host || !host.includes(".")) return false;
    if (host === "localhost") return false;
    return /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(host);
  } catch {
    return false;
  }
}

vluerRoutes.post("/promo/apply", async (c) => {
  const me = c.get("vlueUserId")!;
  const body = (await c.req.json().catch(() => ({}))) as {
    links?: string[];
    snsInstagram?: string;
    snsYoutube?: string;
    snsTiktok?: string;
    note?: string;
  };
  const profile = await prisma.userVluerProfile.findUnique({ where: { userId: me } });
  const grade = resolveProfileGrade(profile ?? { tierCode: "general" });
  if (isVluerPromoActiveGrade(grade)) {
    return c.json({ error: "이미 홍보 VLUER로 승인되었습니다." }, 400);
  }

  const legacy = [body.snsInstagram, body.snsYoutube, body.snsTiktok]
    .map((v) => String(v || "").trim())
    .filter(Boolean);
  const fromArray = Array.isArray(body.links)
    ? body.links.map((v) => String(v || "").trim()).filter(Boolean)
    : [];
  const allLinks = [...new Set([...fromArray, ...legacy])];
  const note = String(body.note || "").trim().slice(0, 200);

  if (allLinks.length === 0) {
    return c.json({ error: "계정 링크를 하나 이상 입력해 주세요." }, 400);
  }
  if (allLinks.some((link) => !isPromoUrl(link))) {
    return c.json({ error: "정확한 주소를 입력하세요" }, 400);
  }

  const [snsInstagram = "", snsYoutube = "", snsTiktok = ""] = allLinks;

  try {
    const pending = await prisma.verificationLog.findFirst({
      where: { userId: me, action: "vluer_promo_apply", outcome: "pending" },
      orderBy: { createdAt: "desc" }
    });
    if (pending) {
      return c.json({ error: "이미 홍보 VLUER 신청이 접수되어 심사 중입니다." }, 400);
    }
  } catch {
    /* ignore */
  }

  try {
    await prisma.verificationLog.create({
      data: {
        id: randomUUID(),
        userId: me,
        action: "vluer_promo_apply",
        detail: { links: allLinks, snsInstagram, snsYoutube, snsTiktok, note, at: new Date().toISOString() },
        outcome: "pending"
      }
    });
  } catch {
    /* 로그 저장 실패해도 접수 완료 응답 */
  }

  return c.json({
    ok: true,
    status: "pending",
    message: "홍보 VLUER 신청이 접수되었습니다. SNS 인증 확인 후 승인됩니다."
  });
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
