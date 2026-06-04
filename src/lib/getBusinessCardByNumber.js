import { apiUrl } from "./apiBase.js";
import { vlueAuthFetch, vlueAuthHeaders } from "./vlueAuthHeaders.js";

/**
 * §3 — `GET /api/cards/by-number` 클라이언트 헬퍼 (웹·네이티브 공용 로직 분리)
 * @param {string} raw 전화번호 임의 형식
 * @returns {Promise<object|null>}
 */
export async function getBusinessCardByNumber(raw) {
  const q = encodeURIComponent(String(raw || "").trim());
  if (!q) return null;
  try {
    const res = await vlueAuthFetch(apiUrl(`/api/cards/by-number?number=${q}`), {
      headers: vlueAuthHeaders()
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, status: res.status, ...data };
    return { ok: true, ...data };
  } catch {
    return null;
  }
}
