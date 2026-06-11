import { Hono } from "hono";
import { requireUserHeader } from "../middleware/cardGate.js";
import { translateTextPacket } from "../services/translate/translateService.js";

export const translateRoutes = new Hono();

translateRoutes.use("*", requireUserHeader);

/**
 * 공통 번역 API — standard: 딕셔너리·메모리·드래프트만
 * enhanced 또는 낮은 clientConfidence: Gemini 최종 검수
 */
translateRoutes.post("/text", async (c) => {
  const body = (await c.req
    .json<{
      text?: string;
      sourceLang?: string;
      targetLang?: string;
      mode?: "standard" | "enhanced";
      draftTranslation?: string;
      clientConfidence?: number;
    }>()
    .catch(() => ({}))) as {
    text?: string;
    sourceLang?: string;
    targetLang?: string;
    mode?: "standard" | "enhanced";
    draftTranslation?: string;
    clientConfidence?: number;
  };

  const result = await translateTextPacket({
    text: body.text || "",
    sourceLang: body.sourceLang,
    targetLang: body.targetLang,
    mode: body.mode,
    draftTranslation: body.draftTranslation,
    clientConfidence: body.clientConfidence
  });

  return c.json({
    ok: true,
    translated: result.translated,
    source: result.source,
    cacheHit: result.cacheHit,
    confidence: result.confidence,
    geminiReviewed: result.geminiReviewed
  });
});
