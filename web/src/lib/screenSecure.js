/**
 * 민감 화면(스캔·문서·매출) 구간만 스크린 캡처 차단
 * Android: FLAG_SECURE (WebView 브릿지)
 * 웹 브라우저: OS 캡처 차단 불가 — 네이티브 앱에서만 완전 차단
 */

let secureDepth = 0;

function applyNativeSecure(on) {
  if (typeof window === "undefined") return;
  try {
    window.VlueFamilyBridgeNative?.setSensitiveScreenSecure?.(on ? "1" : "0");
  } catch {
    /* ignore */
  }
}

/** 민감 오버레이 열림 — 중첩 시 참조 카운트 */
export function acquireSensitiveScreenSecure() {
  secureDepth += 1;
  if (secureDepth === 1) applyNativeSecure(true);
}

/** 민감 오버레이 닫힘 */
export function releaseSensitiveScreenSecure() {
  secureDepth = Math.max(0, secureDepth - 1);
  if (secureDepth === 0) applyNativeSecure(false);
}
