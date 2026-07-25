/**
 * 웹 FCM 토큰 등록 — 백그라운드 푸시(팔로우·쇼케이스 소셜 등)
 * @see POST /api/auth/devices/fcm-token
 */
import { initializeApp, getApps } from "firebase/app";
import { getMessaging, getToken, isSupported, onMessage } from "firebase/messaging";
import { apiUrl } from "./apiBase.js";
import { getDeviceToken } from "./deviceAuth.js";
import { vlueAuthFetch } from "./vlueAuthHeaders.js";

const FCM_REGISTERED_KEY = "vlue_fcm_token_registered";

function readFirebaseWebConfig() {
  const apiKey = String(import.meta.env.VITE_FIREBASE_API_KEY ?? "").trim();
  const projectId = String(import.meta.env.VITE_FIREBASE_PROJECT_ID ?? "").trim();
  const messagingSenderId = String(import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? "").trim();
  const appId = String(import.meta.env.VITE_FIREBASE_APP_ID ?? "").trim();
  const vapidKey = String(import.meta.env.VITE_WEB_PUSH_VAPID_PUBLIC_KEY ?? "").trim();
  if (!apiKey || !projectId || !messagingSenderId || !appId || !vapidKey) return null;
  const authDomain = String(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? "").trim();
  return {
    firebase: {
      apiKey,
      authDomain: authDomain || `${projectId}.firebaseapp.com`,
      projectId,
      messagingSenderId,
      appId
    },
    vapidKey
  };
}

function readLocalUserId() {
  try {
    return String(localStorage.getItem("vlue_server_user_id") || "").trim();
  } catch {
    return "";
  }
}

/** Railway Variables / .env 에 Firebase web 설정이 있는지 */
export function isFcmWebPushConfigured() {
  return readFirebaseWebConfig() != null;
}

async function ensureFirebaseApp(config) {
  const existing = getApps();
  if (existing.length > 0) return existing[0];
  return initializeApp(config);
}

/**
 * 로그인·승인된 기기에서 FCM 토큰을 API에 등록.
 * 계정 전환 시 userId별로 다시 등록해야 해당 계정 기기로 백그라운드 푸시가 갑니다.
 */
export async function registerFcmWebPushToken() {
  const cfg = readFirebaseWebConfig();
  if (!cfg) {
    console.warn(
      "[fcm] not_configured — web/.env 에 VITE_FIREBASE_* + VITE_WEB_PUSH_VAPID_PUBLIC_KEY 를 넣으세요"
    );
    return { ok: false, skipped: true, reason: "not_configured" };
  }
  if (typeof window === "undefined" || !("Notification" in window) || !("serviceWorker" in navigator)) {
    return { ok: false, skipped: true, reason: "unsupported" };
  }

  const supported = await isSupported();
  if (!supported) return { ok: false, skipped: true, reason: "messaging_unsupported" };

  let permission = Notification.permission;
  if (permission === "default") permission = await Notification.requestPermission();
  if (permission !== "granted") return { ok: false, skipped: true, reason: "permission_denied" };

  const deviceToken = getDeviceToken();
  if (!deviceToken) return { ok: false, skipped: true, reason: "no_device_token" };

  const app = await ensureFirebaseApp(cfg.firebase);
  const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
  await navigator.serviceWorker.ready;
  const messaging = getMessaging(app);
  const fcmToken = await getToken(messaging, {
    vapidKey: cfg.vapidKey,
    serviceWorkerRegistration: registration
  });

  if (!fcmToken) return { ok: false, error: "empty_fcm_token" };

  const userId = readLocalUserId();
  const cacheKey = userId ? `${userId}:${fcmToken}` : fcmToken;
  try {
    const cached = localStorage.getItem(FCM_REGISTERED_KEY);
    if (cached === cacheKey) return { ok: true, cached: true };
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
    localStorage.setItem(FCM_REGISTERED_KEY, cacheKey);
  } catch {
    /* ignore */
  }
  return { ok: true };
}

/** 앱이 열려 있을 때 FCM 포그라운드 메시지 → 커스텀 이벤트 */
export async function bindFcmForegroundListener() {
  const cfg = readFirebaseWebConfig();
  if (!cfg || typeof window === "undefined") return () => {};
  const supported = await isSupported();
  if (!supported) return () => {};

  const app = await ensureFirebaseApp(cfg.firebase);
  const messaging = getMessaging(app);
  return onMessage(messaging, (payload) => {
    window.dispatchEvent(new CustomEvent("vlue-fcm-foreground", { detail: payload }));
  });
}
