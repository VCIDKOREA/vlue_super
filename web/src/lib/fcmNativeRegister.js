/**
 * Android 네이티브 FCM 토큰 → POST /api/auth/devices/fcm-token
 * (WebView 웹 푸시는 미지원이므로 앱 셸에서는 이 경로 사용)
 */
import { apiUrl } from "./apiBase.js";
import { getDeviceToken } from "./deviceAuth.js";
import { vlueAuthFetch } from "./vlueAuthHeaders.js";

const CACHE_KEY = "vlue_native_fcm_registered_v1";

function readNativeFcmToken() {
  try {
    const t = window.Android?.getFcmToken?.() || window.VlueAndroid?.getFcmToken?.() || "";
    return String(t || "").trim();
  } catch {
    return "";
  }
}

function isAndroidAppShell() {
  try {
    if (window.Android?.getFcmToken || window.Android?.showSystemNotification) return true;
    const ua = navigator.userAgent || "";
    return /VLUE-Android-App/i.test(ua);
  } catch {
    return false;
  }
}

export function isNativeFcmAvailable() {
  return isAndroidAppShell() && Boolean(window.Android?.getFcmToken || window.VlueAndroid?.getFcmToken);
}

/**
 * 로그인·기기 승인 후 호출. 토큰이 없으면 refresh 후 재시도.
 */
export async function registerNativeFcmPushToken() {
  if (!isAndroidAppShell()) {
    return { ok: false, skipped: true, reason: "not_android_shell" };
  }

  let fcmToken = readNativeFcmToken();
  if (fcmToken.length < 20) {
    try {
      window.Android?.refreshFcmToken?.();
    } catch {
      /* ignore */
    }
    await new Promise((r) => setTimeout(r, 1200));
    fcmToken = readNativeFcmToken();
  }
  if (fcmToken.length < 20) {
    return { ok: false, skipped: true, reason: "no_native_token" };
  }

  const deviceToken = getDeviceToken();
  if (!deviceToken) return { ok: false, skipped: true, reason: "no_device_token" };

  let userId = "";
  try {
    userId = String(localStorage.getItem("vlue_server_user_id") || "").trim();
  } catch {
    /* ignore */
  }
  const cacheKey = userId ? `${userId}:${fcmToken}` : fcmToken;
  try {
    if (localStorage.getItem(CACHE_KEY) === cacheKey) {
      return { ok: true, cached: true };
    }
  } catch {
    /* ignore */
  }

  const res = await vlueAuthFetch(apiUrl("/api/auth/devices/fcm-token"), {
    method: "POST",
    body: JSON.stringify({ deviceToken, fcmToken })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { ok: false, error: data?.error || `HTTP ${res.status}` };
  }
  try {
    localStorage.setItem(CACHE_KEY, cacheKey);
  } catch {
    /* ignore */
  }
  return { ok: true };
}

/** onNewToken → 웹 이벤트 */
export function bindNativeFcmTokenListener() {
  if (typeof window === "undefined") return () => {};
  const onToken = () => {
    void registerNativeFcmPushToken();
  };
  window.addEventListener("vlue-native-fcm-token", onToken);
  window.VlueFcm = Object.assign({}, window.VlueFcm || {}, {
    onNativeToken: () => {
      void registerNativeFcmPushToken();
    }
  });
  return () => {
    window.removeEventListener("vlue-native-fcm-token", onToken);
  };
}
