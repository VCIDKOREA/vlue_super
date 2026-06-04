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

/** 모바일 WebView·좁은 화면 감지 */
export function detectClientKind() {
  if (typeof window === "undefined") return "desktop";
  const w = window.innerWidth || 1024;
  const ua = navigator.userAgent || "";
  if (/iphone|ipad|android|mobile/i.test(ua) && w < 900) return "mobile";
  return "desktop";
}

export function clientKindHeaders() {
  return { "X-VLUE-Client": detectClientKind() };
}
