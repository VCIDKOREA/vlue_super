import { Hono } from "hono";
import { resolveRequestUserId } from "../lib/authContext.js";
import {
  ingestDiagnosticEvents,
  upsertDiagnosticSession,
  type IngestEventsBody,
  type UpsertSessionInput
} from "../services/diagnostics/diagnosticsIngest.js";

/**
 * POST /api/diagnostics/sessions — 세션 upsert
 * POST /api/diagnostics/events — 이벤트 배치 (+ 선택 session)
 * 수집 실패여도 UX를 깨지 않도록 가급적 200.
 */
export const diagnosticsRoutes = new Hono();

const rateBucket = new Map<string, { n: number; t: number }>();

function rateLimit(key: string, max = 120, windowMs = 60_000): boolean {
  const now = Date.now();
  const cur = rateBucket.get(key);
  if (!cur || now - cur.t > windowMs) {
    rateBucket.set(key, { n: 1, t: now });
    return true;
  }
  if (cur.n >= max) return false;
  cur.n += 1;
  return true;
}

diagnosticsRoutes.post("/sessions", async (c) => {
  try {
    const deviceId = c.req.header("X-VLUE-Device-Id") || "anon";
    if (!rateLimit(`s:${deviceId}`)) {
      return c.json({ ok: true, throttled: true });
    }
    const body = (await c.req.json().catch(() => ({}))) as UpsertSessionInput;
    if (!body.deviceId && deviceId !== "anon") body.deviceId = deviceId;
    const userId = await resolveRequestUserId(c);
    const result = await upsertDiagnosticSession(body, userId);
    if (!result.ok) return c.json({ ok: false, error: result.error }, 400);
    return c.json({ ok: true, id: result.id });
  } catch (e) {
    console.error("[diagnostics] sessions", e);
    return c.json({ ok: false }, 200);
  }
});

diagnosticsRoutes.post("/events", async (c) => {
  try {
    const deviceId = c.req.header("X-VLUE-Device-Id") || "anon";
    if (!rateLimit(`e:${deviceId}`)) {
      return c.json({ ok: true, throttled: true, accepted: 0 });
    }
    const body = (await c.req.json().catch(() => ({}))) as IngestEventsBody;
    if (body.session && !body.session.deviceId && deviceId !== "anon") {
      body.session.deviceId = deviceId;
    }
    const userId = await resolveRequestUserId(c);
    const result = await ingestDiagnosticEvents(body, userId);
    if (!result.ok) return c.json({ ok: false, error: result.error }, 400);
    return c.json({ ok: true, sessionId: result.sessionId, accepted: result.accepted });
  } catch (e) {
    console.error("[diagnostics] events", e);
    return c.json({ ok: false, accepted: 0 }, 200);
  }
});
