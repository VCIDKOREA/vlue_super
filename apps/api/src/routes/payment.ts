import { Hono } from "hono";
import { requireUserHeader } from "../middleware/cardGate.js";
import { completePortoneSubscribePayment } from "../services/payment/portoneSubscribeComplete.js";
import { handlePortonePaymentWebhook } from "../services/payment/portoneWebhook.js";
import { resolvePaymentProvider } from "../services/adapters/paymentProvider.js";

export const paymentRoutes = new Hono();

/** 포트원 빌링키 발급(프론트) 후 첫 회차 실결제·구독 활성화 */
paymentRoutes.post("/subscribe/complete", requireUserHeader, async (c) => {
  try {
    const uid = c.get("vlueUserId") as string;
    const body = await c.req.json<{
      customer_uid?: string;
      merchant_uid?: string;
      amount?: number;
      billingCycle?: string;
      devBillingBypass?: boolean;
    }>();

    const result = await completePortoneSubscribePayment({
      userId: uid,
      customerUid: String(body?.customer_uid || ""),
      merchantUid: String(body?.merchant_uid || ""),
      amount: Number(body?.amount || 0),
      billingCycle: body?.billingCycle,
      devBillingBypass: Boolean(body?.devBillingBypass)
    });

    return c.json({
      ok: true,
      subscriptionId: result.subscriptionId,
      status: result.status,
      alreadyActive: result.alreadyActive,
      impUid: result.impUid
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown error";
    const status = msg.includes("포트원") || msg.includes("결제") ? 502 : 400;
    return c.json({ error: msg, code: "SUBSCRIBE_COMPLETE_FAILED" }, status);
  }
});

/**
 * 포트원 결제·가상계좌 입금 웹훅 — 상점(shop_order_*) / 구독(billing_|renew_) 분기 정산
 */
paymentRoutes.post("/webhook", async (c) => {
  const raw = await c.req.text();
  let body: Record<string, unknown> = {};
  try {
    body = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
  } catch {
    body = { raw };
  }

  const webhookSecret = process.env.PORTONE_WEBHOOK_SECRET?.trim();
  if (webhookSecret) {
    const sig = c.req.header("x-portone-signature") || c.req.header("imp_signature") || "";
    if (sig !== webhookSecret) {
      console.warn("[portone webhook] signature mismatch");
      return c.json({ error: "unauthorized" }, 401);
    }
  }

  try {
    const outcome = await handlePortonePaymentWebhook(body);
    console.info("[portone webhook]", outcome);
    return c.json({ received: true, ...outcome });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown error";
    console.error("[portone webhook]", msg);
    return c.json({ received: true, error: msg }, 200);
  }
});

/** 무사업자 보호결제(에스크로) 어댑터 — 기본 mock */
paymentRoutes.post("/escrow/hold", requireUserHeader, async (c) => {
  try {
    const userId = c.get("vlueUserId") as string;
    const body = (await c.req.json<{ orderId?: string; amountKrw?: number }>().catch(() => ({}))) as {
      orderId?: string;
      amountKrw?: number;
    };
    const provider = resolvePaymentProvider();
    const result = await provider.holdEscrow({
      orderId: String(body?.orderId || crypto.randomUUID()),
      buyerUserId: userId,
      amountKrw: Math.max(0, Math.floor(Number(body?.amountKrw) || 0))
    });
    return c.json({ ok: true, escrow: result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown error";
    return c.json({ error: msg }, 400);
  }
});
