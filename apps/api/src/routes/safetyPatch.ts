import { Hono } from "hono";
import { requireUserHeader } from "../middleware/cardGate.js";
import {
  buildFamilySafetyReport,
  buildTodayPatchBrief,
  completeSafetyPatch,
  isUuid,
  notifySafetyPatchExpiry,
  readSafetyPatchStatus
} from "../services/safetyPatch/safetyPatchService.js";

export const safetyPatchRoutes = new Hono();

safetyPatchRoutes.use("*", requireUserHeader);

safetyPatchRoutes.get("/status", async (c) => {
  const userId = String(c.get("vlueUserId") || "");
  if (!isUuid(userId)) return c.json({ ok: false, error: "로그인 세션이 없습니다." }, 401);
  const status = await readSafetyPatchStatus(userId);
  return c.json(status);
});

safetyPatchRoutes.post("/complete", async (c) => {
  const userId = String(c.get("vlueUserId") || "");
  if (!isUuid(userId)) return c.json({ ok: false, error: "로그인 세션이 없습니다." }, 401);
  const status = await completeSafetyPatch(userId);
  const brief = await buildTodayPatchBrief(userId).catch(() => null);
  return c.json({ ...status, brief });
});

safetyPatchRoutes.get("/brief", async (c) => {
  const userId = String(c.get("vlueUserId") || "");
  if (!isUuid(userId)) return c.json({ ok: false, error: "로그인 세션이 없습니다." }, 401);
  const brief = await buildTodayPatchBrief(userId);
  return c.json(brief);
});

/** 앱이 열려 있을 때 만료 임박 푸시를 한 번 더 확인한다. */
safetyPatchRoutes.post("/remind", async (c) => {
  const userId = String(c.get("vlueUserId") || "");
  if (!isUuid(userId)) return c.json({ ok: false, error: "로그인 세션이 없습니다." }, 401);
  const result = await notifySafetyPatchExpiry(userId);
  return c.json({ ok: true, ...result });
});

safetyPatchRoutes.post("/report", async (c) => {
  const userId = String(c.get("vlueUserId") || "");
  if (!isUuid(userId)) return c.json({ ok: false, error: "로그인 세션이 없습니다." }, 401);
  const body = (await c.req.json().catch(() => ({}))) as { targetUserId?: string; roomId?: string };
  const targetUserId = String(body.targetUserId || "").trim();
  const report = await buildFamilySafetyReport(userId, targetUserId, String(body.roomId || "").trim());
  if (!report.ok) return c.json(report, 403);
  return c.json(report);
});
