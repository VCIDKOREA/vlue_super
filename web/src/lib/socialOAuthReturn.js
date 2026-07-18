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
  [
    "kakao_oauth",
    "kakao_error",
    "google_oauth",
    "google_error",
    "naver_oauth",
    "naver_error",
    "instagram_oauth",
    "instagram_error",
    "social_oauth",
    "oauth_provider",
    "oauth_error"
  ].forEach((k) => u.searchParams.delete(k));
  u.hash = "";
  window.history.replaceState({}, "", `${u.pathname}${u.search}`);
}

function detectOAuthMode(search, hash) {
  const social = search.get("social_oauth") || hash.get("social_oauth");
  if (social) {
    return {
      mode: social,
      provider: search.get("oauth_provider") || hash.get("provider") || hash.get("oauth_provider") || "kakao",
      error:
        search.get("oauth_error") ||
        hash.get("oauth_error") ||
        search.get("kakao_error") ||
        search.get("google_error") ||
        ""
    };
  }
  const kakao = search.get("kakao_oauth") || hash.get("kakao_oauth");
  if (kakao) {
    return {
      mode: kakao,
      provider: "kakao",
      error: search.get("kakao_error") || hash.get("kakao_error") || ""
    };
  }
  const google = search.get("google_oauth") || hash.get("google_oauth");
  if (google) {
    return {
      mode: google,
      provider: "google",
      error: search.get("google_error") || hash.get("google_error") || ""
    };
  }
  const naver = search.get("naver_oauth") || hash.get("naver_oauth");
  if (naver) {
    return {
      mode: naver,
      provider: "naver",
      error: search.get("naver_error") || hash.get("naver_error") || ""
    };
  }
  const instagram = search.get("instagram_oauth") || hash.get("instagram_oauth");
  if (instagram) {
    return {
      mode: instagram,
      provider: "instagram",
      error: search.get("instagram_error") || hash.get("instagram_error") || search.get("oauth_error") || ""
    };
  }
  return null;
}

/**
 * 카카오/Google OAuth 콜백 후 URL에 담긴 결과 처리.
 * @returns {{handled:boolean,success:boolean,message?:string,session?:object,provider?:string}}
 */
export function consumeSocialOAuthReturn() {
  if (typeof window === "undefined") return { handled: false, success: false };

  const search = new URLSearchParams(window.location.search);
  const hash = parseHashParams();
  const detected = detectOAuthMode(search, hash);
  if (!detected) return { handled: false, success: false };

  const provider = String(detected.provider || "kakao").toLowerCase();
  const label =
    provider === "google"
      ? "Google"
      : provider === "kakao"
        ? "카카오"
        : provider === "naver"
          ? "네이버"
          : provider === "instagram"
            ? "Instagram"
            : provider;

  if (detected.mode === "error") {
    const message =
      detected.error || `${label} 로그인에 실패했습니다. 다시 시도해 주세요.`;
    stripOAuthFromUrl();
    return {
      handled: true,
      success: false,
      provider,
      message: decodeURIComponent(message)
    };
  }

  if (detected.mode === "success") {
    const accessToken = hash.get("accessToken") || "";
    const refreshToken = hash.get("refreshToken") || "";
    const userId = hash.get("userId") || "";
    const publicHandle = hash.get("publicHandle") || "";
    const legalName = hash.get("legalName") || "";
    const accountStatus = hash.get("accountStatus") || "pending_identity";
    const providerFromHash = (hash.get("provider") || provider).toLowerCase();

    stripOAuthFromUrl();

    if (!accessToken || !userId) {
      return {
        handled: true,
        success: false,
        provider: providerFromHash,
        message: "로그인 정보가 올바르지 않습니다. 다시 시도해 주세요."
      };
    }

    try {
      localStorage.removeItem(SAVED_ID_KEY);
      localStorage.removeItem(SAVED_PASSWORD_KEY);
      localStorage.removeItem(REMEMBER_KEY);
      localStorage.setItem("vlue_social_login_provider", providerFromHash);
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

    return { handled: true, success: true, provider: providerFromHash, session };
  }

  stripOAuthFromUrl();
  return {
    handled: true,
    success: false,
    provider,
    message: `알 수 없는 ${label} 로그인 응답입니다.`
  };
}

/** @deprecated use consumeSocialOAuthReturn */
export function consumeKakaoOAuthReturn() {
  return consumeSocialOAuthReturn();
}
