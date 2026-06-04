import { Hono } from "hono";
import { requireUserHeader } from "../middleware/cardGate.js";
import {
  deactivateVmingRoom,
  getRoomConsentStatus,
  requestVmingConsent,
  respondVmingConsent,
  withdrawVmingConsent,
  type ConsentMode
} from "../services/vming/consent/vmingConsentService.js";

export const vmingConsentRoutes = new Hono();

vmingConsentRoutes.use("*", requireUserHeader);

vmingConsentRoutes.get("/status", async (c) => {
  const roomId = c.req.query("roomId") || "";
  if (!roomId) return c.json({ error: "roomId required" }, 400);
  const status = await getRoomConsentStatus(roomId);
  return c.json({ ok: true, ...status });
});

vmingConsentRoutes.post("/request", async (c) => {
  try {
    const userId = c.get("vlueUserId") as string;
    const body = await c.req.json<{
      roomId?: string;
      consentMode?: ConsentMode;
      validityDays?: number;
      sessionOnly?: boolean;
      requesterName?: string;
      members?: Array<{ userId: string; userName?: string }>;
    }>();
    const roomId = String(body.roomId || "").trim();
    if (!roomId) return c.json({ error: "roomId required" }, 400);
    const result = await requestVmingConsent({
      roomId,
      requestedBy: userId,
      consentMode: body.consentMode || "all",
      validityDays: body.validityDays ?? 90,
      sessionOnly: Boolean(body.sessionOnly),
      requesterName: body.requesterName,
      memberUserIds: body.members
    });
    return c.json({ ok: true, ...result });
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : "unknown" }, 400);
  }
});

vmingConsentRoutes.post("/respond", async (c) => {
  try {
    const userId = c.get("vlueUserId") as string;
    const body = await c.req.json<{
      roomId?: string;
      status?: "accepted" | "declined";
      ipAddress?: string;
      deviceInfo?: string;
    }>();
    const roomId = String(body.roomId || "").trim();
    if (!roomId || !body.status) return c.json({ error: "roomId and status required" }, 400);
    const status = await respondVmingConsent({
      roomId,
      userId,
      status: body.status,
      ipAddress: body.ipAddress,
      deviceInfo: body.deviceInfo || c.req.header("user-agent")
    });
    return c.json({ ok: true, ...status });
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : "unknown" }, 400);
  }
});

vmingConsentRoutes.post("/withdraw", async (c) => {
  try {
    const userId = c.get("vlueUserId") as string;
    const body = await c.req.json<{ roomId?: string }>();
    const roomId = String(body.roomId || "").trim();
    if (!roomId) return c.json({ error: "roomId required" }, 400);
    const status = await withdrawVmingConsent({ roomId, userId });
    return c.json({ ok: true, ...status });
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : "unknown" }, 400);
  }
});

vmingConsentRoutes.post("/evict", async (c) => {
  try {
    const userId = c.get("vlueUserId") as string;
    const body = await c.req.json<{ roomId?: string }>();
    const roomId = String(body.roomId || "").trim();
    if (!roomId) return c.json({ error: "roomId required" }, 400);
    await deactivateVmingRoom(roomId, userId, "host_evicted_vming");
    return c.json({ ok: true, message: "브이밍이 퇴장했고 분석 데이터가 삭제되었습니다." });
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : "unknown" }, 400);
  }
});
