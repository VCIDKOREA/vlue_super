import { apiUrl } from "./apiBase.js";

/**
 * GET /api/v1/search/verify?keyword=
 * @param {string} keyword
 * @returns {Promise<{ status: string, data?: object, message?: string }>}
 */
export async function verifySearchKeyword(keyword) {
  const q = String(keyword || "").trim();
  if (!q) return { status: "error", message: "검색어가 필요합니다." };

  const res = await fetch(
    apiUrl(`/api/v1/search/verify?keyword=${encodeURIComponent(q)}&_ts=${Date.now()}`),
    { cache: "no-store" }
  );
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    return {
      status: "error",
      message: json.message || json.error || `검증 API 오류 (${res.status})`
    };
  }
  return json;
}
