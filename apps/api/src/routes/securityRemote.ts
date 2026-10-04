import { Hono } from "hono";
import { requireUserHeader } from "../middleware/cardGate.js";
import {
  recordRemoteSecurityHeartbeat,
  reportRemoteAppLifecycle,
  reportRemoteDetected,
  sweepRemoteSecurityHeartbeats
} from "../services/familyProtection/familyRemoteSecurityService.js";

export const securityRemoteRoutes = new Hono();

function handleError(c: { json: (body: unknown, status?: number) => Response }, path: string, err: unknown) {
  console.error(`[security] ${path}`, err);
  return c.json({ error: err instanceof Error ? err.message : "보안 API 오류" }, 500);
}

/** 1차: 원격 제어 앱 작동 감지 → 가족 푸시 + is_remote_active */
securityRemoteRoutes.post("/remote-detected", requireUserHeader, async (c) => {
  const me = c.get("vlueUserId") as string;
  const body = (await c.req.json().catch(() => ({}))) as {
    packageName?: string;
    packageId?: string;
    appLabel?: string;
    is_remote_active?: boolean;
  };
  try {
    return c.json(
      await reportRemoteDetected(me, {
        packageName: body.packageName || body.packageId,
        appLabel: body.appLabel,
        is_remote_active: body.is_remote_active
      })
    );
  } catch (err) {
    return handleError(c, "/remote-detected", err);
  }
});

/** 원격 활성 중 10초 하트비트 */
securityRemoteRoutes.post("/remote-heartbeat", requireUserHeader, async (c) => {
  const me = c.get("vlueUserId") as string;
  const body = (await c.req.json().catch(() => ({}))) as {
    is_remote_active?: boolean;
    packageName?: string;
  };
  try {
    return c.json(await recordRemoteSecurityHeartbeat(me, body));
  } catch (err) {
    return handleError(c, "/remote-heartbeat", err);
  }
});

/** 2차: 강제종료·삭제·연결중단 */
securityRemoteRoutes.post("/app-lifecycle", requireUserHeader, async (c) => {
  const me = c.get("vlueUserId") as string;
  const body = (await c.req.json().catch(() => ({}))) as {
    event?: "force_quit" | "deleted" | "disconnect";
    is_remote_active?: boolean;
  };
  const event = body.event;
  if (event !== "force_quit" && event !== "deleted" && event !== "disconnect") {
    return c.json({ error: "event 필요 (force_quit|deleted|disconnect)" }, 400);
  }
  try {
    return c.json(
      await reportRemoteAppLifecycle(me, {
        event,
        is_remote_active: body.is_remote_active
      })
    );
  } catch (err) {
    return handleError(c, "/app-lifecycle", err);
  }
});

/** 하트비트 유실 스윕 (크론·내부) */
securityRemoteRoutes.post("/remote-sweep", async (c) => {
  const secret = String(c.req.header("x-cron-secret") || c.req.query("secret") || "");
  const expected = String(process.env.CRON_SECRET || process.env.INTERNAL_CRON_SECRET || "").trim();
  if (expected && secret !== expected) {
    return c.json({ error: "unauthorized" }, 401);
  }
  try {
    return c.json(await sweepRemoteSecurityHeartbeats());
  } catch (err) {
    return handleError(c, "/remote-sweep", err);
  }
});
