/**
 * VLUE 앱·PC 다운로드 URL 및 클릭 핸들링 (마케팅 홈 · BrowserAppBlockedPage 공통)
 */

import { getVlueDownloadLinks } from "./vlueClientAccess.js";
import { VLUE_PC_INSTALLER_FILENAME } from "./vluePcInstaller.js";
import { isWebPcDownloadEnabled } from "./v1ReleaseScope.js";

export const VLUE_PC_WINDOWS_FILENAME = VLUE_PC_INSTALLER_FILENAME;
export const VLUE_APP_VERSION = "1.0.0";

const UNAVAILABLE = {
  windows: isWebPcDownloadEnabled()
    ? "VLUE PC(Windows) 설치 파일을 준비 중입니다.\n잠시 후 다시 시도해 주세요."
    : "PC 버전은 V2(채팅 연동) 업데이트에서 제공될 예정입니다.",
  mac: isWebPcDownloadEnabled()
    ? "VLUE PC(macOS) 버전은 준비 중입니다."
    : "PC 버전은 V2(채팅 연동) 업데이트에서 제공될 예정입니다.",
  playStore: "Google Play 스토어 출시 준비 중입니다.",
  appStore: "App Store 출시 준비 중입니다."
};

/** @typedef {"windows" | "mac" | "playStore" | "appStore"} VlueDownloadPlatform */

/**
 * @param {string} url
 * @param {string} [filename]
 */
function triggerFileDownload(url, filename = VLUE_PC_WINDOWS_FILENAME) {
  let sameOrigin = false;
  try {
    sameOrigin = new URL(url, window.location.href).origin === window.location.origin;
  } catch {
    /* ignore */
  }

  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.rel = "noopener noreferrer";
  if (sameOrigin) {
    anchor.download = filename;
    anchor.setAttribute("download", filename);
  } else {
    anchor.target = "_blank";
  }
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

/**
 * @param {VlueDownloadPlatform} platform
 * @returns {boolean} 다운로드·이동을 시도했으면 true
 */
export function openVlueDownload(platform) {
  if (typeof window === "undefined") return false;

  const links = getVlueDownloadLinks();
  /** @type {Record<VlueDownloadPlatform, { url: string; ready: boolean }>} */
  const targets = {
    windows: { url: links.pcWindows, ready: links.pcWindowsReady },
    mac: { url: links.pcMac, ready: links.pcMacReady },
    playStore: { url: links.playStore, ready: links.playStoreReady },
    appStore: { url: links.appStore, ready: links.appStoreReady }
  };

  const target = targets[platform];
  if (!target?.ready || !target.url) {
    window.alert(UNAVAILABLE[platform] || "다운로드 준비 중입니다.");
    return false;
  }

  if (target.url.includes("#download")) {
    window.location.assign(target.url);
    return true;
  }

  if (platform === "windows") {
    triggerFileDownload(target.url, VLUE_PC_WINDOWS_FILENAME);
    return true;
  }

  const isInstaller = /\.(exe|dmg|msi|zip)(\?|#|$)/i.test(target.url);
  if (isInstaller) {
    triggerFileDownload(target.url, VLUE_PC_WINDOWS_FILENAME);
    return true;
  }

  const anchor = document.createElement("a");
  anchor.href = target.url;
  anchor.rel = "noopener noreferrer";
  anchor.target = "_blank";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  return true;
}

export { getVlueDownloadLinks };
