/**
 * 네이티브 통화 제어 브릿지 — 응답 / 종료 / 음소거 / 스피커 / DTMF / 오버레이
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

/**
 * 통화 신호만 종료 — 쇼케이스 오버레이는 유지 (사후 감상)
 * Android: TelecomManager.endCall / iOS: CallKit CXEndCallAction 브릿지
 */
export function nativeEndCallKeepOverlay() {
  const ended = callBridge("endCallKeepOverlay");
  if (ended === undefined) {
    /* 구버전 브릿지: endCall이 dismiss까지 하면 폴백으로 end만 시도 불가 → dismiss 없는 경로 우선 */
    return callBridge("endCallOnly") !== false;
  }
  return ended !== false;
}

/** 통화 종료 + 오버레이 닫기 (거절·완전 종료) */
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

export function nativeSetOverlayFullscreen(fullscreen) {
  callBridge("setOverlayFullscreen", fullscreen ? "1" : "0");
}

export function nativeDismissOverlay() {
  callBridge("dismissOverlay");
}

/** @param {boolean} muted */
export function nativeSetMicrophoneMute(muted) {
  const r = callBridge("setMicrophoneMute", muted ? "1" : "0");
  return r !== false;
}

/** @returns {boolean} */
export function nativeIsMicrophoneMute() {
  const r = callBridge("isMicrophoneMute");
  return r === true || r === "1" || r === 1;
}

/** @param {boolean} on */
export function nativeSetSpeakerphoneOn(on) {
  const r = callBridge("setSpeakerphoneOn", on ? "1" : "0");
  return r !== false;
}

/** @returns {boolean} */
export function nativeIsSpeakerphoneOn() {
  const r = callBridge("isSpeakerphoneOn");
  return r === true || r === "1" || r === 1;
}

/**
 * DTMF 송출 (InCall 연결 시) / 로컬 톤 폴백
 * @param {string} digit 0-9 * #
 */
export function nativePlayDtmf(digit) {
  const d = String(digit || "").slice(0, 1);
  if (!d) return false;
  return callBridge("playDtmfTone", d) !== false;
}

export function nativeStopDtmf() {
  callBridge("stopDtmfTone");
}

/** iOS: 쇼케이스 가림 → 순정 통화 UI 노출 (스와이프 업) */
export function nativeRevealSystemCallUi() {
  return callBridge("revealSystemCallUi") !== false;
}

/** iOS: 쇼케이스 복귀 */
export function nativeRestoreShowcaseOverlay() {
  return callBridge("restoreShowcaseOverlay") !== false;
}

/**
 * Companion Mini Case — 네이티브 플로팅 오버레이 위치·크기 (CSS px → 네이티브에서 density 적용 전 가정: 호출측에서 물리 px 전달)
 * @param {number} x
 * @param {number} y
 * @param {number} w
 * @param {number} h
 */
export function nativeUpdateMiniOverlayFrame(x, y, w, h) {
  return callBridge("updateMiniOverlayFrame", String(Math.round(x)), String(Math.round(y)), String(Math.round(w)), String(Math.round(h))) !== false;
}

/** @returns {{ w: number, h: number, d: number } | null} */
export function nativeGetScreenSize() {
  try {
    const raw =
      window.VlueLettering?.getScreenSizeJson?.() ||
      window.Android?.getScreenSizeJson?.();
    if (!raw) return null;
    const o = typeof raw === "string" ? JSON.parse(raw) : raw;
    const w = Number(o?.w) || 0;
    const h = Number(o?.h) || 0;
    const d = Number(o?.d) || 1;
    if (w < 1 || h < 1) return null;
    return { w, h, d };
  } catch {
    return null;
  }
}

export function hasNativeMiniOverlay() {
  return Boolean(
    window.VlueLettering?.updateMiniOverlayFrame ||
      window.Android?.updateMiniOverlayFrame
  );
}

export function hasNativeCallControl() {
  return Boolean(
    window.VlueLettering?.endCall ||
      window.Android?.endCall ||
      window.VlueLettering?.endCallKeepOverlay ||
      window.Android?.endCallKeepOverlay ||
      window.VlueLettering?.dismissOverlay ||
      window.Android?.dismissOverlay
  );
}

export function hasNativeAudioControl() {
  return Boolean(
    window.VlueLettering?.setSpeakerphoneOn ||
      window.Android?.setSpeakerphoneOn ||
      window.VlueLettering?.setMicrophoneMute ||
      window.Android?.setMicrophoneMute
  );
}

/** Android InCallService(기본 전화앱) DTMF 가능 여부 */
export function getNativeInCallCapability() {
  try {
    const raw =
      window.VlueLettering?.getInCallCapabilityJson?.() ||
      window.Android?.getInCallCapabilityJson?.();
    if (!raw) return { defaultDialer: false, realDtmf: false };
    return typeof raw === "string" ? JSON.parse(raw) : raw;
  } catch {
    return { defaultDialer: false, realDtmf: false };
  }
}

export function nativeRequestDefaultDialerRole() {
  callBridge("requestDefaultDialerRole");
}
