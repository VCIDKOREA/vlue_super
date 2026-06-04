/**
 * WebAuthn 기반 생체 인증 (클라이언트 전용 데모)
 * — 서버 검증 없이도 navigator.credentials 성공 시 사용자가 등록한 기기 인증기를 통과한 것으로 간주합니다.
 * — HTTPS 또는 localhost 에서만 동작합니다.
 *
 * 플랫폼 정책 (UI·안내 문구)
 * - Android: 지문 또는 얼굴 인식 (기기에 등록된 방식 중 선택)
 * - iOS/iPadOS: Face ID(얼굴) — Safari WebAuthn은 OS가 Face ID를 사용 (Touch ID 기기는 OS 기본값)
 */

const CREDENTIAL_KEY = "vlue_webauthn_credential_id_b64u";
const PLATFORM_KEY = "vlue_webauthn_platform";
const USER_HANDLE_KEY = "vlue_webauthn_user_handle_b64u";
const LAST_OK_KEY = "vlue_biometric_last_ok_ms";

/** 마지막 성공 인증 후 24시간 동안 재요청 생략 */
export const BIOMETRIC_GRACE_MS = 24 * 60 * 60 * 1000;

export function bufferToBase64url(buffer) {
  const bytes = buffer instanceof ArrayBuffer ? new Uint8Array(buffer) : buffer;
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function base64urlToBuffer(base64url) {
  const padded = base64url.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  const binary = atob(padded + pad);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

function getOrCreateUserHandleBytes() {
  try {
    let stored = localStorage.getItem(USER_HANDLE_KEY);
    if (!stored) {
      const raw = crypto.getRandomValues(new Uint8Array(32));
      stored = bufferToBase64url(raw);
      localStorage.setItem(USER_HANDLE_KEY, stored);
    }
    return new Uint8Array(base64urlToBuffer(stored));
  } catch {
    const raw = crypto.getRandomValues(new Uint8Array(32));
    return raw;
  }
}

export function isWebAuthnSupported() {
  return typeof window !== "undefined" && !!window.PublicKeyCredential;
}

/** @returns {'ios'|'android'|'desktop'|'unknown'} */
export function detectDevicePlatform() {
  if (typeof navigator === "undefined") return "unknown";
  const ua = navigator.userAgent || "";
  const maxTouch = navigator.maxTouchPoints || 0;
  const isIpadOsDesktopUa =
    /Macintosh/i.test(ua) && maxTouch > 1 && !/iPhone/i.test(ua);
  if (/iPhone|iPod/i.test(ua) || /iPad/i.test(ua) || isIpadOsDesktopUa) {
    return "ios";
  }
  if (/Android/i.test(ua)) return "android";
  if (ua) return "desktop";
  return "unknown";
}

/**
 * 플랫폼별 생체 인증 UX·허용 방식 (표시·버튼 문구)
 * @returns {{
 *   platform: string,
 *   allowedMethods: ('fingerprint'|'face')[],
 *   registerButtonLabel: string,
 *   verifyButtonLabel: string,
 *   gateDescription: string,
 *   onboardingMandatory: string,
 *   cancelHint: string,
 *   methodSummary: string
 * }}
 */
export function getBiometricProfile() {
  const platform = detectDevicePlatform();

  if (platform === "ios") {
    return {
      platform,
      allowedMethods: ["face"],
      registerButtonLabel: "Face ID 등록하기",
      verifyButtonLabel: "Face ID로 계속",
      gateDescription:
        "iPhone·iPad에서는 Face ID(얼굴 인식)로 본인 확인합니다. 메인 화면 진입 전 등록·인증이 필요합니다.",
      onboardingMandatory: "Face ID(얼굴) 등록",
      cancelHint: "취소한 경우 다시 눌러 Face ID 화면이 뜨는지 확인해 주세요.",
      methodSummary: "Face ID(얼굴)"
    };
  }

  if (platform === "android") {
    return {
      platform,
      allowedMethods: ["fingerprint", "face"],
      registerButtonLabel: "지문·얼굴 인증 등록하기",
      verifyButtonLabel: "지문 또는 얼굴로 계속",
      gateDescription:
        "Android에서는 기기에 등록된 지문 또는 얼굴 인식 중 하나로 인증할 수 있습니다.",
      onboardingMandatory: "지문 또는 얼굴 인식 등록",
      cancelHint:
        "취소한 경우 다시 눌러 지문·얼굴 인증 화면이 뜨는지 확인해 주세요.",
      methodSummary: "지문·얼굴"
    };
  }

  return {
    platform,
    allowedMethods: ["fingerprint", "face"],
    registerButtonLabel: "생체 인증 등록하기",
    verifyButtonLabel: "생체 인증으로 계속",
    gateDescription: "지원 기기에서는 지문·얼굴 또는 기기 PIN으로 인증합니다.",
    onboardingMandatory: "생체(지문·얼굴) 등록",
    cancelHint: "취소한 경우 다시 눌러 생체 인증 화면이 뜨는지 확인해 주세요.",
    methodSummary: "지문·얼굴·PIN"
  };
}

function rememberBiometricPlatform() {
  try {
    localStorage.setItem(PLATFORM_KEY, detectDevicePlatform());
  } catch {
    /* ignore */
  }
}

/** 플랫폼 내장 인증기만 사용 (Android 지문/얼굴, iOS Face ID) */
function platformAuthenticatorSelection() {
  return {
    authenticatorAttachment: "platform",
    userVerification: "required",
    residentKey: "preferred"
  };
}

/** iOS/Android: 크로스디바이스(hybrid) 제외, 기기 내장 생체만 */
function platformCredentialTransports() {
  return ["internal"];
}

export function hasStoredCredential() {
  try {
    return !!localStorage.getItem(CREDENTIAL_KEY);
  } catch {
    return false;
  }
}

export function isBiometricGraceActive() {
  try {
    const raw = localStorage.getItem(LAST_OK_KEY);
    if (!raw) return false;
    const t = Number(raw);
    if (Number.isNaN(t)) return false;
    return Date.now() - t < BIOMETRIC_GRACE_MS;
  } catch {
    return false;
  }
}

export function setBiometricGraceNow() {
  try {
    localStorage.setItem(LAST_OK_KEY, String(Date.now()));
  } catch {
    /* ignore */
  }
}

export function clearBiometricGrace() {
  try {
    localStorage.removeItem(LAST_OK_KEY);
  } catch {
    /* ignore */
  }
}

/** 로그아웃 등 — 다음 접속 시 생체 단계를 다시 거치도록 */
export function clearBiometricSessionOnly() {
  clearBiometricGrace();
}

/**
 * 플랫폼 생체 등록 — Android: 지문·얼굴 / iOS: Face ID(플랫폼 인증기)
 */
export async function registerBiometric() {
  if (!isWebAuthnSupported()) return false;

  const profile = getBiometricProfile();
  const challenge = crypto.getRandomValues(new Uint8Array(32));
  const userId = getOrCreateUserHandleBytes();
  const displayName =
    profile.platform === "ios" ? "VLUE (Face ID)" : "VLUE 사용자";

  const publicKeyOptions = {
    challenge,
    rp: { name: "VLUE", id: window.location.hostname },
    user: {
      id: userId,
      name: "vlue-user",
      displayName
    },
    pubKeyCredParams: [
      { type: "public-key", alg: -7 },
      { type: "public-key", alg: -257 }
    ],
    authenticatorSelection: platformAuthenticatorSelection(),
    timeout: 60000,
    attestation: "none"
  };

  let cred;
  try {
    cred = await navigator.credentials.create({ publicKey: publicKeyOptions });
  } catch (firstErr) {
    if (profile.platform === "ios") {
      throw firstErr;
    }
    const relaxed = {
      ...publicKeyOptions,
      authenticatorSelection: {
        userVerification: "required",
        residentKey: "preferred"
      }
    };
    cred = await navigator.credentials.create({ publicKey: relaxed });
  }

  if (!cred || cred.type !== "public-key") return false;

  try {
    localStorage.setItem(CREDENTIAL_KEY, bufferToBase64url(cred.rawId));
    rememberBiometricPlatform();
  } catch {
    return false;
  }
  return true;
}

/**
 * 저장된 자격 증명으로 생체 인증
 */
export async function verifyBiometric() {
  if (!isWebAuthnSupported()) return false;

  let stored;
  try {
    stored = localStorage.getItem(CREDENTIAL_KEY);
  } catch {
    return false;
  }
  if (!stored) return false;

  const id = base64urlToBuffer(stored);
  const challenge = crypto.getRandomValues(new Uint8Array(32));

  const assertion = await navigator.credentials.get({
    publicKey: {
      challenge,
      allowCredentials: [
        {
          type: "public-key",
          id,
          transports: platformCredentialTransports()
        }
      ],
      userVerification: "required",
      timeout: 60000
    }
  });

  return !!assertion;
}
