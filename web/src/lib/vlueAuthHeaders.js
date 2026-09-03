import { apiUrl } from "./apiBase.js";
import { clientKindHeaders, getDeviceToken } from "./deviceAuth.js";

export const VLUE_ACCESS_TOKEN_KEY = "vlue_access_token";
export const VLUE_REFRESH_TOKEN_KEY = "vlue_refresh_token";

export function setVlueSessionTokens(payload) {
  try {
    if (payload?.accessToken) localStorage.setItem(VLUE_ACCESS_TOKEN_KEY, String(payload.accessToken));
    else localStorage.removeItem(VLUE_ACCESS_TOKEN_KEY);
    if (payload?.refreshToken) localStorage.setItem(VLUE_REFRESH_TOKEN_KEY, String(payload.refreshToken));
    else localStorage.removeItem(VLUE_REFRESH_TOKEN_KEY);
  } catch {
    /* ignore */
  }
  syncNativeAuthSession();
}

export function clearVlueSessionTokens() {
  try {
    localStorage.removeItem(VLUE_ACCESS_TOKEN_KEY);
    localStorage.removeItem(VLUE_REFRESH_TOKEN_KEY);
  } catch {
    /* ignore */
  }
  try {
    window.Android?.clearUserSession?.();
    window.VlueAndroid?.clearUserSession?.();
  } catch {
    /* ignore */
  }
}

/** Android 알림 수락/거절용 — WebView 로그인 토큰·기기 토큰을 네이티브에 복사 */
export function syncNativeAuthSession() {
  try {
    const token = getAccessToken();
    let userId = "";
    let deviceToken = "";
    try {
      userId = String(localStorage.getItem("vlue_server_user_id") || "").trim();
    } catch {
      /* ignore */
    }
    try {
      deviceToken = String(getDeviceToken() || "").trim();
    } catch {
      /* ignore */
    }
    if (window.Android?.bindUserSession) {
      window.Android.bindUserSession(userId, token);
      if (deviceToken) window.Android.bindDeviceToken?.(deviceToken);
      try {
        localStorage.setItem("vlue_lettering_enabled", "1");
      } catch {
        /* ignore */
      }
      return true;
    }
    if (window.VlueAndroid?.bindUserSession) {
      window.VlueAndroid.bindUserSession(userId, token);
      if (deviceToken) window.VlueAndroid.bindDeviceToken?.(deviceToken);
      try {
        localStorage.setItem("vlue_lettering_enabled", "1");
      } catch {
        /* ignore */
      }
      return true;
    }
  } catch {
    /* ignore */
  }
  return false;
}

export function getAccessToken() {
  try {
    return localStorage.getItem(VLUE_ACCESS_TOKEN_KEY) || "";
  } catch {
    return "";
  }
}

export function getRefreshToken() {
  try {
    return localStorage.getItem(VLUE_REFRESH_TOKEN_KEY) || "";
  } catch {
    return "";
  }
}

/** API 요청용 — Bearer 우선, 기존 프록시/호환용 X-VLUE-User-Id 유지 */
export function vlueAuthHeaders(extra) {
  const h = extra && typeof extra === "object" ? { ...extra, ...clientKindHeaders() } : { ...clientKindHeaders() };
  if (!h["Content-Type"] && !h["content-type"]) h["Content-Type"] = "application/json";
  const t = getAccessToken();
  if (t) h.Authorization = `Bearer ${t}`;
  try {
    const uid = localStorage.getItem("vlue_server_user_id");
    if (uid) h["X-VLUE-User-Id"] = uid;
  } catch {
    /* ignore */
  }
  return h;
}

/**
 * 401 시 refresh 1회 후 재시도. input 이 `/api/...` 이면 apiUrl 로 절대화.
 */
export async function vlueAuthFetch(input, init) {
  const url =
    typeof input === "string" && input.startsWith("/") ? apiUrl(input) : input;
  const merge = () => ({
    ...init,
    headers: { ...vlueAuthHeaders(), ...(init?.headers || {}) }
  });
  let res = await fetch(url, merge());
  if (res.status !== 401) return res;
  const rt = getRefreshToken();
  if (!rt) return res;
  const r2 = await fetch(apiUrl("/api/auth/refresh"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken: rt })
  });
  const dj = await r2.json().catch(() => ({}));
  if (r2.ok && dj.accessToken) {
    setVlueSessionTokens({ accessToken: dj.accessToken, refreshToken: dj.refreshToken || rt });
    res = await fetch(url, merge());
  }
  return res;
}
