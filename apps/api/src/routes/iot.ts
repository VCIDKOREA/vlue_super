import { Hono } from "hono";
import { requireUserHeader } from "../middleware/cardGate.js";
import { createRemoteJob, getRemoteJob, openPcAgentSession } from "../services/iot/iotService.js";

export const iotRoutes = new Hono();
iotRoutes.use("*", requireUserHeader);

iotRoutes.post("/pc-agent/session", async (c) => {
  const userId = c.get("vlueUserId") as string;
  const body = (await c.req.json<{ deviceLabel?: string }>().catch(() => ({}))) as { deviceLabel?: string };
  const session = openPcAgentSession(userId, String(body?.deviceLabel || "pc-agent"));
  return c.json({ ok: true, session });
});

iotRoutes.post("/print-jobs", async (c) => {
  const userId = c.get("vlueUserId") as string;
  const body = await c.req.json<{ targetLine?: string; sourceAssetId?: string }>();
  const job = createRemoteJob({
    userId,
    type: "print",
    targetLine: String(body.targetLine || ""),
    sourceAssetId: String(body.sourceAssetId || "")
  });
  return c.json({ ok: true, job });
});

iotRoutes.post("/fax-jobs", async (c) => {
  const userId = c.get("vlueUserId") as string;
  const body = await c.req.json<{ targetLine?: string; sourceAssetId?: string }>();
  const job = createRemoteJob({
    userId,
    type: "fax",
    targetLine: String(body.targetLine || ""),
    sourceAssetId: String(body.sourceAssetId || "")
  });
  return c.json({ ok: true, job });
});

iotRoutes.get("/jobs/:jobId", async (c) => {
  const job = getRemoteJob(c.req.param("jobId"));
  if (!job) return c.json({ error: "job not found" }, 404);
  return c.json({ ok: true, job });
});

