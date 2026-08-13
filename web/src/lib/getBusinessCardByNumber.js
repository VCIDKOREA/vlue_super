import { apiUrl } from "./apiBase.js";
import { vlueAuthFetch, vlueAuthHeaders } from "./vlueAuthHeaders.js";

/**
 * §3 — `GET /api/cards/by-number` 클라이언트 헬퍼 (웹·네이티브 공용 로직 분리)
 * @param {string} raw 전화번호 임의 형식
 * @returns {Promise<object|null>}
 */
export async function getBusinessCardByNumber(raw, opts = {}) {
  const number = String(raw || "").trim();
  if (!number) return null;
  try {
    const params = new URLSearchParams({ number });
    const route = String(opts.dcpRoute || "").trim();
    if (route) params.set("dcp_route", route);
    const res = await vlueAuthFetch(apiUrl(`/api/cards/by-number?${params.toString()}`), {
      headers: vlueAuthHeaders()
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, status: res.status, ...data };
    return { ok: true, ...data };
  } catch {
    return null;
  }
}
