import { Hono } from "hono";
import { randomBytes } from "node:crypto";
import { getCookie, setCookie } from "hono/cookie";
import { buildKakaoAuthorizeUrl, exchangeKakaoCodeForAccessToken } from "../integrations/kakao/kakaoOAuth.js";
import { getFrontendOrigin } from "../integrations/kakao/kakaoEnv.js";
import { buildGoogleAuthorizeUrl, exchangeGoogleCodeForAccessToken } from "../integrations/google/googleOAuth.js";
import { buildNaverAuthorizeUrl, exchangeNaverCodeForAccessToken } from "../integrations/naver/naverOAuth.js";
import { completeSocialLogin, linkSocialAccountToUser } from "../services/socialAuthService.js";
import { requireUserHeader } from "../middleware/cardGate.js";
import { prisma } from "../db/client.js";

export const authV1Routes = new Hono();

const KAKAO_STATE_COOKIE = "vlue_kakao_oauth_state";
const GOOGLE_STATE_COOKIE = "vlue_google_oauth_state";
const NAVER_STATE_COOKIE = "vlue_naver_oauth_state";
const STATE_MAX_AGE = 600;

function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

function frontendRedirect(query: Record<string, string>, hash?: Record<string, string>): string {
  const base = getFrontendOrigin();
  const q = new URLSearchParams(query).toString();
  const url = q ? `${base}/?${q}` : `${base}/`;
  if (!hash || !Object.keys(hash).length) return url;
  const h = new URLSearchParams(hash).toString();
  return `${url}#${h}`;
}

type OAuthProvider = "kakao" | "google" | "naver";

function redirectAuthError(provider: OAuthProvider, message: string): Response {
  const loc = frontendRedirect({
    social_oauth: "error",
    oauth_provider: provider,
    // 하위 호환
    ...(provider === "kakao"
      ? { kakao_oauth: "error", kakao_error: message.slice(0, 240) }
      : provider === "google"
        ? { google_oauth: "error", google_error: message.slice(0, 240) }
        : { naver_oauth: "error", naver_error: message.slice(0, 240) }),
    oauth_error: message.slice(0, 240)
  });
  return Response.redirect(loc, 302);
}

function redirectAuthSuccess(
  provider: OAuthProvider,
  payload: {
    accessToken: string;
    refreshToken: string;
    userId: string;
    publicHandle: string;
    legalName: string;
    accountStatus: string;
  }
): Response {
  const loc = frontendRedirect(
    {
      social_oauth: "success",
      oauth_provider: provider,
      ...(provider === "kakao"
        ? { kakao_oauth: "success" }
        : provider === "google"
          ? { google_oauth: "success" }
          : { naver_oauth: "success" })
    },
    {
      accessToken: payload.accessToken,
      refreshToken: payload.refreshToken,
      userId: payload.userId,
      publicHandle: payload.publicHandle,
      legalName: payload.legalName,
      accountStatus: payload.accountStatus,
      provider
    }
  );
  return Response.redirect(loc, 302);
}

function setOAuthStateCookie(c: Parameters<typeof setCookie>[0], name: string, state: string) {
  setCookie(c, name, state, {
    path: "/",
    httpOnly: true,
    secure: isProduction(),
    sameSite: "Lax",
    maxAge: STATE_MAX_AGE
  });
}

/** 카카오 인증 페이지로 리다이렉트 */
authV1Routes.get("/kakao", (c) => {
  try {
    const state = randomBytes(24).toString("base64url");
    setOAuthStateCookie(c, KAKAO_STATE_COOKIE, state);
    const url = buildKakaoAuthorizeUrl(state);
    return c.redirect(url, 302);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "카카오 로그인을 시작할 수 없습니다.";
    return redirectAuthError("kakao", msg);
  }
});

/** 카카오 OAuth 콜백 — JWT 발급 후 프론트로 리다이렉트 */
authV1Routes.get("/kakao/callback", async (c) => {
  const kakaoErr = c.req.query("error");
  const kakaoErrDesc = c.req.query("error_description");
  if (kakaoErr) {
    const msg =
      (kakaoErrDesc && String(kakaoErrDesc).trim()) ||
      (kakaoErr === "access_denied" ? "카카오 로그인이 취소되었습니다." : `카카오 인증 오류: ${kakaoErr}`);
    return redirectAuthError("kakao", msg);
  }

  const state = c.req.query("state") || "";
  const cookieState = getCookie(c, KAKAO_STATE_COOKIE) || "";
  if (!state || !cookieState || state !== cookieState) {
    return redirectAuthError("kakao", "로그인 요청이 만료되었거나 위조되었습니다. 다시 시도해 주세요.");
  }

  const code = c.req.query("code");
  if (!code) {
    return redirectAuthError("kakao", "카카오 인가 코드가 없습니다.");
  }

  try {
    const accessToken = await exchangeKakaoCodeForAccessToken(code);
    const result = await completeSocialLogin(
      { provider: "kakao", socialToken: accessToken },
      { header: (n) => c.req.header(n) }
    );
    return redirectAuthSuccess("kakao", {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      userId: result.userId,
      publicHandle: result.publicHandle,
      legalName: result.legalName,
      accountStatus: String(result.accountStatus)
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "카카오 로그인 처리에 실패했습니다.";
    return redirectAuthError("kakao", msg);
  }
});

/** Google 인증 페이지로 리다이렉트 */
authV1Routes.get("/google", (c) => {
  try {
    const state = randomBytes(24).toString("base64url");
    setOAuthStateCookie(c, GOOGLE_STATE_COOKIE, state);
    const url = buildGoogleAuthorizeUrl(state);
    return c.redirect(url, 302);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Google 로그인을 시작할 수 없습니다.";
    return redirectAuthError("google", msg);
  }
});

/** Google OAuth 콜백 — 즉시 가입/로그인 후 프론트로 리다이렉트 */
authV1Routes.get("/google/callback", async (c) => {
  const googleErr = c.req.query("error");
  const googleErrDesc = c.req.query("error_description");
  if (googleErr) {
    const msg =
      (googleErrDesc && String(googleErrDesc).trim()) ||
      (googleErr === "access_denied" ? "Google 로그인이 취소되었습니다." : `Google 인증 오류: ${googleErr}`);
    return redirectAuthError("google", msg);
  }

  const state = c.req.query("state") || "";
  const cookieState = getCookie(c, GOOGLE_STATE_COOKIE) || "";
  if (!state || !cookieState || state !== cookieState) {
    return redirectAuthError("google", "로그인 요청이 만료되었거나 위조되었습니다. 다시 시도해 주세요.");
  }

  const code = c.req.query("code");
  if (!code) {
    return redirectAuthError("google", "Google 인가 코드가 없습니다.");
  }

  try {
    const accessToken = await exchangeGoogleCodeForAccessToken(code);
    const result = await completeSocialLogin(
      { provider: "google", socialToken: accessToken },
      { header: (n) => c.req.header(n) }
    );
    return redirectAuthSuccess("google", {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      userId: result.userId,
      publicHandle: result.publicHandle,
      legalName: result.legalName,
      accountStatus: String(result.accountStatus)
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Google 로그인 처리에 실패했습니다.";
    return redirectAuthError("google", msg);
  }
});

/** 네이버 인증 페이지로 리다이렉트 */
authV1Routes.get("/naver", (c) => {
  try {
    const state = randomBytes(24).toString("base64url");
    setOAuthStateCookie(c, NAVER_STATE_COOKIE, state);
    return c.redirect(buildNaverAuthorizeUrl(state), 302);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "네이버 로그인을 시작할 수 없습니다.";
    return redirectAuthError("naver", msg);
  }
});

/** 네이버 OAuth 콜백 — 즉시 가입/로그인 후 프론트로 리다이렉트 */
authV1Routes.get("/naver/callback", async (c) => {
  const naverErr = c.req.query("error");
  const naverErrDesc = c.req.query("error_description");
  if (naverErr) {
    const msg =
      (naverErrDesc && String(naverErrDesc).trim()) ||
      (naverErr === "access_denied"
        ? "네이버 로그인이 취소되었습니다."
        : `네이버 인증 오류: ${naverErr}`);
    return redirectAuthError("naver", msg);
  }

  const state = c.req.query("state") || "";
  const cookieState = getCookie(c, NAVER_STATE_COOKIE) || "";
  if (!state || !cookieState || state !== cookieState) {
    return redirectAuthError(
      "naver",
      "로그인 요청이 만료되었거나 위조되었습니다. 다시 시도해 주세요."
    );
  }

  const code = c.req.query("code");
  if (!code) return redirectAuthError("naver", "네이버 인가 코드가 없습니다.");

  try {
    const accessToken = await exchangeNaverCodeForAccessToken(code, state);
    const result = await completeSocialLogin(
      { provider: "naver", socialToken: accessToken },
      { header: (n) => c.req.header(n) }
    );
    return redirectAuthSuccess("naver", {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      userId: result.userId,
      publicHandle: result.publicHandle,
      legalName: result.legalName,
      accountStatus: String(result.accountStatus)
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "네이버 로그인 처리에 실패했습니다.";
    return redirectAuthError("naver", msg);
  }
});

/** 연동된 소셜 계정 목록 */
authV1Routes.get("/social/links", requireUserHeader, async (c) => {
  const userId = c.get("vlueUserId") as string;
  const links = await prisma.userSocialLoginLink.findMany({
    where: { userId },
    select: {
      id: true,
      provider: true,
      providerUserId: true,
      providerEmail: true,
      linkedAt: true,
      lastLoginAt: true
    },
    orderBy: { linkedAt: "asc" }
  });
  return c.json({ links });
});

/** 로그인 계정에 추가 소셜 연동 */
authV1Routes.post("/social/link", requireUserHeader, async (c) => {
  try {
    const userId = c.get("vlueUserId") as string;
    const body = await c.req.json<{
      provider?: string;
      socialToken?: string;
      email?: string;
      nickname?: string;
    }>();
    const result = await linkSocialAccountToUser(userId, body, { header: (n) => c.req.header(n) });
    return c.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "소셜 연동에 실패했습니다.";
    return c.json({ error: msg }, 400);
  }
});
