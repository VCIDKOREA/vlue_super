import { Hono } from "hono";
import { requireUserHeader } from "../middleware/cardGate.js";
import { analyzeChatMessage } from "../services/fraud/fraudAnalyzeService.js";
import {
  downloadFraudEvidenceAfterVerify,
  generateFraudEvidence,
  listFraudEvidenceForUser,
  submitFraudReport,
  verifyFraudHash
} from "../services/fraud/fraudEvidenceService.js";

export const fraudRoutes = new Hono();

fraudRoutes.use("*", requireUserHeader);

fraudRoutes.post("/analyze-message", async (c) => {
  try {
    const body = await c.req.json<{
      roomId?: string;
      messageId?: string;
      senderId?: string | null;
      content?: string;
      peerUserId?: string;
    }>();
    const roomId = String(body.roomId || "");
    const messageId = String(body.messageId || "");
    const content = String(body.content || "");
    if (!roomId || !messageId) return c.json({ error: "roomId and messageId required" }, 400);
    const result = await analyzeChatMessage({
      roomId,
      messageId,
      senderId: body.senderId ?? null,
      content,
      peerUserId: body.peerUserId
    });
    return c.json({ ok: true, ...result });
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : "unknown" }, 500);
  }
});

fraudRoutes.get("/evidence/list", async (c) => {
  try {
    const userId = c.get("vlueUserId") as string;
    const items = await listFraudEvidenceForUser(userId);
    return c.json({ ok: true, items });
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : "unknown" }, 500);
  }
});

fraudRoutes.post("/evidence/download", async (c) => {
  try {
    const userId = c.get("vlueUserId") as string;
    const body = await c.req.json<{
      reportId?: string;
      certificationId?: string;
      blockchainHash?: string;
    }>();
    if (!body.reportId || !body.certificationId || !body.blockchainHash) {
      return c.json({ error: "reportId, certificationId, blockchainHash required" }, 400);
    }
    const result = await downloadFraudEvidenceAfterVerify({
      userId,
      reportId: String(body.reportId),
      certificationId: String(body.certificationId),
      blockchainHash: String(body.blockchainHash)
    });
    if (!result.ok) return c.json({ ok: false, error: result.error }, 403);
    return c.json(result);
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : "unknown" }, 500);
  }
});

fraudRoutes.post("/generate-evidence", async (c) => {
  try {
    const userId = c.get("vlueUserId") as string;
    const body = await c.req.json<{
      roomId?: string;
      fraudType?: string;
      from?: string;
      to?: string;
      passwordHint?: string;
    }>();
    const roomId = String(body.roomId || "");
    if (!roomId) return c.json({ error: "roomId required" }, 400);
    const result = await generateFraudEvidence({
      userId,
      roomId,
      fraudType: body.fraudType,
      from: body.from,
      to: body.to,
      passwordHint: body.passwordHint
    });
    return c.json({ ok: true, ...result });
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : "unknown" }, 500);
  }
});

fraudRoutes.post("/report", async (c) => {
  try {
    const userId = c.get("vlueUserId") as string;
    const body = await c.req.json<{
      reportId?: string;
      agency?: "police" | "fss" | "kisa" | "carrier";
      meta?: Record<string, unknown>;
    }>();
    if (!body.reportId || !body.agency) return c.json({ error: "reportId and agency required" }, 400);
    const result = await submitFraudReport({
      userId,
      reportId: body.reportId,
      agency: body.agency,
      meta: body.meta
    });
    return c.json(result);
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : "unknown" }, 500);
  }
});

fraudRoutes.post("/hash-verify", async (c) => {
  try {
    const userId = c.get("vlueUserId") as string;
    const body = await c.req.json<{
      certificationId?: string;
      blockchainHash?: string;
      reportId?: string;
    }>();
    const result = await verifyFraudHash({ ...body, userId });
    return c.json({ ok: true, ...result });
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : "unknown" }, 400);
  }
});
