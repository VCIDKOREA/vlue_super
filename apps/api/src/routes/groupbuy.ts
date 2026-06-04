import { Hono } from "hono";
import { requireUserHeader } from "../middleware/cardGate.js";
import {
  createGroupBuyCampaign,
  getGroupBuyTick,
  tickGroupBuyCampaign
} from "../services/groupbuy/groupbuyService.js";

export const groupbuyRoutes = new Hono();
groupbuyRoutes.use("*", requireUserHeader);

groupbuyRoutes.post("/campaigns", async (c) => {
  try {
    const userId = c.get("vlueUserId") as string;
    const body = await c.req.json<{ title?: string; targetQty?: number; durationMinutes?: number }>();
    const title = String(body?.title || "").trim() || "공구 캠페인";
    const campaign = createGroupBuyCampaign({
      ownerUserId: userId,
      title,
      targetQty: Math.max(1, Math.floor(Number(body?.targetQty) || 1)),
      durationMinutes: Math.max(1, Math.floor(Number(body?.durationMinutes) || 60))
    });
    return c.json({ ok: true, campaign });
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown error";
    return c.json({ error: message }, 400);
  }
});

groupbuyRoutes.post("/campaigns/:id/tick", async (c) => {
  const userId = c.get("vlueUserId") as string;
  const body = (await c.req.json<{ soldQtyDelta?: number }>().catch(() => ({}))) as { soldQtyDelta?: number };
  const tick = tickGroupBuyCampaign(c.req.param("id"), userId, Math.floor(Number(body?.soldQtyDelta) || 1));
  if (!tick) return c.json({ error: "campaign not found" }, 404);
  return c.json({ ok: true, tick });
});

groupbuyRoutes.get("/campaigns/:id/tick", async (c) => {
  const tick = getGroupBuyTick(c.req.param("id"));
  if (!tick) return c.json({ error: "campaign not found" }, 404);
  return c.json({ ok: true, tick });
});

