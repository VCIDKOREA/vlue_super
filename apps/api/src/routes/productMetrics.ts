import { Hono } from "hono";
import { resolveRequestUserId } from "../lib/authContext.js";
import {
  getAdminProductMetrics,
  recordProductMetricEvent
} from "../services/admin/adminProductMetrics.js";

/**
 * POST /api/metrics/events — 클라이언트 제품 지표 수집 (로그인 선택)
 * body: { eventType, targetUserId?, source?, meta? }
 */
export const productMetricsRoutes = new Hono();

productMetricsRoutes.post("/events", async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as {
    eventType?: string;
    targetUserId?: string;
    source?: string;
    meta?: unknown;
  };
  const userId = await resolveRequestUserId(c);
  const result = await recordProductMetricEvent({
    eventType: String(body.eventType || ""),
    userId,
    targetUserId: body.targetUserId,
    source: body.source,
    meta: body.meta
  });
  /* 클라이언트는 fire-and-forget — 수집 실패여도 200 */
  if (!result.ok && result.error === "INVALID_EVENT_TYPE") {
    return c.json({ error: result.error }, 400);
  }
  return c.json({ ok: Boolean(result.ok) });
});
