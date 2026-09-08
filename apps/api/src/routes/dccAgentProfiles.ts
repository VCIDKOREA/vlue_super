import { Hono } from "hono";
import { requireUserHeader } from "../middleware/cardGate.js";
import {
  activateDccAgentProfile,
  assignLinesToDccProfile,
  createDccAgentProfile,
  deleteDccAgentProfile,
  listDccAgentProfiles,
  putDccProfileBundle,
  setRepresentativeDccProfile,
  updateDccAgentProfile,
  type DccAgentInput
} from "../services/dcc/dccAgentProfileService.js";

type Vars = { vlueUserId: string };

export const dccAgentProfileRoutes = new Hono<{ Variables: Vars }>();

dccAgentProfileRoutes.use("*", requireUserHeader);

function httpError(e: unknown) {
  const status = typeof (e as { status?: number })?.status === "number" ? (e as { status: number }).status : 400;
  const message = e instanceof Error ? e.message : "요청을 처리하지 못했습니다.";
  return { status: status as 400 | 402 | 404 | 503, body: { ok: false as const, error: message } };
}

/** GET /api/cards/dcc-agent-profiles */
dccAgentProfileRoutes.get("/", async (c) => {
  try {
    const cardId = String(c.req.query("cardId") || "").trim() || null;
    const data = await listDccAgentProfiles(c.get("vlueUserId"), cardId);
    return c.json({ ok: true, ...data });
  } catch (e) {
    const { status, body } = httpError(e);
    return c.json(body, status);
  }
});

/** POST /api/cards/dcc-agent-profiles */
dccAgentProfileRoutes.post("/", async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as DccAgentInput;
  try {
    const profile = await createDccAgentProfile(c.get("vlueUserId"), body);
    return c.json({ ok: true, profile }, 201);
  } catch (e) {
    const { status, body: errBody } = httpError(e);
    return c.json(errBody, status);
  }
});

/** PATCH /api/cards/dcc-agent-profiles/:id */
dccAgentProfileRoutes.patch("/:id", async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as DccAgentInput;
  try {
    const profile = await updateDccAgentProfile(c.get("vlueUserId"), c.req.param("id"), body);
    return c.json({ ok: true, profile });
  } catch (e) {
    const { status, body: errBody } = httpError(e);
    return c.json(errBody, status);
  }
});

/** DELETE /api/cards/dcc-agent-profiles/:id */
dccAgentProfileRoutes.delete("/:id", async (c) => {
  try {
    const result = await deleteDccAgentProfile(c.get("vlueUserId"), c.req.param("id"));
    return c.json(result);
  } catch (e) {
    const { status, body } = httpError(e);
    return c.json(body, status);
  }
});

/** PUT /api/cards/dcc-agent-profiles/:id/activate */
dccAgentProfileRoutes.put("/:id/activate", async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as { cardId?: string };
  try {
    const profile = await activateDccAgentProfile(
      c.get("vlueUserId"),
      c.req.param("id"),
      String(body.cardId || "").trim() || null
    );
    return c.json({ ok: true, profile });
  } catch (e) {
    const { status, body } = httpError(e);
    return c.json(body, status);
  }
});

/** PUT /api/cards/dcc-agent-profiles/:id/representative — 대표 프로필(미지정·모르는 번호 폴백) */
dccAgentProfileRoutes.put("/:id/representative", async (c) => {
  try {
    const profile = await setRepresentativeDccProfile(c.get("vlueUserId"), c.req.param("id"));
    return c.json({ ok: true, profile });
  } catch (e) {
    const { status, body } = httpError(e);
    return c.json(body, status);
  }
});

/** PUT /api/cards/dcc-agent-profiles/:id/lines — 이 프로필에 송출 번호 배정 */
dccAgentProfileRoutes.put("/:id/lines", async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as { lineIds?: string[] };
  try {
    const profile = await assignLinesToDccProfile(
      c.get("vlueUserId"),
      c.req.param("id"),
      Array.isArray(body.lineIds) ? body.lineIds : []
    );
    return c.json({ ok: true, profile });
  } catch (e) {
    const { status, body: errBody } = httpError(e);
    return c.json(errBody, status);
  }
});

/** PUT /api/cards/dcc-agent-profiles/:id/bundle — DCC·쇼케이스 번들 저장 후 배정 번호에 동기화 */
dccAgentProfileRoutes.put("/:id/bundle", async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as {
    dcc?: Record<string, unknown> | null;
    showcase?: { editor?: unknown; live?: unknown } | null;
  };
  try {
    const profile = await putDccProfileBundle(c.get("vlueUserId"), c.req.param("id"), body);
    return c.json({ ok: true, profile });
  } catch (e) {
    const { status, body: errBody } = httpError(e);
    return c.json(errBody, status);
  }
});
