import {
  getNaverClientId,
  getNaverClientSecret,
  getNaverOAuthRedirectUri
} from "./naverEnv.js";

const NAVER_AUTH_BASE = "https://nid.naver.com/oauth2.0/authorize";
const NAVER_TOKEN_URL = "https://nid.naver.com/oauth2.0/token";
const NAVER_LOGOUT_URL = "https://nid.naver.com/nidlogin.logout";

export function buildNaverAuthorizeUrl(state: string): string {
  const clientId = getNaverClientId();
  if (!clientId) throw new Error("NAVER_OAUTH_CLIENT_ID가 설정되지 않았습니다.");

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: getNaverOAuthRedirectUri(),
    state,
    /* 이미 동의한 계정이어도 동의항목 화면을 다시 연다. 검수·계정 변경에 필요. */
    auth_type: "reprompt"
  });
  return `${NAVER_AUTH_BASE}?${params.toString()}`;
}

/** 네이버 로그인 쿠키를 지운 뒤 동의 화면으로 보낸다. 다른 계정으로 다시 연동할 수 있다. */
export function buildNaverFreshAuthorizeUrl(state: string): string {
  const authorize = buildNaverAuthorizeUrl(state);
  return `${NAVER_LOGOUT_URL}?returl=${encodeURIComponent(authorize)}`;
}

export async function exchangeNaverCodeForAccessToken(
  code: string,
  state: string
): Promise<string> {
  const clientId = getNaverClientId();
  const clientSecret = getNaverClientSecret();
  if (!clientId) throw new Error("NAVER_OAUTH_CLIENT_ID가 설정되지 않았습니다.");
  if (!clientSecret) throw new Error("NAVER_OAUTH_CLIENT_SECRET이 설정되지 않았습니다.");

  const params = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: clientId,
    client_secret: clientSecret,
    code: String(code || "").trim(),
    state: String(state || "").trim()
  });

  const res = await fetch(`${NAVER_TOKEN_URL}?${params.toString()}`);
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok || json.error) {
    const message =
      (typeof json.error_description === "string" && json.error_description) ||
      (typeof json.error === "string" && json.error) ||
      `네이버 토큰 발급 실패 (${res.status})`;
    throw new Error(message);
  }

  const accessToken = typeof json.access_token === "string" ? json.access_token.trim() : "";
  if (!accessToken) throw new Error("네이버 응답에 access_token이 없습니다.");
  return accessToken;
}
