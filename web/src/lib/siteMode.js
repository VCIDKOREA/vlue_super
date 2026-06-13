/**
 * www.vlue.kr(마케팅) vs /app(슈퍼앱) 셸 분기
 * - 프로덕션: www.vlue.kr / vlue.kr → 마케팅, /app/* → 브라우저 차단(설치 안내)
 * - 로컬: http://localhost:5173/ → 마케팅, http://localhost:5173/app → 앱(개발)
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

/** 로컬 개발·LAN — /app 허용 */
export function isLocalDevHost(hostname = "") {
  const h = String(hostname || "").toLowerCase();
  return h === "localhost" || h === "127.0.0.1" || /^192\.168\.\d+\.\d+$/.test(h);
}

/** Android WebView · iOS 셸 · PC 설치형 클라이언트 */
export function isNativeVlueClient() {
  if (typeof window === "undefined") return false;
  if (window.VlueFamilyBridgeNative) return true;
  if (window.vluePcAgentShell) return true;
  if (String(import.meta.env.VITE_ALLOW_BROWSER_APP || "").trim() === "true") return true;
  return false;
}

/**
 * 프로덕션 웹 브라우저에서 /app 슈퍼앱 셸 차단
 */
export function isBrowserAppShellBlocked(pathname = "") {
  if (typeof window === "undefined") return false;
  const path = pathname || window.location.pathname || "";
  if (!isAppShellPath(path)) return false;
  if (isNativeVlueClient()) return false;
  if (isLocalDevHost(window.location.hostname)) return false;
  if (import.meta.env.DEV) return false;
  return true;
}

export function marketingHomeUrl() {
  if (typeof window === "undefined") return "/";
  return `${window.location.origin}/`;
}

export function marketingDownloadUrl() {
  return `${marketingHomeUrl().replace(/\/$/, "")}/#download`;
}

/**
 * @returns {"marketing" | "app" | "blocked"}
 */
export function resolveSiteShell() {
  if (typeof window === "undefined") return "marketing";

  const forced = String(import.meta.env.VITE_SITE_SHELL || "").trim().toLowerCase();
  if (forced === "www" || forced === "marketing" || forced === "web") return "marketing";
  if (forced === "app") return "app";

  const { pathname, hostname } = window.location;

  if (isAppShellPath(pathname) && isBrowserAppShellBlocked(pathname)) {
    return "blocked";
  }

  if (isAppShellPath(pathname) && (isNativeVlueClient() || !isMarketingHost(hostname))) {
    return "app";
  }
  if (isMarketingHost(hostname)) return "marketing";

  const local = isLocalDevHost(hostname);
  if (local) return isAppShellPath(pathname) ? "app" : "marketing";

  return isAppShellPath(pathname) ? "app" : "marketing";
}

export function appEntryUrl(path = "") {
  const sub = path.startsWith("/") ? path : path ? `/${path}` : "";
  const targetPath = `${APP_BASE_PATH}${sub}`.replace(/\/+/g, "/");

  if (typeof window !== "undefined") {
    if (isBrowserAppShellBlocked(targetPath)) {
      if (sub.includes("download")) return marketingDownloadUrl();
      return marketingHomeUrl();
    }
    return `${window.location.origin}${targetPath}`;
  }
  return targetPath;
}
