import { createHmac, timingSafeEqual } from "node:crypto";
import { getKakaoClientId, getKakaoClientSecret, getKakaoOAuthRedirectUri } from "./kakaoEnv.js";

const KAKAO_AUTH_BASE = "https://kauth.kakao.com/oauth/authorize";
const KAKAO_TOKEN_URL = "https://kauth.kakao.com/oauth/token";

function oauthSigningSecret(): string {
  const s =
    process.env.SESSION_SECRET?.trim() ||
    process.env.JWT_ACCESS_SECRET?.trim() ||
    process.env.JWT_SECRET?.trim();
  if (s) return s;
  if (process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET 또는 JWT_ACCESS_SECRET이 필요합니다.");
  }
  return "dev-only-vlue-kakao-oauth-secret";
}

/** VLUE userId를 담은 서명 state — 쇼케이스 카카오 프로필 연동용 */
export function createKakaoLinkState(userId: string): string {
  const uid = String(userId || "").trim();
  if (!uid) throw new Error("연동할 사용자 ID가 없습니다.");
  const payload = Buffer.from(
    JSON.stringify({
      u: uid,
      exp: Date.now() + 10 * 60 * 1000
    }),
    "utf8"
  ).toString("base64url");
  const sig = createHmac("sha256", oauthSigningSecret()).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export function verifyKakaoLinkState(state: string): string | null {
  const raw = String(state || "").trim();
  const dot = raw.lastIndexOf(".");
  if (dot <= 0) return null;
  const payload = raw.slice(0, dot);
  const sig = raw.slice(dot + 1);
  if (!payload || !sig) return null;

  const expected = createHmac("sha256", oauthSigningSecret()).update(payload).digest("base64url");
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      u?: string;
      exp?: number;
    };
    if (!parsed?.u || typeof parsed.exp !== "number" || parsed.exp < Date.now()) return null;
    return String(parsed.u).trim() || null;
  } catch {
    return null;
  }
}

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
    scope: "account_email profile_nickname profile_image"
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
