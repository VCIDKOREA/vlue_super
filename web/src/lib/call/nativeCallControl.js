/**
 * 네이티브 통화 제어 브릿지 — 응답 / 종료 / 오버레이 전체화면
 */

function callBridge(method, ...args) {
  try {
    const vl = window.VlueLettering;
    if (vl && typeof vl[method] === "function") {
      return vl[method](...args);
    }
  } catch {
    /* ignore */
  }
  try {
    const a = window.Android;
    if (a && typeof a[method] === "function") {
      return a[method](...args);
    }
  } catch {
    /* ignore */
  }
  return undefined;
}

/** 수신 중 전화 받기 (Telecom acceptRingingCall) */
export function nativeAnswerCall() {
  const r = callBridge("answerCall");
  return r !== false;
}

/** 통화 즉시 종료 (Telecom endCall) + 오버레이 닫기 */
export function nativeEndCall() {
  const ended = callBridge("endCall");
  try {
    callBridge("dismissOverlay");
  } catch {
    /* ignore */
  }
  return ended !== false;
}

/** 거절 — 종료와 동일 경로 (링잉 중 endCall) */
export function nativeRejectCall() {
  return nativeEndCall();
}

/**
 * 시스템 오버레이를 전체화면(MATCH_PARENT)으로 확장
 * @param {boolean} fullscreen
 */
export function nativeSetOverlayFullscreen(fullscreen) {
  callBridge("setOverlayFullscreen", fullscreen ? "1" : "0");
}

export function nativeDismissOverlay() {
  callBridge("dismissOverlay");
}

/** 브릿지 존재 여부 */
export function hasNativeCallControl() {
  return Boolean(
    window.VlueLettering?.endCall ||
      window.Android?.endCall ||
      window.VlueLettering?.dismissOverlay ||
      window.Android?.dismissOverlay
  );
}
