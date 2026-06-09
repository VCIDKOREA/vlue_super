import { wipeLocalPosScanSession } from "./localPosLedger.js";
import { wipePosScanCacheNative } from "./posBillNativeOcr.js";

/** STAFF — 서버 동기화 후 로컬 이미지·OCR·캐시 영구 삭제 (Zero-Retention) */
export function wipeStaffScanArtifacts(pageDataUrls = []) {
  for (const url of pageDataUrls) {
    if (typeof url === "string" && url.startsWith("blob:")) {
      try {
        URL.revokeObjectURL(url);
      } catch {
        /* ignore */
      }
    }
  }
  wipeLocalPosScanSession();
  wipePosScanCacheNative();
  try {
    window.VlueFamilyBridgeNative?.wipePosScanCache?.();
  } catch {
    /* ignore */
  }
}
