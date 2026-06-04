import { Hono } from "hono";
import { randomBytes } from "node:crypto";
import { getCookie, setCookie } from "hono/cookie";
import { buildKakaoAuthorizeUrl, exchangeKakaoCodeForAccessToken } from "../integrations/kakao/kakaoOAuth.js";
import { getFrontendOrigin } from "../integrations/kakao/kakaoEnv.js";
import { completeSocialLogin, linkSocialAccountToUser } from "../services/socialAuthService.js";
import { requireUserHeader } from "../middleware/cardGate.js";
import { prisma } from "../db/client.js";

export const authV1Routes = new Hono();

const STATE_COOKIE = "vlue_kakao_oauth_state";
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

function redirectAuthError(message: string): Response {
  const loc = frontendRedirect({
    kakao_oauth: "error",
    kakao_error: message.slice(0, 240)
  });
  return Response.redirect(loc, 302);
}

function redirectAuthSuccess(payload: {
  accessToken: string;
  refreshToken: string;
  userId: string;
  publicHandle: string;
  legalName: string;
  accountStatus: string;
}): Response {
  const loc = frontendRedirect(
    { kakao_oauth: "success" },
    {
      accessToken: payload.accessToken,
      refreshToken: payload.refreshToken,
      userId: payload.userId,
      publicHandle: payload.publicHandle,
      legalName: payload.legalName,
      accountStatus: payload.accountStatus
    }
  );
  return Response.redirect(loc, 302);
}

/** 카카오 인증 페이지로 리다이렉트 */
authV1Routes.get("/kakao", (c) => {
  try {
    const state = randomBytes(24).toString("base64url");
    setCookie(c, STATE_COOKIE, state, {
      path: "/",
      httpOnly: true,
      secure: isProduction(),
      sameSite: "Lax",
      maxAge: STATE_MAX_AGE
    });
    const url = buildKakaoAuthorizeUrl(state);
    return c.redirect(url, 302);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "카카오 로그인을 시작할 수 없습니다.";
    return redirectAuthError(msg);
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
    return redirectAuthError(msg);
  }

  const state = c.req.query("state") || "";
  const cookieState = getCookie(c, STATE_COOKIE) || "";
  if (!state || !cookieState || state !== cookieState) {
    return redirectAuthError("로그인 요청이 만료되었거나 위조되었습니다. 다시 시도해 주세요.");
  }

  const code = c.req.query("code");
  if (!code) {
    return redirectAuthError("카카오 인가 코드가 없습니다.");
  }

  try {
    const accessToken = await exchangeKakaoCodeForAccessToken(code);
    const result = await completeSocialLogin(
      { provider: "kakao", socialToken: accessToken },
      { header: (n) => c.req.header(n) }
    );
    return redirectAuthSuccess({
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      userId: result.userId,
      publicHandle: result.publicHandle,
      legalName: result.legalName,
      accountStatus: String(result.accountStatus)
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "카카오 로그인 처리에 실패했습니다.";
    return redirectAuthError(msg);
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

/** VLUE 마스터 계정에 카카오/네이버 1:1 연동 (신규 소셜 가입 불가) */
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
