import { isVlueKidsApp } from "./vlueKidsApp.js";

/**
 * Play 배포 WebView(네이티브 셸) — 외부 결제 유도·인앱 PG 노출 금지.
 * 마케팅 www 브라우저에서는 false.
 */
export function isPlayDistributedWebView() {
  if (typeof window === "undefined") return false;
  if (isVlueKidsApp()) return true;
  try {
    if (window.Android || window.VlueLettering || window.VlueAndroid) return true;
  } catch {
    /* ignore */
  }
  const ua = String(navigator.userAgent || "");
  if (/VlueAndroid|VLUE\//i.test(ua)) return true;
  return false;
}

/** Play 빌드에서는 결제/업그레이드 CTA 숨김 — 권한 조회만 */
export function canShowInAppPaymentUi() {
  return !isPlayDistributedWebView();
}
