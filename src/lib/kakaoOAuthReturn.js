import { setVlueSessionTokens } from "./vlueAuthHeaders.js";

const SAVED_ID_KEY = "vlue_saved_login_id";
const SAVED_PASSWORD_KEY = "vlue_saved_login_password";
const REMEMBER_KEY = "vlue_remember_login";

function parseHashParams() {
  const raw = typeof window !== "undefined" ? window.location.hash.replace(/^#/, "") : "";
  if (!raw) return new URLSearchParams();
  const qIdx = raw.indexOf("?");
  const body = qIdx >= 0 ? raw.slice(qIdx + 1) : raw;
  return new URLSearchParams(body);
}

function stripOAuthFromUrl() {
  if (typeof window === "undefined") return;
  const u = new URL(window.location.href);
  u.searchParams.delete("kakao_oauth");
  u.searchParams.delete("kakao_error");
  u.hash = "";
  window.history.replaceState({}, "", `${u.pathname}${u.search}`);
}

/**
 * 카카오 OAuth 콜백 후 URL에 담긴 결과 처리.
 * @returns {"handled":boolean,"success":boolean,"message"?:string,"session"?:object}
 */
export function consumeKakaoOAuthReturn() {
  if (typeof window === "undefined") return { handled: false, success: false };

  const search = new URLSearchParams(window.location.search);
  const hash = parseHashParams();
  const mode = search.get("kakao_oauth") || hash.get("kakao_oauth");

  if (!mode) return { handled: false, success: false };

  if (mode === "error") {
    const message =
      search.get("kakao_error") ||
      hash.get("kakao_error") ||
      "카카오 로그인에 실패했습니다. 다시 시도해 주세요.";
    stripOAuthFromUrl();
    return { handled: true, success: false, message: decodeURIComponent(message) };
  }

  if (mode === "success") {
    const accessToken = hash.get("accessToken") || "";
    const refreshToken = hash.get("refreshToken") || "";
    const userId = hash.get("userId") || "";
    const publicHandle = hash.get("publicHandle") || "";
    const legalName = hash.get("legalName") || "";
    const accountStatus = hash.get("accountStatus") || "active";

    stripOAuthFromUrl();

    if (!accessToken || !userId) {
      return {
        handled: true,
        success: false,
        message: "로그인 정보가 올바르지 않습니다. 다시 시도해 주세요."
      };
    }

    try {
      localStorage.removeItem(SAVED_ID_KEY);
      localStorage.removeItem(SAVED_PASSWORD_KEY);
      localStorage.removeItem(REMEMBER_KEY);
      localStorage.setItem("vlue_social_login_provider", "kakao");
    } catch {
      /* ignore */
    }

    setVlueSessionTokens({ accessToken, refreshToken });
    const session = {
      userId,
      accessToken,
      refreshToken,
      publicHandle,
      legalName,
      accountStatus
    };

    return { handled: true, success: true, session };
  }

  stripOAuthFromUrl();
  return { handled: true, success: false, message: "알 수 없는 카카오 로그인 응답입니다." };
}
