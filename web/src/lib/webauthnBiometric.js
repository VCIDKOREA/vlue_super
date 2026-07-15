/**
 * 플랫폼 감지 — 가족보호 등에서 재사용.
 * WebAuthn 생체 관문은 V1에서 제거됨 → 네이티브 앱 PIN(appLockBridge) 사용.
 * V2 예약: BiometricPrompt / 24h 강제 인증.
 */

/** @returns {'ios'|'android'|'desktop'|'unknown'} */
export function detectDevicePlatform() {
  if (typeof navigator === "undefined") return "unknown";
  const ua = navigator.userAgent || "";
  const maxTouch = navigator.maxTouchPoints || 0;
  const isIpadOsDesktopUa = /Macintosh/i.test(ua) && maxTouch > 1 && !/iPhone/i.test(ua);
  if (/iPhone|iPod/i.test(ua) || /iPad/i.test(ua) || isIpadOsDesktopUa) return "ios";
  if (/Android/i.test(ua)) return "android";
  if (ua) return "desktop";
  return "unknown";
}

/** @deprecated V1 — 웹 생체 게이트 제거. 항상 true */
export function isBiometricGraceActive() {
  return true;
}

/** @deprecated */
export function setBiometricGraceNow() {}

/** @deprecated */
export function clearBiometricGrace() {}

/** @deprecated */
export function clearBiometricSessionOnly() {
  try {
    localStorage.removeItem("vlue_biometric_last_ok_ms");
    localStorage.removeItem("vlue_webauthn_credential_id_b64u");
    localStorage.removeItem("vlue_biometric_registered");
    localStorage.removeItem("vlue_biometric_webview_skip");
    localStorage.removeItem("vlue_biometric_demo");
  } catch {
    /* ignore */
  }
}

export function isWebAuthnSupported() {
  return false;
}

export function isVlueNativeAppShell() {
  if (typeof window === "undefined") return false;
  try {
    const ua = String(navigator.userAgent || "");
    if (ua.includes("VLUE-Android-App") || ua.includes("VLUE-iOS-App")) return true;
    if (window.VlueFamilyBridge?.__androidShell || window.VlueFamilyBridge?.__iosShell) return true;
  } catch {
    /* ignore */
  }
  return false;
}

export function canSkipWebAuthnBiometric() {
  return true;
}

export function getBiometricProfile() {
  return {
    platform: detectDevicePlatform(),
    allowedMethods: [],
    registerButtonLabel: "앱 PIN 등록",
    verifyButtonLabel: "PIN 입력",
    gateDescription: "앱 PIN으로 보호됩니다.",
    onboardingMandatory: "6자리 앱 PIN 등록",
    cancelHint: "",
    methodSummary: "앱 PIN"
  };
}

export function hasStoredCredential() {
  return false;
}

export async function registerBiometric() {
  return false;
}

export async function verifyBiometric() {
  return false;
}

export const BIOMETRIC_GRACE_MS = 0;
