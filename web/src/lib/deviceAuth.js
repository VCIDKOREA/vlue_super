const DEVICE_TOKEN_KEY = "vlue_device_token";

export function getDeviceToken() {
  try {
    let t = localStorage.getItem(DEVICE_TOKEN_KEY);
    if (!t) {
      t = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "").slice(0, 16);
      localStorage.setItem(DEVICE_TOKEN_KEY, t);
    }
    return t;
  } catch {
    return "";
  }
}

export function saveDeviceToken(token) {
  try {
    if (token) localStorage.setItem(DEVICE_TOKEN_KEY, String(token));
  } catch {
    /* ignore */
  }
}

/** 모바일 WebView·앱 감지 (서버 detectClientKind 와 동일 — 폭 조건 없음) */
export function detectClientKind() {
  if (typeof window === "undefined") return "desktop";
  const ua = navigator.userAgent || "";
  if (/iphone|ipad|ipod|android|mobile/i.test(ua)) return "mobile";
  return "desktop";
}

export function detectAuthPlatform() {
  if (typeof navigator === "undefined") return "web";
  const ua = String(navigator.userAgent || "");
  if (ua.includes("VLUE-Android-App") || ua.includes("VLUE-iOS-App")) return "app";
  return "web";
}

export function clientKindHeaders() {
  return {
    "X-VLUE-Client": detectClientKind(),
    "X-VLUE-Platform": detectAuthPlatform()
  };
}
