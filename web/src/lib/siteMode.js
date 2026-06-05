/**
 * www.vlue.kr(마케팅) vs /app(슈퍼앱) 셸 분기
 * - 프로덕션: www.vlue.kr / vlue.kr → 마케팅, /app/* → 앱
 * - 로컬: http://localhost:5173/ → 마케팅, http://localhost:5173/app → 앱
 */

export const APP_BASE_PATH = "/app";

/** 앱 셸로 보낼 경로 prefix */
export function isAppShellPath(pathname = "") {
  const p = String(pathname || "");
  if (p === APP_BASE_PATH || p.startsWith(`${APP_BASE_PATH}/`)) return true;
  return false;
}

export function isMarketingHost(hostname = "") {
  const h = String(hostname || "").toLowerCase();
  return h === "www.vlue.kr" || h === "vlue.kr";
}

/**
 * @returns {"marketing" | "app"}
 */
export function resolveSiteShell() {
  if (typeof window === "undefined") return "marketing";

  const forced = String(import.meta.env.VITE_SITE_SHELL || "").trim().toLowerCase();
  if (forced === "www" || forced === "marketing" || forced === "web") return "marketing";
  if (forced === "app") return "app";

  const { pathname, hostname } = window.location;
  if (isAppShellPath(pathname)) return "app";
  if (isMarketingHost(hostname)) return "marketing";

  const local =
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    /^192\.168\.\d+\.\d+$/.test(hostname);
  if (local) return isAppShellPath(pathname) ? "app" : "marketing";

  return isAppShellPath(pathname) ? "app" : "marketing";
}

export function appEntryUrl(path = "") {
  const sub = path.startsWith("/") ? path : path ? `/${path}` : "";
  const base = `${APP_BASE_PATH}${sub}`.replace(/\/+/g, "/");
  if (typeof window !== "undefined") return `${window.location.origin}${base}`;
  return base;
}
