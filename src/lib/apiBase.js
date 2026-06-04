/**
 * API 베이스 URL — VITE_API_URL 이 비어 있으면 동일 오리진(예: Vite 프록시 /api) 사용.
 * LAN에서 프론트만 열었을 때도 상대 경로 `/api/...` 로 요청 가능.
 */
export function getApiBase() {
  const raw = String(import.meta.env.VITE_API_URL ?? "").trim().replace(/\/$/, "");
  if (raw) return raw;
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin.replace(/\/$/, "");
  }
  return "";
}

/** 절대 또는 상대 API 경로 */
export function apiUrl(path) {
  const p = path.startsWith("/") ? path : `/${path}`;
  const base = getApiBase();
  if (!base) return p;
  return `${base}${p}`;
}
