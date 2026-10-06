import { createHmac, timingSafeEqual } from "node:crypto";

export type SocialLoginLinkProvider = "kakao" | "google" | "naver" | "instagram";

function oauthSigningSecret(): string {
  const s =
    process.env.SESSION_SECRET?.trim() ||
    process.env.JWT_ACCESS_SECRET?.trim() ||
    process.env.JWT_SECRET?.trim();
  if (s) return s;
  if (process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET 또는 JWT_ACCESS_SECRET이 필요합니다.");
  }
  return "dev-only-vlue-social-login-link-secret";
}

/** 간편 로그인 사후 연동용 서명 state (userId + provider) */
export function createSocialLoginLinkState(
  userId: string,
  provider: SocialLoginLinkProvider
): string {
  const uid = String(userId || "").trim();
  if (!uid) throw new Error("연동할 사용자 ID가 없습니다.");
  const payload = Buffer.from(
    JSON.stringify({
      u: uid,
      p: provider,
      purpose: "social_login_link",
      exp: Date.now() + 10 * 60 * 1000
    }),
    "utf8"
  ).toString("base64url");
  const sig = createHmac("sha256", oauthSigningSecret()).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export function verifySocialLoginLinkState(
  state: string
): { userId: string; provider: SocialLoginLinkProvider } | null {
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
      p?: string;
      purpose?: string;
      exp?: number;
    };
    if (parsed?.purpose !== "social_login_link") return null;
    if (!parsed?.u || typeof parsed.exp !== "number" || parsed.exp < Date.now()) return null;
    const p = String(parsed.p || "").toLowerCase();
    if (p !== "kakao" && p !== "google" && p !== "naver" && p !== "instagram") return null;
    const userId = String(parsed.u).trim();
    if (!userId) return null;
    return { userId, provider: p };
  } catch {
    return null;
  }
}
