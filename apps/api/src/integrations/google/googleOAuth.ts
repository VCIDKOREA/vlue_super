import { getGoogleClientId, getGoogleClientSecret, getGoogleOAuthRedirectUri } from "./googleEnv.js";

const GOOGLE_AUTH_BASE = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo";

export function buildGoogleAuthorizeUrl(state: string): string {
  const clientId = getGoogleClientId();
  if (!clientId) {
    throw new Error("GOOGLE_CLIENT_ID가 설정되지 않았습니다.");
  }
  const redirectUri = getGoogleOAuthRedirectUri();
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    state,
    scope: "openid email profile",
    access_type: "online",
    prompt: "select_account",
    include_granted_scopes: "true"
  });
  return `${GOOGLE_AUTH_BASE}?${params.toString()}`;
}

export async function exchangeGoogleCodeForAccessToken(code: string): Promise<string> {
  const clientId = getGoogleClientId();
  const clientSecret = getGoogleClientSecret();
  const redirectUri = getGoogleOAuthRedirectUri();
  if (!clientId) throw new Error("GOOGLE_CLIENT_ID가 설정되지 않았습니다.");
  if (!clientSecret) throw new Error("GOOGLE_CLIENT_SECRET이 설정되지 않았습니다.");

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    code: String(code || "").trim()
  });

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString()
  });

  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const err =
      (typeof json.error_description === "string" && json.error_description) ||
      (typeof json.error === "string" && json.error) ||
      `Google 토큰 발급 실패 (${res.status})`;
    throw new Error(err);
  }

  const accessToken = typeof json.access_token === "string" ? json.access_token.trim() : "";
  if (!accessToken) {
    throw new Error("Google 응답에 access_token이 없습니다.");
  }
  return accessToken;
}

export type GoogleUserProfile = {
  id: string;
  email: string | null;
  emailVerified: boolean;
  name: string | null;
};

export async function fetchGoogleUserFromAccessToken(accessToken: string): Promise<GoogleUserProfile> {
  const res = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const err =
      (typeof json.error_description === "string" && json.error_description) ||
      (typeof json.error === "string" && json.error) ||
      `Google 사용자 정보 조회 실패 (${res.status})`;
    throw new Error(err);
  }

  const id = String(json.sub || json.id || "").trim();
  if (!id) {
    throw new Error("Google 사용자 식별자를 확인할 수 없습니다.");
  }

  const email = typeof json.email === "string" ? json.email.trim() : "";
  const emailVerified = json.email_verified === true || json.email_verified === "true";
  const name = typeof json.name === "string" ? json.name.trim() : null;

  return {
    id,
    email: email || null,
    emailVerified,
    name
  };
}
