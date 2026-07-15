/**
 * 네이티브 앱 PIN 잠금 브릿지 (Android EncryptedSharedPreferences)
 * V1: 앱 잠금 ON/OFF + 중요기능 requestAuth
 * V2 예약: 24h 강제 · 생체(BiometricPrompt)
 *
 * 웹 → 네이티브:
 *   window.Android.requestAuth(id)
 *   window.ReactNativeWebView.postMessage('requestAuth')
 *   window.VlueAppLock.requestAuth(id)
 */

export const APP_LOCK_AUTH_RESULT = "vlue-app-lock-auth-result";
export const APP_LOCK_SETUP_RESULT = "vlue-app-lock-setup-result";
export const APP_LOCK_REQUIRES_RESET = "vlue-app-lock-requires-reset";
export const APP_LOCK_STATUS = "vlue-app-lock-status";

export function hasNativeAppLockBridge() {
  if (typeof window === "undefined") return false;
  try {
    return Boolean(
      window.Android?.requestAuth ||
        window.Android?.getAppLockStatusJson ||
        window.VlueAppLock?.__native ||
        window.ReactNativeWebView?.postMessage
    );
  } catch {
    return false;
  }
}

export function getAppLockStatus() {
  try {
    const raw = window.Android?.getAppLockStatusJson?.();
    if (raw) return typeof raw === "string" ? JSON.parse(raw) : raw;
    if (window.VlueAppLock?.getStatus) return window.VlueAppLock.getStatus();
  } catch {
    /* ignore */
  }
  return {
    hasPin: false,
    appLockEnabled: false,
    failCount: 0,
    maxFails: 5,
    requiresIdentityReset: false,
    biometricEnabled: false,
    native: false,
    version: 1
  };
}

function newRequestId() {
  return `pin-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function waitForEvent(eventName, requestId, timeoutMs = 120000) {
  return new Promise((resolve) => {
    let done = false;
    const finish = (detail) => {
      if (done) return;
      done = true;
      window.clearTimeout(timer);
      window.removeEventListener(eventName, onEv);
      resolve(detail);
    };
    const onEv = (ev) => {
      const d = ev?.detail;
      if (requestId && d?.requestId && d.requestId !== requestId) return;
      finish(d || {});
    };
    const timer = window.setTimeout(() => finish({ ok: false, via: "timeout" }), timeoutMs);
    window.addEventListener(eventName, onEv);
  });
}

/** 중요 기능용 PIN 인증. 네이티브 없으면 true(브라우저/PC는 별도 정책). */
export async function requestAppAuth(reason = "sensitive") {
  if (!hasNativeAppLockBridge()) return { ok: true, via: "no_native", reason };
  const status = getAppLockStatus();
  // 앱 잠금 ON + 이미 세션 통과는 네이티브가 session 으로 즉시 응답
  const requestId = newRequestId();
  try {
    if (window.Android?.requestAuth) {
      window.Android.requestAuth(requestId);
    } else if (window.VlueAppLock?.requestAuth) {
      window.VlueAppLock.requestAuth(requestId);
    } else if (window.ReactNativeWebView?.postMessage) {
      window.ReactNativeWebView.postMessage(
        JSON.stringify({ type: "requestAuth", requestId, reason })
      );
    } else {
      return { ok: true, via: "no_native", reason };
    }
  } catch {
    return { ok: false, via: "bridge_error", reason };
  }
  const detail = await waitForEvent(APP_LOCK_AUTH_RESULT, requestId);
  return {
    ok: Boolean(detail?.ok),
    via: detail?.via || "pin",
    reason,
    requiresReset: detail?.via === "requires_reset" || status.requiresIdentityReset
  };
}

export async function requestAppPinSetup() {
  if (!hasNativeAppLockBridge()) return { ok: false, via: "no_native" };
  const requestId = newRequestId();
  try {
    if (window.Android?.requestAppPinSetup) {
      window.Android.requestAppPinSetup(requestId);
    } else if (window.VlueAppLock?.requestPinSetup) {
      window.VlueAppLock.requestPinSetup(requestId);
    } else if (window.ReactNativeWebView?.postMessage) {
      window.ReactNativeWebView.postMessage(
        JSON.stringify({ type: "requestAppPinSetup", requestId })
      );
    }
  } catch {
    return { ok: false, via: "bridge_error" };
  }
  const detail = await waitForEvent(APP_LOCK_SETUP_RESULT, requestId);
  return {
    ok: Boolean(detail?.ok),
    cancelled: Boolean(detail?.cancelled),
    via: detail?.via || (detail?.cancelled ? "cancelled" : "setup")
  };
}

export function setAppLockEnabled(enabled) {
  if (!hasNativeAppLockBridge()) return { ok: false };
  try {
    window.Android?.setAppLockEnabled?.(enabled ? "1" : "0");
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

export function confirmPinResetIdentity() {
  try {
    window.Android?.confirmPinResetIdentity?.("1");
    window.ReactNativeWebView?.postMessage?.(
      JSON.stringify({ type: "confirmPinResetIdentity", ok: true })
    );
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

/**
 * 앱 잠금 OFF일 때만 중요기능에서 PIN 요구.
 * ON이면 네이티브 세션 정책으로 생략(또는 즉시 ok).
 */
export async function requirePinForSensitiveAction(reason) {
  if (!hasNativeAppLockBridge()) return { ok: true, via: "no_native" };
  const st = getAppLockStatus();
  if (st.requiresIdentityReset) {
    window.dispatchEvent(new CustomEvent(APP_LOCK_REQUIRES_RESET, { detail: { reason: "max_fails" } }));
    return { ok: false, via: "requires_reset" };
  }
  if (!st.hasPin) {
    const setup = await requestAppPinSetup();
    if (!setup.ok) return setup;
  }
  return requestAppAuth(reason);
}
