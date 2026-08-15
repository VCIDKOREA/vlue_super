import { Hono } from "hono";
import { requireUserHeader } from "../middleware/cardGate.js";
import {
  activateDccAgentProfile,
  createDccAgentProfile,
  deleteDccAgentProfile,
  listDccAgentProfiles,
  updateDccAgentProfile,
  type DccAgentInput
} from "../services/dcc/dccAgentProfileService.js";

type Vars = { vlueUserId: string };

export const dccAgentProfileRoutes = new Hono<{ Variables: Vars }>();

dccAgentProfileRoutes.use("*", requireUserHeader);

function httpError(e: unknown) {
  const status = typeof (e as { status?: number })?.status === "number" ? (e as { status: number }).status : 400;
  const message = e instanceof Error ? e.message : "요청을 처리하지 못했습니다.";
  return { status: status as 400 | 404 | 503, body: { ok: false as const, error: message } };
}

/** GET /api/cards/dcc-agent-profiles */
dccAgentProfileRoutes.get("/", async (c) => {
  try {
    const data = await listDccAgentProfiles(c.get("vlueUserId"));
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
  try {
    const profile = await activateDccAgentProfile(c.get("vlueUserId"), c.req.param("id"));
    return c.json({ ok: true, profile });
  } catch (e) {
    const { status, body } = httpError(e);
    return c.json(body, status);
  }
});
