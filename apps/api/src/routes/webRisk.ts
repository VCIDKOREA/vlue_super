import { Hono } from "hono";
import { requireUserHeader } from "../middleware/cardGate.js";
import {
  lookupUriWithWebRisk,
  WEB_RISK_BLOCK_MESSAGE
} from "../services/webrisk/webRiskLookupService.js";

/**
 * Google Web Risk Lookup — 쇼케이스 커스텀 링크 등 URL 사전 검사
 * POST /api/webrisk/uris/search  { uri: string }
 */
export const webRiskRoutes = new Hono();

webRiskRoutes.use("*", requireUserHeader);

webRiskRoutes.post("/uris/search", async (c) => {
  try {
    const body = (await c.req.json().catch(() => ({}))) as { uri?: string; url?: string };
    const raw = String(body.uri || body.url || "").trim();
    if (!raw) {
      return c.json({ ok: false, safe: false, error: "uri가 필요합니다." }, 400);
    }

    const result = await lookupUriWithWebRisk(raw);

    if (!result.ok) {
      return c.json(
        {
          ok: false,
          safe: false,
          uri: result.uri,
          threatTypes: result.threatTypes,
          error: result.error || "링크 검사에 실패했습니다."
        },
        502
      );
    }

    if (!result.safe) {
      return c.json(
        {
          ok: true,
          safe: false,
          blocked: true,
          uri: result.uri,
          threatTypes: result.threatTypes,
          error: result.message || WEB_RISK_BLOCK_MESSAGE,
          message: result.message || WEB_RISK_BLOCK_MESSAGE
        },
        200
      );
    }

    return c.json({
      ok: true,
      safe: true,
      uri: result.uri,
      threatTypes: [],
      skipped: Boolean(result.skipped)
    });
  } catch (e) {
    return c.json(
      { ok: false, safe: false, error: e instanceof Error ? e.message : "unknown" },
      500
    );
  }
});
