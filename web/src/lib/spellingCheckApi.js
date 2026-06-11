import { apiUrl } from "./apiBase.js";
import { vlueAuthFetch } from "./vlueAuthHeaders.js";

/** Layer 2 — POST /api/v1/spell/check (인증만, 전 회원) */
export async function postSpellingCheck(text, draftText = "") {
  const trimmed = String(text || "").trim();
  if (!trimmed) {
    return { corrected_text: "", source: "empty" };
  }

  console.info("[spelling] api request", { len: trimmed.length });

  const res = await vlueAuthFetch(apiUrl("/api/v1/spell/check"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: trimmed, draftText: String(draftText || "").trim() })
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    console.error("[spelling] api error", res.status, errBody);
    throw new Error(errBody?.error || "맞춤법 검사에 실패했습니다.");
  }

  const data = await res.json();
  console.info("[spelling] api success", { source: data.source });
  return {
    corrected_text: data.corrected_text || trimmed,
    source: data.source || "server",
    cacheHit: Boolean(data.cacheHit)
  };
}
