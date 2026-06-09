/** Android ML Kit · iOS Vision OCR — POS 빌지 dataUrl → 텍스트 자동 주입 */
import { isIosShell, requestIosRestrictedNotice } from "./familyPlatformCapabilities.js";

let ocrWaiter = null;

export function registerPosOcrBridge() {
  if (typeof window === "undefined") return;
  const prev = window.VlueFamilyBridge || {};
  window.VlueFamilyBridge = {
    ...prev,
    onPosOcrResult: (text) => {
      const t = typeof text === "string" ? text : String(text || "");
      if (ocrWaiter) {
        ocrWaiter.resolve(t);
        ocrWaiter = null;
      }
    }
  };
}

export function hasNativePosOcr() {
  try {
    return Boolean(window.VlueFamilyBridgeNative?.runPosBillOcr);
  } catch {
    return false;
  }
}

export function runNativePosBillOcr(dataUrl, timeoutMs = 18000) {
  return new Promise((resolve) => {
    const native = window.VlueFamilyBridgeNative;
    if (!native?.runPosBillOcr || !dataUrl) {
      resolve("");
      return;
    }
    const timer = setTimeout(() => {
      ocrWaiter = null;
      resolve("");
    }, timeoutMs);
    ocrWaiter = {
      resolve: (text) => {
        clearTimeout(timer);
        resolve(text || "");
      }
    };
    try {
      native.runPosBillOcr(String(dataUrl));
    } catch {
      clearTimeout(timer);
      ocrWaiter = null;
      resolve("");
    }
  });
}

export function wipePosScanCacheNative() {
  try {
    window.VlueFamilyBridgeNative?.wipePosScanCache?.();
    return true;
  } catch {
    return false;
  }
}

export function openNotificationAccessSettings() {
  if (isIosShell()) {
    requestIosRestrictedNotice("bankNotification");
    return false;
  }
  try {
    window.VlueFamilyBridgeNative?.openNotificationAccessSettings?.();
    return true;
  } catch {
    return false;
  }
}
