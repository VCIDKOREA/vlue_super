import { Hono } from "hono";
import { requireUserHeader } from "../middleware/cardGate.js";

export const spaceGuideRoutes = new Hono();

spaceGuideRoutes.use("*", requireUserHeader);

const SYSTEM_PROMPT = [
  "너는 현장 광학 스캔의 짧은 방향 안내자다.",
  "입력된 좌표와 참고 지표만 사용하고, 사람 식별·장비 단정·범죄 단정은 하지 마라.",
  "전파·음향 값은 참고일 뿐 어떤 장치의 존재로 말하지 마라.",
  "한국어 한 문장, 80자 안으로 방향 또는 줌인만 안내하라.",
  "JSON만 반환: {\"guide\":\"문장\"}"
].join("\n");

spaceGuideRoutes.post("/guide", async (c) => {
  const body = await c.req.json().catch(() => ({} as Record<string, unknown>));
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return c.json({ ok: false, error: "gemini_unavailable" }, 503);
  const model = process.env.GEMINI_MODEL?.trim() || "gemini-1.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(12000),
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ role: "user", parts: [{ text: JSON.stringify(body).slice(0, 2000) }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 120, responseMimeType: "application/json" }
      })
    });
    if (!res.ok) return c.json({ ok: false, error: "gemini_http" }, 502);
    const data = (await res.json()) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
    const raw = data.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("") || "";
    const match = raw.match(/\{[\s\S]*\}/);
    const parsed = match ? (JSON.parse(match[0]) as { guide?: string }) : null;
    const guide = String(parsed?.guide || "").trim();
    if (!guide) return c.json({ ok: false, error: "empty" }, 502);
    return c.json({ ok: true, guide: guide.slice(0, 180), source: "gemini" });
  } catch (err) {
    console.warn("[space] guide failed", err);
    return c.json({ ok: false, error: "guide_failed" }, 502);
  }
});
