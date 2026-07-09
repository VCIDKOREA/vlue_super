/**
 * 근접 센서 브릿지 — 통화 중 귀에 대면 쇼케이스 sleep/lock
 * Android: VlueShowcaseBridge.onProximityNear / onProximityFar
 */

export const SHOWCASE_PROXIMITY_EVENT = "vlue-showcase-proximity";

/** @typedef {'near' | 'far'} ProximityState */

/** @returns {ProximityState} */
export function getProximityState() {
  if (typeof window === "undefined") return "far";
  return window.__vlueProximityNear ? "near" : "far";
}

export function isProximityNear() {
  return getProximityState() === "near";
}

/** @param {(state: ProximityState) => void} handler */
export function subscribeShowcaseProximity(handler) {
  if (typeof window === "undefined") return () => {};
  const onEvent = (e) => {
    const state = e?.detail?.state === "near" ? "near" : "far";
    handler(state);
  };
  window.addEventListener(SHOWCASE_PROXIMITY_EVENT, onEvent);
  return () => window.removeEventListener(SHOWCASE_PROXIMITY_EVENT, onEvent);
}

function dispatchProximity(state) {
  if (typeof window === "undefined") return;
  window.__vlueProximityNear = state === "near";
  window.dispatchEvent(new CustomEvent(SHOWCASE_PROXIMITY_EVENT, { detail: { state } }));
}

/** 네이티브 브릿지 등록 (앱 WebView 로드 시 1회) */
export function installShowcaseProximityBridge() {
  if (typeof window === "undefined") return;
  window.VlueShowcaseBridge = window.VlueShowcaseBridge || {};
  window.VlueShowcaseBridge.onProximityNear = () => dispatchProximity("near");
  window.VlueShowcaseBridge.onProximityFar = () => dispatchProximity("far");
}
