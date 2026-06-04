import { getKakaoClientId, getKakaoClientSecret, getKakaoOAuthRedirectUri } from "./kakaoEnv.js";

const KAKAO_AUTH_BASE = "https://kauth.kakao.com/oauth/authorize";
const KAKAO_TOKEN_URL = "https://kauth.kakao.com/oauth/token";

export function buildKakaoAuthorizeUrl(state: string): string {
  const clientId = getKakaoClientId();
  if (!clientId) {
    throw new Error("KAKAO_CLIENT_ID(또는 KAKAO_REST_API_KEY)가 설정되지 않았습니다.");
  }
  const redirectUri = getKakaoOAuthRedirectUri();
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    state,
    scope: "account_email profile_nickname"
  });
  return `${KAKAO_AUTH_BASE}?${params.toString()}`;
}

export async function exchangeKakaoCodeForAccessToken(code: string): Promise<string> {
  const clientId = getKakaoClientId();
  const clientSecret = getKakaoClientSecret();
  const redirectUri = getKakaoOAuthRedirectUri();
  if (!clientId) {
    throw new Error("KAKAO_CLIENT_ID(또는 KAKAO_REST_API_KEY)가 설정되지 않았습니다.");
  }
  if (!clientSecret) {
    throw new Error("KAKAO_CLIENT_SECRET이 설정되지 않았습니다.");
  }

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    code: String(code || "").trim()
  });

  const res = await fetch(KAKAO_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded;charset=utf-8" },
    body: body.toString()
  });

  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const err =
      (typeof json.error_description === "string" && json.error_description) ||
      (typeof json.error === "string" && json.error) ||
      `카카오 토큰 발급 실패 (${res.status})`;
    throw new Error(err);
  }

  const accessToken = typeof json.access_token === "string" ? json.access_token.trim() : "";
  if (!accessToken) {
    throw new Error("카카오 응답에 access_token이 없습니다.");
  }
  return accessToken;
}
