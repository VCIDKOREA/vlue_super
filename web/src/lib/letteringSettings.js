export const LETTERING_ENABLED_KEY = "vlue_lettering_enabled";
export const CALL_DETECTION_HEALTH_EVENT = "vlue-call-detection-health";

export function readLetteringEnabled() {
  try {
    return localStorage.getItem(LETTERING_ENABLED_KEY) === "1";
  } catch {
    return false;
  }
}

export function writeLetteringEnabled(enabled) {
  try {
    localStorage.setItem(LETTERING_ENABLED_KEY, enabled ? "1" : "0");
    window.dispatchEvent(new CustomEvent("vlue-lettering-settings-changed", { detail: { enabled } }));
    syncLetteringEnabledToNative(enabled);
  } catch {
    /* ignore */
  }
}

/** Android/iOS 네이티브 SharedPreferences·UserDefaults 동기화 */
export function syncLetteringEnabledToNative(enabled) {
  if (typeof window === "undefined") return;
  const payload = { enabled: Boolean(enabled) };
  try {
    window.VlueLettering?.setLetteringEnabled?.(payload.enabled);
  } catch {
    /* ignore */
  }
  try {
    window.Android?.setLetteringEnabled?.(payload.enabled ? "1" : "0");
  } catch {
    /* ignore */
  }
  try {
    window.webkit?.messageHandlers?.vlueLetteringSettings?.postMessage(payload);
  } catch {
    /* ignore */
  }
}

/**
 * 쇼케이스/명함 송출 ON → 통화 감지(레터링) + 백그라운드 모니터도 함께 켠다.
 * UI 토글만 켜고 lettering_enabled=false 이면 빅푸가 아예 안 뜸.
 */
export function ensureCallDetectionForBroadcast(on) {
  if (!on) return;
  writeLetteringEnabled(true);
  try {
    const st = readLetteringPermissionStatus();
    if (st && st.callOverlayReady === false) {
      requestLetteringPermissions();
    }
  } catch {
    /* ignore */
  }
  try {
    window.dispatchEvent(new CustomEvent(CALL_DETECTION_HEALTH_EVENT));
  } catch {
    /* ignore */
  }
}

export function requestLetteringPermissions() {
  if (typeof window === "undefined") return { ok: false };
  try {
    if (window.VlueLettering?.requestLetteringPermissions) {
      window.VlueLettering.requestLetteringPermissions();
      return { ok: true, channel: "VlueLettering" };
    }
  } catch {
    /* ignore */
  }
  try {
    if (window.Android?.requestLetteringPermissions) {
      window.Android.requestLetteringPermissions();
      return { ok: true, channel: "Android" };
    }
  } catch {
    /* ignore */
  }
  try {
    window.webkit?.messageHandlers?.vlueLetteringSettings?.postMessage({ action: "requestPermissions" });
    return { ok: true, channel: "webkit" };
  } catch {
    /* ignore */
  }
  return { ok: false, needsNative: true };
}

/** 앱 설정(권한) 화면으로 이동 — 거부 후 재허용용 */
export function openNativeAppSettings() {
  if (typeof window === "undefined") return { ok: false };
  try {
    if (window.VlueLettering?.openAppSettings) {
      window.VlueLettering.openAppSettings();
      return { ok: true, channel: "VlueLettering" };
    }
  } catch {
    /* ignore */
  }
  try {
    if (window.Android?.openAppSettings) {
      window.Android.openAppSettings();
      return { ok: true, channel: "Android" };
    }
  } catch {
    /* ignore */
  }
  try {
    window.webkit?.messageHandlers?.vlueLetteringSettings?.postMessage({ action: "openAppSettings" });
    return { ok: true, channel: "webkit" };
  } catch {
    /* ignore */
  }
  return { ok: false };
}

/** 네이티브 권한 허용 상태 JSON (없으면 null) */
export function readLetteringPermissionStatus() {
  try {
    const raw =
      window.Android?.getLetteringPermissionStatusJson?.() ||
      window.VlueLettering?.getLetteringPermissionStatusJson?.();
    if (!raw) return null;
    return typeof raw === "string" ? JSON.parse(raw) : raw;
  } catch {
    return null;
  }
}

/**
 * 송출 ON인데 통화 감지가 꺼졌는지 — 사용자에게 보여줄 상태.
 * @param {{ broadcastOn?: boolean, nativeStatus?: object|null }} [opts]
 */
export function getCallDetectionHealth(opts = {}) {
  let broadcastOn = opts.broadcastOn;
  if (broadcastOn == null) {
    try {
      const vcid = localStorage.getItem("vcid") === "true";
      const dccRaw = localStorage.getItem("vlue_dcc_broadcast_on");
      const dcc = dccRaw === "1" || dccRaw === "true";
      broadcastOn = vcid || dcc;
    } catch {
      broadcastOn = false;
    }
  }
  const st = opts.nativeStatus ?? readLetteringPermissionStatus();
  const webLettering = readLetteringEnabled();
  const letteringEnabled = st?.letteringEnabled === true || (st == null && webLettering);
  const callOverlayReady = st == null ? true : st.callOverlayReady === true;
  const callMonitorRunning = st?.callMonitorRunning === true;
  const issues = [];
  if (broadcastOn && !letteringEnabled) {
    issues.push("통화 감지가 꺼져 있습니다. 빅푸시가 표시되지 않습니다.");
  }
  if (broadcastOn && letteringEnabled && st && !callOverlayReady) {
    issues.push("전화·오버레이 권한이 필요합니다.");
  }
  if (broadcastOn && letteringEnabled && st && callOverlayReady && st.callMonitorRunning === false) {
    issues.push("백그라운드 통화 감지가 중지되어 있습니다.");
  }
  const healthy =
    !broadcastOn ||
    (letteringEnabled &&
      callOverlayReady &&
      (st == null || callMonitorRunning || st.callMonitorRunning == null));
  return {
    broadcastOn: Boolean(broadcastOn),
    letteringEnabled: Boolean(letteringEnabled),
    callOverlayReady: Boolean(callOverlayReady),
    callMonitorRunning: Boolean(callMonitorRunning),
    healthy: Boolean(healthy),
    issues,
    nativeStatus: st
  };
}

/** 문제 있으면 자동 복구 시도 후 health 반환 */
export function healCallDetectionIfNeeded(opts = {}) {
  const before = getCallDetectionHealth(opts);
  if (!before.broadcastOn) return before;
  if (!before.letteringEnabled || !before.callOverlayReady) {
    ensureCallDetectionForBroadcast(true);
  }
  return getCallDetectionHealth(opts);
}
