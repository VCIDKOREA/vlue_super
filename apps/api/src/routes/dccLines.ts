import { Hono } from "hono";
import { requireUserHeader } from "../middleware/cardGate.js";
import {
  assignAgentToLine,
  getDccLineBundle,
  listDccLines,
  putDccLineShowcase,
  putDccLineSnapshot
} from "../services/dcc/dccLineService.js";

type Vars = { vlueUserId: string };

export const dccLineRoutes = new Hono<{ Variables: Vars }>();

dccLineRoutes.use("*", requireUserHeader);

function httpError(e: unknown) {
  const status = typeof (e as { status?: number })?.status === "number" ? (e as { status: number }).status : 400;
  const message = e instanceof Error ? e.message : "요청을 처리하지 못했습니다.";
  return { status: status as 400 | 404 | 503, body: { ok: false as const, error: message } };
}

/** GET /api/cards/dcc-lines */
dccLineRoutes.get("/", async (c) => {
  try {
    const data = await listDccLines(c.get("vlueUserId"));
    return c.json({ ok: true, ...data });
  } catch (e) {
    const { status, body } = httpError(e);
    return c.json(body, status);
  }
});

/** GET /api/cards/dcc-lines/:id */
dccLineRoutes.get("/:id", async (c) => {
  try {
    const data = await getDccLineBundle(c.get("vlueUserId"), c.req.param("id"));
    return c.json({ ok: true, ...data });
  } catch (e) {
    const { status, body } = httpError(e);
    return c.json(body, status);
  }
});

/** PUT /api/cards/dcc-lines/:id/agent */
dccLineRoutes.put("/:id/agent", async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as { agentId?: string };
  try {
    const data = await assignAgentToLine(c.get("vlueUserId"), c.req.param("id"), String(body.agentId || ""));
    return c.json({ ok: true, ...data });
  } catch (e) {
    const { status, body: errBody } = httpError(e);
    return c.json(errBody, status);
  }
});

/** PUT /api/cards/dcc-lines/:id/dcc */
dccLineRoutes.put("/:id/dcc", async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  try {
    const data = await putDccLineSnapshot(c.get("vlueUserId"), c.req.param("id"), body);
    return c.json({ ok: true, ...data });
  } catch (e) {
    const { status, body: errBody } = httpError(e);
    return c.json(errBody, status);
  }
});

/** GET /api/cards/dcc-lines/:id/showcase */
dccLineRoutes.get("/:id/showcase", async (c) => {
  try {
    const data = await getDccLineBundle(c.get("vlueUserId"), c.req.param("id"));
    return c.json({ ok: true, ...data.showcase, lineId: data.line.id });
  } catch (e) {
    const { status, body } = httpError(e);
    return c.json(body, status);
  }
});

/** PUT /api/cards/dcc-lines/:id/showcase */
dccLineRoutes.put("/:id/showcase", async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as {
    editor?: unknown;
    live?: unknown;
    liveSource?: unknown;
  };
  try {
    const data = await putDccLineShowcase(c.get("vlueUserId"), c.req.param("id"), body);
    return c.json({ ok: true, v: 2, updatedAt: data.updatedAt });
  } catch (e) {
    const { status, body: errBody } = httpError(e);
    return c.json(errBody, status);
  }
});
