import { Hono } from "hono";
import { requireUserHeader } from "../middleware/cardGate.js";
import { parseBizcardWithGemini } from "../services/bizcard/bizcardStructuredParse.js";
import { scoreBizcardTrust } from "../services/bizcard/bizcardTrustScore.js";

export const bizcardScanRoutes = new Hono();

bizcardScanRoutes.use("*", requireUserHeader);

bizcardScanRoutes.post("/scan", async (c) => {
  const body = await c.req.json().catch(() => ({} as { text?: string; imageBase64?: string; mimeType?: string }));
  const text = String(body.text || "").trim();
  const imageBase64 = String(body.imageBase64 || "").trim();
  if (!text && !imageBase64) {
    return c.json({ error: "명함 텍스트 또는 이미지가 필요합니다." }, 400);
  }
  try {
    const parsed = await parseBizcardWithGemini({
      text,
      imageBase64,
      mimeType: body.mimeType
    });
    if (!parsed) {
      return c.json({ ok: false, error: "gemini_unavailable" }, 503);
    }
    const trust = await scoreBizcardTrust(parsed.fields);
    return c.json({
      ok: true,
      provider: parsed.provider,
      card: parsed.fields,
      trust
    });
  } catch (err) {
    console.warn("[bizcard] scan failed", err);
    return c.json({ ok: false, error: "scan_failed" }, 502);
  }
});
