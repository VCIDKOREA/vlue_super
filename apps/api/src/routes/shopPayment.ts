import { Hono } from "hono";
import { requireUserHeader } from "../middleware/cardGate.js";
import { completeShopPayment } from "../services/shop/shopPaymentComplete.js";

export const shopPaymentRoutes = new Hono();

/**
 * 포트원 일반결제(IMP.request_pay) 완료 후 서버 검증·주문 PAID 처리
 * POST /api/shop/payment/complete
 */
shopPaymentRoutes.post("/complete", requireUserHeader, async (c) => {
  try {
    const uid = c.get("vlueUserId") as string;
    const body = await c.req.json<{
      imp_uid?: string;
      merchant_uid?: string;
      devShopBypass?: boolean;
    }>();

    const result = await completeShopPayment({
      buyerUserId: uid,
      impUid: String(body?.imp_uid || ""),
      merchantUid: String(body?.merchant_uid || ""),
      devShopBypass: Boolean(body?.devShopBypass)
    });

    return c.json({
      ok: true,
      orderId: result.orderId,
      status: result.status,
      alreadyPaid: result.alreadyPaid,
      amountKrw: result.amountKrw,
      impUid: result.impUid,
      receiptUrl: result.receiptUrl ?? null
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown error";
    const status =
      msg.includes("포트원") || msg.includes("결제") || msg.includes("환경변수") ? 502 : 400;
    return c.json({ error: msg, code: "SHOP_PAYMENT_COMPLETE_FAILED" }, status);
  }
});
