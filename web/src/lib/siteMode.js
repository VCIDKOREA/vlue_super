/**
 * www.vlue.kr(마케팅) vs /app(슈퍼앱) 셸 분기
 * - /app: Electron(VLUE-PC-App UA) · 모바일/PC 네이티브만 허용
 * - 순수 웹 브라우저 → BrowserAppBlockedPage (다운로드 안내)
 */

import {
  hasVluePcAppUserAgent,
  isBrowserAppAccessAllowed,
  shouldBlockBrowserAppShell
} from "./vlueClientAccess.js";

export { hasVluePcAppUserAgent, isBrowserAppAccessAllowed, shouldBlockBrowserAppShell };

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

/** Android WebView · iOS 셸 · PC 설치형(Electron UA 포함) 클라이언트 */
export function isNativeVlueClient() {
  if (typeof window === "undefined") return false;
  if (hasVluePcAppUserAgent()) return true;
  if (window.vlueElectron?.isElectron) return true;
  if (window.VlueFamilyBridgeNative) return true;
  if (window.vluePcAgentShell) return true;
  if (String(import.meta.env.VITE_ALLOW_BROWSER_APP || "").trim() === "true") return true;
  return false;
}

/**
 * 순수 웹 브라우저에서 /app 슈퍼앱 셸 차단 (로컬·프로덕션 공통)
 */
export function isBrowserAppShellBlocked(pathname = "") {
  return shouldBlockBrowserAppShell(pathname);
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

  /** Electron PC 앱 — file:// 로드 시 pathname이 /app 이 아니므로 UA 기준으로 앱 셸 고정 */
  if (hasVluePcAppUserAgent() || (typeof window !== "undefined" && window.vlueElectron?.isElectron)) {
    if (isBrowserAppShellBlocked("/app")) return "blocked";
    return "app";
  }

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
