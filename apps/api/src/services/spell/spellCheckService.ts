import { sanitizeTranslationPacket } from "../translate/geminiTranslateReview.js";

const SPELL_SYSTEM = `You are a Korean spelling and spacing corrector.
Task: Fix only spelling, spacing, and obvious typos in Korean text. Do not change tone or meaning.
Constraint: Return ONLY JSON: {"corrected_text":"결과문장"}. No explanations.`;

const memoryCache = new Map<string, { corrected: string; at: number }>();
const CACHE_TTL_MS = 1000 * 60 * 60 * 12;

function cacheKey(text: string) {
  return text;
}

function readCache(key: string): string | null {
  const row = memoryCache.get(key);
  if (!row) return null;
  if (Date.now() - row.at > CACHE_TTL_MS) {
    memoryCache.delete(key);
    return null;
  }
  return row.corrected;
}

function writeCache(key: string, corrected: string) {
  memoryCache.set(key, { corrected, at: Date.now() });
}

function parseCorrectedJson(raw: string): string | null {
  const trimmed = raw.trim();
  try {
    const j = JSON.parse(trimmed) as { corrected_text?: string };
    if (j.corrected_text) return j.corrected_text.trim();
  } catch {
    /* extract */
  }
  const m = trimmed.match(/\{"corrected_text"\s*:\s*"([^"]+)"\}/);
  return m?.[1]?.trim() || null;
}

export async function correctSpellingGemini(input: {
  text: string;
  draftText?: string;
}): Promise<{ corrected_text: string; source: "gemini" | "cache" | "draft"; cacheHit: boolean }> {
  const text = sanitizeTranslationPacket(input.text);
  const draft = sanitizeTranslationPacket(input.draftText || "");
  if (!text) {
    return { corrected_text: "", source: "draft", cacheHit: false };
  }

  const cached = readCache(text);
  if (cached) {
    console.info("[spelling:api] cache hit");
    return { corrected_text: cached, source: "cache", cacheHit: true };
  }

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    console.warn("[spelling:api] GEMINI_API_KEY missing — draft fallback");
    return { corrected_text: draft || text, source: "draft", cacheHit: false };
  }

  const model = process.env.GEMINI_MODEL?.trim() || "gemini-1.5-flash";
  const userPrompt = draft ? `Text:\n${text}\n\nDraft:\n${draft}` : `Text:\n${text}`;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SPELL_SYSTEM }] },
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
        generationConfig: { maxOutputTokens: 180, temperature: 0.1 }
      })
    });

    const data = (await res.json().catch(() => ({}))) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      error?: { message?: string };
    };

    if (!res.ok) {
      console.error("[spelling:api] gemini error", data.error?.message || res.status);
      return { corrected_text: draft || text, source: "draft", cacheHit: false };
    }

    const raw = data.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("").trim() || "";
    const corrected = parseCorrectedJson(raw) || draft || text;
    writeCache(text, corrected);
    console.info("[spelling:api] gemini ok");
    return { corrected_text: corrected, source: "gemini", cacheHit: false };
  } catch (e) {
    console.error("[spelling:api] gemini fetch failed", e);
    return { corrected_text: draft || text, source: "draft", cacheHit: false };
  }
}
