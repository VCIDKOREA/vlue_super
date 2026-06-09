import { Hono } from "hono";
import { requireUserHeader } from "../middleware/cardGate.js";
import {
  assertBroadcastFeatureAccess,
  resolveMembershipAccessSafe
} from "../services/membership/membershipAccessService.js";
import { assertBroadcastCheckoutAmountKrw } from "../services/membership/membershipCheckoutGuard.js";
import {
  BROADCAST_REFUND_POLICY_DETAIL,
  BROADCAST_REFUND_POLICY_SUMMARY,
  quoteBroadcastRefund
} from "../services/membership/broadcastRefundPolicy.js";
import {
  deleteBroadcastLine,
  getBroadcastLineForUser,
  pauseBroadcastLine,
  prepareBroadcastCheckout,
  setBroadcastEnabled,
  updateBroadcastPhone
} from "../services/membership/broadcastLineService.js";
import { completeBroadcastAddonPayment } from "../services/payment/broadcastCheckoutComplete.js";
import { loadPricingConfig } from "../services/pricing/pricingConfigService.js";

export const broadcastLineRoutes = new Hono();

broadcastLineRoutes.use("*", requireUserHeader);

function billingCycleFrom(raw: string | undefined): "monthly" | "annual" {
  const s = String(raw || "monthly").toLowerCase();
  return s === "annual" || s === "yearly" ? "annual" : "monthly";
}

/** GET /api/broadcast-line/me */
broadcastLineRoutes.get("/me", async (c) => {
  try {
    const userId = c.get("vlueUserId") as string;
    const [line, access] = await Promise.all([
      getBroadcastLineForUser(userId),
      resolveMembershipAccessSafe(userId)
    ]);
    const refund =
      line?.paidAt && line.amountKrw
        ? quoteBroadcastRefund(line.paidAt, line.amountKrw)
        : null;
    return c.json({ ok: true, line, access, refund });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown error";
    return c.json({ error: msg }, 500);
  }
});

/** GET /api/broadcast-line/refund-policy */
broadcastLineRoutes.get("/refund-policy", (c) => {
  return c.json({
    ok: true,
    summary: BROADCAST_REFUND_POLICY_SUMMARY,
    details: BROADCAST_REFUND_POLICY_DETAIL
  });
});

/** POST /api/broadcast-line/checkout/prepare */
broadcastLineRoutes.post("/checkout/prepare", async (c) => {
  try {
    const userId = c.get("vlueUserId") as string;
    const body = (await c.req.json().catch(() => ({}))) as {
      phoneE164?: string;
      billingCycle?: string;
    };
    const access = await resolveMembershipAccessSafe(userId);
    if (!access.hasPrimarySoho) {
      return c.json({ error: "SOHO 활동형 Primary 계정이 먼저 필요합니다." }, 403);
    }
    const cycle = billingCycleFrom(body.billingCycle);
    const cfg = await loadPricingConfig();
    const amountKrw =
      cycle === "annual"
        ? cfg.plans.soho_broadcast_addon.annualKrw
        : cfg.plans.soho_broadcast_addon.monthlyKrw;
    const line = await prepareBroadcastCheckout(userId, String(body.phoneE164 || ""), cycle);
    return c.json({
      ok: true,
      line,
      checkout: { amountKrw, billingCycle: cycle, sku: cfg.plans.soho_broadcast_addon.sku },
      refundPolicySummary: BROADCAST_REFUND_POLICY_SUMMARY
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown error";
    return c.json({ error: msg }, 400);
  }
});

/** POST /api/broadcast-line/checkout/complete — 결제 후 번호 확정 */
broadcastLineRoutes.post("/checkout/complete", async (c) => {
  try {
    const userId = c.get("vlueUserId") as string;
    const body = (await c.req.json().catch(() => ({}))) as {
      phoneE164?: string;
      amount?: number;
      billingCycle?: string;
      merchant_uid?: string;
      customer_uid?: string;
      agreeRefundPolicy?: boolean;
      devBillingBypass?: boolean;
    };

    const result = await completeBroadcastAddonPayment({
      userId,
      phoneE164: String(body.phoneE164 || ""),
      amount: Number(body.amount || 0),
      billingCycle: body.billingCycle,
      merchantUid: String(body.merchant_uid || ""),
      customerUid: String(body.customer_uid || ""),
      agreeRefundPolicy: Boolean(body.agreeRefundPolicy),
      devBillingBypass: Boolean(body.devBillingBypass)
    });

    const access = await resolveMembershipAccessSafe(userId);
    return c.json({ ok: true, ...result, access });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown error";
    const status = msg.includes("포트원") || msg.includes("결제") ? 502 : 400;
    return c.json({ error: msg }, status);
  }
});

/** PATCH /api/broadcast-line/me — 발신번호 수정 */
broadcastLineRoutes.patch("/me", async (c) => {
  try {
    const userId = c.get("vlueUserId") as string;
    const body = (await c.req.json().catch(() => ({}))) as { phoneE164?: string };
    const line = await updateBroadcastPhone(userId, String(body.phoneE164 || ""));
    return c.json({ ok: true, line });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown error";
    return c.json({ error: msg }, 400);
  }
});

/** PATCH /api/broadcast-line/toggle — 송출 켜짐/꺼짐 */
broadcastLineRoutes.patch("/toggle", async (c) => {
  try {
    const userId = c.get("vlueUserId") as string;
    const body = (await c.req.json().catch(() => ({}))) as { enabled?: boolean };
    const line = await setBroadcastEnabled(userId, Boolean(body.enabled));
    const access = await resolveMembershipAccessSafe(userId);
    return c.json({ ok: true, line, access });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown error";
    return c.json({ error: msg }, 400);
  }
});

/** POST /api/broadcast-line/pause — 사용 정지(즉시 중단) */
broadcastLineRoutes.post("/pause", async (c) => {
  try {
    const userId = c.get("vlueUserId") as string;
    const body = (await c.req.json().catch(() => ({}))) as { agreeRefundPolicy?: boolean };
    const { line, refund } = await pauseBroadcastLine(userId, Boolean(body.agreeRefundPolicy));
    const access = await resolveMembershipAccessSafe(userId);
    return c.json({ ok: true, line, refund, access });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown error";
    return c.json({ error: msg }, 400);
  }
});

/** DELETE /api/broadcast-line/me */
broadcastLineRoutes.delete("/me", async (c) => {
  try {
    const userId = c.get("vlueUserId") as string;
    await deleteBroadcastLine(userId);
    const access = await resolveMembershipAccessSafe(userId);
    return c.json({ ok: true, access });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown error";
    return c.json({ error: msg }, 400);
  }
});

/** GET /api/broadcast-line/access-check */
broadcastLineRoutes.get("/access-check", async (c) => {
  try {
    const userId = c.get("vlueUserId") as string;
    const access = await assertBroadcastFeatureAccess(userId).catch((err) => ({
      error: (err as Error).message
    }));
    if ("error" in access) return c.json({ ok: false, error: access.error }, 403);
    return c.json({ ok: true, access });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown error";
    return c.json({ error: msg }, 500);
  }
});

/** @deprecated — 결제 플로우 사용 */
broadcastLineRoutes.post("/register", async (c) => {
  try {
    const userId = c.get("vlueUserId") as string;
    const body = (await c.req.json().catch(() => ({}))) as { phoneE164?: string };
    const cfg = await loadPricingConfig();
    const line = await prepareBroadcastCheckout(userId, String(body.phoneE164 || ""));
    return c.json({
      ok: true,
      line,
      message: "결제가 필요합니다.",
      checkout: {
        amountKrw: cfg.plans.soho_broadcast_addon.monthlyKrw,
        billingCycle: "monthly"
      }
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown error";
    return c.json({ error: msg }, 400);
  }
});

/** @deprecated */
broadcastLineRoutes.post("/verify", async (c) => {
  return c.json(
    { error: "결제 완료 시 번호가 자동 확정됩니다. checkout/complete 를 이용해 주세요." },
    400
  );
});
