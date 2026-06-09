import { Hono } from "hono";
import { requireUserHeader } from "../middleware/cardGate.js";
import {
  confirmThreatResolved,
  getCrossFamilyDashboard,
  reportCrossFamilyThreat
} from "../services/familyProtection/familyCrossSecurityService.js";
import {
  getFamilySecurityStateDashboard,
  syncFamilySecurityState
} from "../services/familyProtection/familySecurityStateService.js";

export const familyCrossSecurityRoutes = new Hono();

familyCrossSecurityRoutes.use("*", requireUserHeader);

/** GET /api/family-cross-security/dashboard */
familyCrossSecurityRoutes.get("/dashboard", async (c) => {
  try {
    const userId = c.get("vlueUserId") as string;
    const dash = await getCrossFamilyDashboard(userId);
    return c.json({ ok: true, ...dash });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown error";
    return c.json({ error: msg }, 400);
  }
});

/** POST /api/family-cross-security/threats — 악성앱·VLUE 삭제 등 보고 */
familyCrossSecurityRoutes.post("/threats", async (c) => {
  try {
    const userId = c.get("vlueUserId") as string;
    const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
    const result = await reportCrossFamilyThreat(userId, body);
    return c.json({ ok: true, ...result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown error";
    return c.json({ error: msg }, 400);
  }
});

/** POST /api/family-cross-security/state — 배터리·보안 상태 동기화 */
familyCrossSecurityRoutes.post("/state", async (c) => {
  try {
    const userId = c.get("vlueUserId") as string;
    const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
    const result = await syncFamilySecurityState(userId, body);
    return c.json({ ok: true, ...result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown error";
    return c.json({ error: msg }, 400);
  }
});

/** GET /api/family-cross-security/state — 가족 그룹 상태 대시보드 */
familyCrossSecurityRoutes.get("/state", async (c) => {
  try {
    const userId = c.get("vlueUserId") as string;
    const dash = await getFamilySecurityStateDashboard(userId);
    return c.json({ ok: true, ...dash });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown error";
    return c.json({ error: msg }, 400);
  }
});

/** POST /api/family-cross-security/threats/:id/resolve — 삭제 완료 확인 */
familyCrossSecurityRoutes.post("/threats/:id/resolve", async (c) => {
  try {
    const userId = c.get("vlueUserId") as string;
    const incidentId = String(c.req.param("id") || "");
    const body = (await c.req.json().catch(() => ({}))) as { packageRemoved?: boolean };
    const result = await confirmThreatResolved(userId, incidentId, body.packageRemoved);
    return c.json({ ok: true, ...result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown error";
    return c.json({ error: msg }, 400);
  }
});
