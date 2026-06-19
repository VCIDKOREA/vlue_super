/**
 * VLUE 클라이언트 접근 식별 — Electron UA 토큰 · 네이티브 셸 · 브라우저 차단
 */

/** Electron main.cjs 와 동일 — User-Agent suffix */
export const VLUE_PC_APP_UA_TOKEN = "VLUE-PC-App";

function isAppShellPath(pathname = "") {
  const p = String(pathname || "");
  return p === "/app" || p.startsWith("/app/");
}

/** @returns {boolean} */
export function hasVluePcAppUserAgent() {
  if (typeof navigator === "undefined") return false;
  return String(navigator.userAgent || "").includes(VLUE_PC_APP_UA_TOKEN);
}

/** @returns {boolean} /app 셸을 이용할 수 있는 공식 클라이언트인지 */
export function isBrowserAppAccessAllowed() {
  if (typeof window === "undefined") return true;
  if (hasVluePcAppUserAgent()) return true;
  if (window.vlueElectron?.isElectron) return true;
  if (window.VlueFamilyBridgeNative) return true;
  if (window.vluePcAgentShell) return true;
  if (String(import.meta.env.VITE_ALLOW_BROWSER_APP || "").trim() === "true") return true;
  return false;
}

/**
 * 순수 웹 브라우저로 /app 직접 접근 시 차단
 * @param {string} [pathname]
 * @returns {boolean}
 */
export function shouldBlockBrowserAppShell(pathname = "") {
  if (typeof window === "undefined") return false;
  const path = pathname || window.location.pathname || "";
  if (!isAppShellPath(path)) return false;
  return !isBrowserAppAccessAllowed();
}

/** @returns {{ downloadPage: string, home: string, playStore: string, appStore: string, pcWindows: string, pcMac: string, pcWindowsReady: boolean, pcMacReady: boolean, playStoreReady: boolean, appStoreReady: boolean }} */
export function getVlueDownloadLinks() {
  const origin =
    typeof window !== "undefined" && window.location?.origin
      ? window.location.origin
      : String(import.meta.env.VITE_VLUE_LANDING_URL || "https://www.vlue.kr").replace(/\/$/, "");
  const base = origin.replace(/\/$/, "");
  const downloadPage = `${base}/#download`;
  const defaultWindowsUrl = `${base}/downloads/VLUE-Setup-1.0.0.exe`;

  const pcWindowsEnv = String(import.meta.env.VITE_VLUE_PC_WINDOWS_URL || "").trim();
  const pcMacEnv = String(import.meta.env.VITE_VLUE_PC_MAC_URL || "").trim();
  const playStoreEnv = String(import.meta.env.VITE_VLUE_PLAY_STORE_URL || "").trim();
  const appStoreEnv = String(import.meta.env.VITE_VLUE_APP_STORE_URL || "").trim();

  return {
    downloadPage,
    home: `${base}/`,
    pcWindows: pcWindowsEnv || defaultWindowsUrl,
    pcMac: pcMacEnv,
    playStore: playStoreEnv,
    appStore: appStoreEnv,
    pcWindowsReady: Boolean(pcWindowsEnv || defaultWindowsUrl),
    pcMacReady: Boolean(pcMacEnv),
    playStoreReady: Boolean(playStoreEnv),
    appStoreReady: Boolean(appStoreEnv)
  };
}
