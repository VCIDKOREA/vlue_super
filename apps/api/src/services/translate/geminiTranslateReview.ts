/** Gemini — 번역 최종 검수 전용 (토큰 최소화) */

export function sanitizeTranslationPacket(text: string, maxLen = 480): string {
  return String(text || "")
    .replace(/\s+/g, " ")
    .replace(/[\u0000-\u001f]/g, "")
    .trim()
    .slice(0, maxLen);
}

export async function geminiTranslateReview(input: {
  text: string;
  draftTranslation?: string;
  sourceLang: string;
  targetLang: string;
}): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return null;

  const src = sanitizeTranslationPacket(input.text);
  const draft = sanitizeTranslationPacket(input.draftTranslation || "");
  if (!src) return null;

  const model = process.env.GEMINI_MODEL?.trim() || "gemini-1.5-flash";
  const prompt = [
    `Translate ${input.sourceLang}->${input.targetLang}. Output ONLY the translation, no quotes.`,
    `SRC: ${src}`,
    draft ? `DRAFT: ${draft}` : "",
    "OUT:"
  ]
    .filter(Boolean)
    .join("\n");

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 256, temperature: 0.15 }
      })
    });
    const data = (await res.json().catch(() => ({}))) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    if (!res.ok) return null;
    const out = data.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("").trim();
    return out || null;
  } catch {
    return null;
  }
}
