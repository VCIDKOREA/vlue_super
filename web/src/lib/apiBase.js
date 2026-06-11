/** Railway 스테이징 — @vlue/web 과 @vlue/api 가 서로 다른 호스트 */
const RAILWAY_WEB_HOST = "vlueweb-production.up.railway.app";
const RAILWAY_API_BASE = "https://vlueapi-production.up.railway.app";

/**
 * API 베이스 URL — VITE_API_URL 이 비어 있으면 동일 오리진(예: Vite 프록시 /api) 사용.
 * LAN에서 프론트만 열었을 때도 상대 경로 `/api/...` 로 요청 가능.
 */
export function getApiBase() {
  if (typeof window !== "undefined") {
    const host = window.location?.hostname || "";
    /* Railway 웹 호스트에서는 api.vlue.kr 미연결 시에도 페어링된 API 로 고정 */
    if (host === RAILWAY_WEB_HOST) {
      return RAILWAY_API_BASE;
    }
  }

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
