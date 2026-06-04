import { Hono } from "hono";
import { requireUserHeader } from "../middleware/cardGate.js";
import { createLiveEndpoint, getEmbedMeta } from "../services/live/liveService.js";

export const liveRoutes = new Hono();
liveRoutes.use("*", requireUserHeader);

liveRoutes.post("/endpoints", async (c) => {
  try {
    const userId = c.get("vlueUserId") as string;
    const body = (await c.req.json<{ platform?: string }>().catch(() => ({}))) as { platform?: string };
    const endpoint = createLiveEndpoint(userId, String(body?.platform || "vlue"));
    return c.json({ ok: true, endpoint });
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown error";
    return c.json({ error: message }, 400);
  }
});

liveRoutes.get("/embed/:platform/:streamId", async (c) => {
  const meta = getEmbedMeta(c.req.param("platform"), c.req.param("streamId"));
  if (!meta) return c.json({ error: "stream not found" }, 404);
  return c.json({ ok: true, embed: meta });
});

