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

export type KakaoOAuthPurpose = "login" | "link";

/** 콘솔에 등록·활성화된 동의 항목만 scope에 포함 (미설정 항목 → KOE205) */
function resolveKakaoScopes(purpose: KakaoOAuthPurpose): string {
  if (purpose === "link") {
    return String(process.env.KAKAO_LINK_SCOPES || "profile_nickname").trim();
  }
  return String(process.env.KAKAO_LOGIN_SCOPES || "account_email profile_nickname").trim();
}

export function buildKakaoAuthorizeUrl(state: string, purpose: KakaoOAuthPurpose = "login"): string {
  const clientId = getKakaoClientId();
  if (!clientId) {
    throw new Error("KAKAO_CLIENT_ID(또는 KAKAO_REST_API_KEY)가 설정되지 않았습니다.");
  }
  const redirectUri = getKakaoOAuthRedirectUri();
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    state
  });
  const scope = resolveKakaoScopes(purpose);
  if (scope) params.set("scope", scope);
  return `${KAKAO_AUTH_BASE}?${params.toString()}`;
}

function kakaoTokenErrorMessage(json: Record<string, unknown>, status: number): string {
  const code = typeof json.error === "string" ? json.error : "";
  const desc =
    (typeof json.error_description === "string" && json.error_description) ||
    code ||
    `카카오 토큰 발급 실패 (${status})`;

  if (
    code === "invalid_client" ||
    /bad client credentials/i.test(desc) ||
    /invalid client/i.test(desc)
  ) {
    return (
      "카카오 REST API 키와 Client Secret이 일치하지 않습니다. " +
      "카카오 콘솔 → 플랫폼 키 → REST API 키 → 클라이언트 시크릿에서 코드를 다시 생성·활성화한 뒤 " +
      "Railway KAKAO_CLIENT_SECRET에 붙여넣고, KAKAO_CLIENT_ID가 REST 키와 다르면 삭제해 주세요."
    );
  }
  return desc;
}

async function postKakaoToken(body: URLSearchParams): Promise<string> {
  const res = await fetch(KAKAO_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded;charset=utf-8" },
    body: body.toString()
  });

  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    throw new Error(kakaoTokenErrorMessage(json, res.status));
  }

  const accessToken = typeof json.access_token === "string" ? json.access_token.trim() : "";
  if (!accessToken) {
    throw new Error("카카오 응답에 access_token이 없습니다.");
  }
  return accessToken;
}

export async function exchangeKakaoCodeForAccessToken(code: string): Promise<string> {
  const clientId = getKakaoClientId();
  const clientSecret = getKakaoClientSecret();
  const redirectUri = getKakaoOAuthRedirectUri();
  if (!clientId) {
    throw new Error("KAKAO_REST_API_KEY(또는 KAKAO_CLIENT_ID)가 설정되지 않았습니다.");
  }

  const base = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: clientId,
    redirect_uri: redirectUri,
    code: String(code || "").trim()
  });

  if (clientSecret) {
    const withSecret = new URLSearchParams(base);
    withSecret.set("client_secret", clientSecret);
    try {
      return await postKakaoToken(withSecret);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const badCreds = /일치하지 않습니다|bad client credentials|invalid_client/i.test(msg);
      if (badCreds) {
        try {
          return await postKakaoToken(base);
        } catch {
          throw err;
        }
      }
      throw err;
    }
  }

  return postKakaoToken(base);
}
