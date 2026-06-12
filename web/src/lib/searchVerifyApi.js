import { apiUrl } from "./apiBase.js";

/**
 * GET /api/v1/search/verify?keyword=
 * @param {string} keyword
 * @param {{ latitude?: number|null, longitude?: number|null }} [location]
 * @returns {Promise<{ status: string, data?: object, message?: string }>}
 */
export async function verifySearchKeyword(keyword, location) {
  const q = String(keyword || "").trim();
  if (!q) return { status: "error", message: "검색어가 필요합니다." };

  const params = new URLSearchParams({ keyword: q, _ts: String(Date.now()) });
  const lat = Number(location?.latitude);
  const lng = Number(location?.longitude);
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    params.set("user_lat", String(lat));
    params.set("user_lng", String(lng));
  }

  const res = await fetch(apiUrl(`/api/v1/search/verify?${params.toString()}`), { cache: "no-store" });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    return {
      status: "error",
      message: json.message || json.error || `검증 API 오류 (${res.status})`
    };
  }
  return json;
}
