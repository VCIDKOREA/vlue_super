import { Hono } from "hono";
import { requireUserHeader } from "../middleware/cardGate.js";
import { correctSpellingGemini } from "../services/spell/spellCheckService.js";

export const spellV1Routes = new Hono();

spellV1Routes.use("*", requireUserHeader);

/** 맞춤법 검사 — 전 회원, 로컬 미해결 시 Gemini */
spellV1Routes.post("/check", async (c) => {
  const body = (await c.req.json<{ text?: string; draftText?: string }>().catch(() => ({}))) as {
    text?: string;
    draftText?: string;
  };

  const userId = c.get("vlueUserId") as string;
  console.info("[spelling:api] check request", { userId, len: String(body.text || "").length });

  const result = await correctSpellingGemini({
    text: body.text || "",
    draftText: body.draftText
  });

  return c.json({
    ok: true,
    corrected_text: result.corrected_text,
    source: result.source,
    cacheHit: result.cacheHit
  });
});
