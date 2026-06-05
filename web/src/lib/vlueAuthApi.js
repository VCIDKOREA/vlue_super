/**
 * VLUE 통합 인증 — 마케팅 웹·슈퍼앱 동일 @vlue/api (/api/auth/*)
 */
import { apiUrl } from "./apiBase.js";
import { clientKindHeaders, getDeviceToken, saveDeviceToken } from "./deviceAuth.js";
import {
  clearVlueSessionTokens,
  getAccessToken,
  getRefreshToken,
  setVlueSessionTokens,
  vlueAuthFetch
} from "./vlueAuthHeaders.js";
import { fetchKakaoUserMeClient, getKakaoAccessTokenWithLogin } from "./kakaoSocialLogin.js";
import { formatSocialLoginError } from "./socialLoginPolicy.js";
import { isValidMemberPassword, MEMBER_PASSWORD_INVALID_MESSAGE } from "./memberPasswordRules.js";
import { normalizeMemberHandleSlug } from "./memberHandleRules.js";

export const VLUE_MARKETING_SESSION_KEY = "vlue_marketing_logged_in";
export const VLUE_MARKETING_SIGNUP_KEY = "vlue_marketing_signup";
/** 슈퍼앱 App.jsx 와 동일 세션 플래그 */
export const VLUE_APP_SESSION_KEY = "vlue_logged_in";

/** @typedef {{
 *   userId: string;
 *   loginId: string;
 *   legalName?: string;
 *   accountStatus?: string;
 *   email: string;
 *   grade?: 'basic' | 'certified';
 * }} MarketingAuthUser */

function displayLabelFromSession(data) {
  const handle = String(data?.publicHandle || "").trim();
  if (handle) return handle.startsWith("@") ? handle : `@${handle}`;
  const name = String(data?.legalName || "").trim();
  if (name) return name;
  return String(data?.loginId || "VLUE 회원");
}

/** API 로그인 응답 → localStorage + 반환 사용자 */
export function persistVlueAuthSession(data) {
  if (data?.userId) {
    try {
      localStorage.setItem("vlue_server_user_id", String(data.userId));
    } catch {
      /* ignore */
    }
  }
  if (data?.accessToken || data?.refreshToken) {
    setVlueSessionTokens({
      accessToken: data.accessToken,
      refreshToken: data.refreshToken
    });
  }
  if (data?.publicHandle) {
    try {
      localStorage.setItem("vlue_member_handle", `@${String(data.publicHandle).replace(/^@+/, "")}`);
    } catch {
      /* ignore */
    }
  }
  if (data?.legalName) {
    try {
      localStorage.setItem("vlue_legal_name", String(data.legalName).trim());
    } catch {
      /* ignore */
    }
  }
  if (data?.accountStatus != null) {
    try {
      localStorage.setItem("vlue_account_status", String(data.accountStatus));
    } catch {
      /* ignore */
    }
  }
  if (data?.deviceToken) saveDeviceToken(data.deviceToken);

  try {
    localStorage.setItem(VLUE_MARKETING_SESSION_KEY, "1");
    localStorage.setItem(VLUE_APP_SESSION_KEY, "1");
  } catch {
    /* ignore */
  }

  const loginId = normalizeMemberHandleSlug(data?.publicHandle || data?.loginId || "");
  return {
    userId: String(data?.userId || ""),
    loginId,
    legalName: data?.legalName ? String(data.legalName) : undefined,
    accountStatus: data?.accountStatus ? String(data.accountStatus) : undefined,
    email: displayLabelFromSession({ ...data, loginId }),
    grade: "basic"
  };
}

/** 저장된 JWT·프로필로 마케팅 세션 복원 */
export function restoreMarketingAuthUser() {
  try {
    const loggedIn =
      localStorage.getItem(VLUE_MARKETING_SESSION_KEY) === "1" ||
      localStorage.getItem(VLUE_APP_SESSION_KEY) === "1";
    if (!loggedIn) return null;
    if (!getAccessToken() && !getRefreshToken()) return null;
  } catch {
    return null;
  }

  const userId = localStorage.getItem("vlue_server_user_id") || "";
  const handle = (localStorage.getItem("vlue_member_handle") || "").replace(/^@+/, "");
  const legalName = localStorage.getItem("vlue_legal_name") || "";

  if (!userId && !getAccessToken()) return null;

  return {
    userId,
    loginId: handle,
    legalName: legalName || undefined,
    accountStatus: localStorage.getItem("vlue_account_status") || undefined,
    email: handle ? `@${handle}` : legalName || "VLUE 회원",
    grade: "basic"
  };
}

/**
 * @param {{ loginId: string; password: string }} input
 * @returns {Promise<{ ok: true; user: MarketingAuthUser } | { ok: false; error: string; devicePending?: boolean }>}
 */
export async function vlueLoginWithCredentials(input) {
  const loginId = normalizeMemberHandleSlug(input.loginId);
  const password = String(input.password ?? "");
  if (!loginId || !password) {
    return { ok: false, error: "아이디와 비밀번호를 입력해 주세요." };
  }
  if (!isValidMemberPassword(password)) {
    return { ok: false, error: MEMBER_PASSWORD_INVALID_MESSAGE };
  }

  const res = await fetch(apiUrl("/api/auth/login"), {
    method: "POST",
    headers: { "Content-Type": "application/json", ...clientKindHeaders() },
    body: JSON.stringify({
      loginId,
      password,
      deviceToken: getDeviceToken()
    })
  });
  const data = await res.json().catch(() => ({}));

  if (data?.status === "device_pending" || (res.status === 403 && data?.deviceToken)) {
    if (data.deviceToken) saveDeviceToken(data.deviceToken);
    return {
      ok: false,
      error:
        data?.message ||
        "이 기기는 승인이 필요합니다. 승인된 기기에서 승인 후 다시 로그인해 주세요.",
      devicePending: true
    };
  }

  if (!res.ok) {
    return { ok: false, error: data?.error || "로그인에 실패했습니다." };
  }

  const user = persistVlueAuthSession(data);
  return { ok: true, user };
}

/**
 * @param {'kakao'|'naver'|'google'} provider
 */
export async function vlueSocialLogin(provider) {
  if (provider !== "kakao") {
    return {
      ok: false,
      error:
        provider === "google" || provider === "naver"
          ? `${provider === "naver" ? "네이버" : "Google"} 간편 로그인은 VLUE 가입 후 마이페이지에서 연동할 수 있습니다. 카카오 또는 아이디 로그인을 이용해 주세요.`
          : "지원하지 않는 간편 로그인입니다."
    };
  }

  try {
    const accessToken = await getKakaoAccessTokenWithLogin();
    const me = await fetchKakaoUserMeClient(accessToken);
    const res = await fetch(apiUrl("/api/auth/social-login"), {
      method: "POST",
      headers: { "Content-Type": "application/json", ...clientKindHeaders() },
      body: JSON.stringify({
        socialToken: accessToken,
        provider: "kakao",
        email: me.email || "",
        nickname: me.nickname || ""
      })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, error: formatSocialLoginError(data?.error) };
    }
    try {
      localStorage.setItem("vlue_social_login_provider", "kakao");
    } catch {
      /* ignore */
    }
    const user = persistVlueAuthSession(data);
    return { ok: true, user };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "카카오 로그인에 실패했습니다."
    };
  }
}

/** 슈퍼앱과 동일한 본인인증·약관 가입 플로우로 이동 */
export function redirectToAppSignup(mode = "signup") {
  try {
    sessionStorage.setItem(VLUE_MARKETING_SIGNUP_KEY, mode);
    if (mode === "signup_certified") {
      sessionStorage.setItem("vlue_onboarding_prefer_trust", "1");
    }
  } catch {
    /* ignore */
  }
  window.location.href = "/app";
}

export async function vlueMarketingLogout() {
  const rt = getRefreshToken();
  if (rt) {
    try {
      await fetch(apiUrl("/api/auth/logout"), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...vlueAuthHeaders() },
        body: JSON.stringify({ refreshToken: rt })
      });
    } catch {
      /* ignore */
    }
  }
  clearVlueSessionTokens();
  try {
    localStorage.removeItem(VLUE_MARKETING_SESSION_KEY);
    localStorage.removeItem(VLUE_APP_SESSION_KEY);
    localStorage.removeItem("vlue_server_user_id");
    localStorage.removeItem("vlue_member_handle");
    localStorage.removeItem("vlue_legal_name");
    localStorage.removeItem("vlue_account_status");
  } catch {
    /* ignore */
  }
}

/** 토큰 유효성 간단 확인 (401 시 refresh는 vlueAuthFetch가 처리) */
export async function pingAuthSession() {
  const token = getAccessToken();
  if (!token) return false;
  try {
    const res = await vlueAuthFetch(apiUrl("/api/office/files"));
    return res.status !== 401;
  } catch {
    return !!getAccessToken();
  }
}
