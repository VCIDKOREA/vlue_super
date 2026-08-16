import { Hono } from "hono";
import { z } from "zod";
import { requireUserHeader } from "../middleware/cardGate.js";
import {
  cancelLineSubscription,
  chargeLineSubscription,
  getOwnerLineBillingStatus,
  prepareLineCart
} from "../services/billing/lineBillingService.js";

export const lineBillingRoutes = new Hono();

lineBillingRoutes.get("/status", requireUserHeader, async (c) => {
  const userId = c.get("vlueUserId") as string;
  const data = await getOwnerLineBillingStatus(userId);
  return c.json({ ok: true, ...data });
});

const cartBody = z.object({
  businessCardIds: z.array(z.string().uuid()).min(1).max(20),
  amountKrw: z.number().int().positive().optional(),
  plan: z.enum(["b2c_monthly", "b2c_annual"]).optional()
});

/** 장바구니 일괄 신청 — 구독 행은 회선별로 생성 */
lineBillingRoutes.post("/cart/prepare", requireUserHeader, async (c) => {
  const userId = c.get("vlueUserId") as string;
  const parsed = cartBody.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) {
    return c.json({ ok: false, error: "회선 ID 목록이 필요합니다." }, 400);
  }
  try {
    const lines = await prepareLineCart({
      userId,
      businessCardIds: parsed.data.businessCardIds,
      amountKrw: parsed.data.amountKrw ?? 9900,
      plan: parsed.data.plan
    });
    return c.json({ ok: true, lines });
  } catch (e) {
    return c.json({ ok: false, error: e instanceof Error ? e.message : "신청 실패" }, 400);
  }
});

lineBillingRoutes.post("/:lineId/charge", requireUserHeader, async (c) => {
  const userId = c.get("vlueUserId") as string;
  const lineId = String(c.req.param("lineId") || "").trim();
  const result = await chargeLineSubscription(lineId, userId);
  if (!result.ok) {
    return c.json({ ok: false, error: result.error }, 400);
  }
  return c.json({
    ok: true,
    line: result.dto,
    merchantUid: result.merchantUid,
    impUid: result.impUid
  });
});

lineBillingRoutes.post("/:lineId/cancel", requireUserHeader, async (c) => {
  const userId = c.get("vlueUserId") as string;
  const lineId = String(c.req.param("lineId") || "").trim();
  const body = (await c.req.json().catch(() => ({}))) as { reason?: string };
  const dto = await cancelLineSubscription(lineId, userId, String(body.reason || "user_cancel"));
  if (!dto) return c.json({ ok: false, error: "회선 구독을 찾을 수 없습니다." }, 404);
  return c.json({ ok: true, line: dto });
});
