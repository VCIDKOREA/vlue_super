import { Hono } from "hono";
import { randomBytes } from "node:crypto";
import { getCookie, setCookie } from "hono/cookie";
import { buildKakaoAuthorizeUrl, createKakaoLinkState, exchangeKakaoCodeForAccessToken, verifyKakaoLinkState } from "../integrations/kakao/kakaoOAuth.js";
import { getFrontendOrigin } from "../integrations/kakao/kakaoEnv.js";
import { buildGoogleAuthorizeUrl, exchangeGoogleCodeForAccessToken } from "../integrations/google/googleOAuth.js";
import { buildNaverAuthorizeUrl, exchangeNaverCodeForAccessToken } from "../integrations/naver/naverOAuth.js";
import {
  buildInstagramAuthorizeUrl,
  createInstagramLinkState,
  exchangeInstagramCodeForShortLivedToken,
  exchangeInstagramShortLivedForLongLived,
  verifyInstagramLinkState
} from "../integrations/instagram/instagramOAuth.js";
import { completeSocialLogin, linkSocialAccountToUser } from "../services/socialAuthService.js";
import {
  completeKakaoLinkForUser,
  disconnectKakaoLink,
  getKakaoLinkStatus
} from "../services/kakaoLinkService.js";
import {
  completeInstagramLinkForUser,
  disconnectInstagramLink,
  getInstagramLinkStatus,
  listLinkedInstagramMedia,
  resolveLinkedInstagramMediaUrls
} from "../services/instagramLinkService.js";
import { requireUserHeader } from "../middleware/cardGate.js";
import { prisma } from "../db/client.js";

export const authV1Routes = new Hono();

const KAKAO_STATE_COOKIE = "vlue_kakao_oauth_state";
const GOOGLE_STATE_COOKIE = "vlue_google_oauth_state";
const NAVER_STATE_COOKIE = "vlue_naver_oauth_state";
const INSTAGRAM_STATE_COOKIE = "vlue_instagram_oauth_state";
const STATE_MAX_AGE = 600;

function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

/** OAuth/SNS 콜백 — www 마케팅 셸(#showcase)로 복귀 (브라우저 /app 차단 회피) */
function redirectWebMarketing(
  query: Record<string, string>,
  hash?: Record<string, string>,
  hashView = "showcase"
): string {
  const origin = getFrontendOrigin().replace(/\/$/, "");
  const q = new URLSearchParams(query).toString();
  if (hash && Object.keys(hash).length) {
    const h = new URLSearchParams(hash).toString();
    return q ? `${origin}/?${q}#${h}` : `${origin}/#${h}`;
  }
  return q ? `${origin}/?${q}#${hashView}` : `${origin}/#${hashView}`;
}

function redirectWebMarketingResponse(
  query: Record<string, string>,
  hash?: Record<string, string>,
  hashView = "showcase"
): Response {
  return Response.redirect(redirectWebMarketing(query, hash, hashView), 302);
}

/** @deprecated — 신규 OAuth는 redirectWebMarketing 사용 */
function frontendRedirect(query: Record<string, string>, hash?: Record<string, string>): string {
  return redirectWebMarketing(query, hash, "showcase");
}

type OAuthProvider = "kakao" | "google" | "naver" | "instagram";

function redirectAuthError(provider: OAuthProvider, message: string): Response {
  return redirectWebMarketingResponse({
    social_oauth: "error",
    oauth_provider: provider,
    // 하위 호환
    ...(provider === "kakao"
      ? { kakao_oauth: "error", kakao_error: message.slice(0, 240) }
      : provider === "google"
        ? { google_oauth: "error", google_error: message.slice(0, 240) }
        : provider === "naver"
          ? { naver_oauth: "error", naver_error: message.slice(0, 240) }
          : { instagram_oauth: "error", instagram_error: message.slice(0, 240) }),
    oauth_error: message.slice(0, 240)
  });
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
  return redirectWebMarketingResponse(
    {
      social_oauth: "success",
      oauth_provider: provider,
      ...(provider === "kakao"
        ? { kakao_oauth: "success" }
        : provider === "google"
          ? { google_oauth: "success" }
          : provider === "naver"
            ? { naver_oauth: "success" }
            : { instagram_oauth: "success" })
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

function redirectKakaoLink(query: Record<string, string>): Response {
  return redirectWebMarketingResponse(query);
}

/** 카카오 인증 페이지로 리다이렉트 */
authV1Routes.get("/kakao", (c) => {
  try {
    const state = randomBytes(24).toString("base64url");
    setOAuthStateCookie(c, KAKAO_STATE_COOKIE, state);
    const url = buildKakaoAuthorizeUrl(state, "login");
    return c.redirect(url, 302);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "카카오 로그인을 시작할 수 없습니다.";
    return redirectAuthError("kakao", msg);
  }
});

/** 카카오 OAuth 콜백 — 쇼케이스 연동(signed state) 또는 VLUE 간편 로그인(cookie state) */
authV1Routes.get("/kakao/callback", async (c) => {
  const kakaoErr = c.req.query("error");
  const kakaoErrDesc = c.req.query("error_description");
  const state = c.req.query("state") || "";
  if (kakaoErr) {
    const msg =
      (kakaoErrDesc && String(kakaoErrDesc).trim()) ||
      (kakaoErr === "access_denied" ? "카카오 로그인이 취소되었습니다." : `카카오 인증 오류: ${kakaoErr}`);
    if (verifyKakaoLinkState(state)) {
      return redirectKakaoLink({
        kakao_oauth: "error",
        kakao_error: msg.slice(0, 240)
      });
    }
    return redirectAuthError("kakao", msg);
  }

  const code = c.req.query("code");
  if (!code) {
    if (verifyKakaoLinkState(state)) {
      return redirectKakaoLink({
        kakao_oauth: "error",
        kakao_error: "카카오 인가 코드가 없습니다."
      });
    }
    return redirectAuthError("kakao", "카카오 인가 코드가 없습니다.");
  }

  const linkUserId = verifyKakaoLinkState(state);
  if (linkUserId) {
    try {
      const link = await completeKakaoLinkForUser(linkUserId, code);
      const redirectQuery: Record<string, string> = {
        kakao_oauth: "success",
        kakao_user_id: link.kakaoUserId
      };
      if (link.nickname) redirectQuery.kakao_nickname = link.nickname;
      if (link.profileImageUrl) redirectQuery.kakao_profile_image = link.profileImageUrl;
      return redirectKakaoLink(redirectQuery);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "카카오 연동 처리에 실패했습니다.";
      return redirectKakaoLink({
        kakao_oauth: "error",
        kakao_error: msg.slice(0, 240)
      });
    }
  }

  const cookieState = getCookie(c, KAKAO_STATE_COOKIE) || "";
  if (!state || !cookieState || state !== cookieState) {
    return redirectAuthError("kakao", "로그인 요청이 만료되었거나 위조되었습니다. 다시 시도해 주세요.");
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

/**
 * 카카오 프로필 SNS 인증 시작 (쇼케이스).
 * VLUE 로그인 필요 → authorize URL 반환 후 클라이언트가 리다이렉트.
 */
authV1Routes.post("/kakao/link/start", requireUserHeader, async (c) => {
  try {
    const userId = c.get("vlueUserId") as string;
    const state = createKakaoLinkState(userId);
    const url = buildKakaoAuthorizeUrl(state, "link");
    return c.json({ url });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "카카오 연동을 시작할 수 없습니다.";
    return c.json({ error: msg }, 400);
  }
});

authV1Routes.get("/kakao/status", requireUserHeader, async (c) => {
  const userId = c.get("vlueUserId") as string;
  const status = await getKakaoLinkStatus(userId);
  return c.json(status);
});

authV1Routes.delete("/kakao/link", requireUserHeader, async (c) => {
  const userId = c.get("vlueUserId") as string;
  await disconnectKakaoLink(userId);
  return c.json({ ok: true });
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

/** Google OAuth 콜백 — 연동된 계정만 로그인 후 프론트로 리다이렉트 */
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

function redirectInstagramLink(query: Record<string, string>): Response {
  return redirectWebMarketingResponse(query);
}

/** Instagram 간편 로그인 (쇼케이스 연동과 동일 OAuth · state 쿠키). 미연동이면 가입하지 않음. */
authV1Routes.get("/instagram", (c) => {
  try {
    const state = randomBytes(24).toString("base64url");
    setOAuthStateCookie(c, INSTAGRAM_STATE_COOKIE, state);
    return c.redirect(buildInstagramAuthorizeUrl(state), 302);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Instagram 로그인을 시작할 수 없습니다.";
    return redirectAuthError("instagram", msg);
  }
});

/**
 * Instagram 프로 계정 연동 시작 (쇼케이스 게시물 선택용).
 * VLUE 로그인 필요 → authorize URL 반환 후 클라이언트가 리다이렉트.
 */
authV1Routes.post("/instagram/link/start", requireUserHeader, async (c) => {
  try {
    const userId = c.get("vlueUserId") as string;
    const state = createInstagramLinkState(userId);
    const url = buildInstagramAuthorizeUrl(state);
    return c.json({
      url,
      hint:
        "Meta 앱 대시보드 → Instagram → Business login settings의 Instagram App ID·Redirect URI가 이 요청과 바이트 단위로 일치해야 합니다."
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Instagram 연동을 시작할 수 없습니다.";
    return c.json({ error: msg }, 400);
  }
});

/**
 * Instagram OAuth 콜백
 * - signed link state → 쇼케이스 연동
 * - cookie state → VLUE 간편 로그인 (미연동이면 가입 차단)
 */
authV1Routes.get("/instagram/callback", async (c) => {
  const igErr = c.req.query("error");
  const igErrDesc = c.req.query("error_description");
  if (igErr) {
    const msg =
      (igErrDesc && String(igErrDesc).replace(/\+/g, " ").trim()) ||
      (igErr === "access_denied"
        ? "Instagram 인증이 취소되었습니다."
        : `Instagram 인증 오류: ${igErr}`);
    const cookieState = getCookie(c, INSTAGRAM_STATE_COOKIE) || "";
    if (cookieState) return redirectAuthError("instagram", msg);
    return redirectInstagramLink({
      instagram_oauth: "error",
      instagram_error: msg.slice(0, 240)
    });
  }

  const state = c.req.query("state") || "";
  const code = c.req.query("code");
  if (!code) {
    return redirectAuthError("instagram", "Instagram 인가 코드가 없습니다.");
  }

  const linkUserId = verifyInstagramLinkState(state);
  if (linkUserId) {
    try {
      const link = await completeInstagramLinkForUser(linkUserId, code);
      return redirectInstagramLink({
        instagram_oauth: "success",
        instagram_username: link.username
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Instagram 연동 처리에 실패했습니다.";
      return redirectInstagramLink({
        instagram_oauth: "error",
        instagram_error: msg.slice(0, 240)
      });
    }
  }

  const cookieState = getCookie(c, INSTAGRAM_STATE_COOKIE) || "";
  if (!state || !cookieState || state !== cookieState) {
    return redirectAuthError(
      "instagram",
      "로그인 요청이 만료되었거나 위조되었습니다. 다시 시도해 주세요."
    );
  }

  try {
    const short = await exchangeInstagramCodeForShortLivedToken(code);
    let accessToken = short.accessToken;
    try {
      const long = await exchangeInstagramShortLivedForLongLived(short.accessToken);
      accessToken = long.accessToken;
    } catch {
      /* 단기 토큰으로 로그인 가능 */
    }

    const result = await completeSocialLogin(
      { provider: "instagram", socialToken: accessToken },
      { header: (n) => c.req.header(n) }
    );

    /* 로그인 성공 시 쇼케이스용 미디어 연동 토큰도 함께 저장 (코드는 이미 소비됨 → 토큰 upsert) */
    try {
      const { fetchInstagramProfile } = await import("../integrations/instagram/instagramOAuth.js");
      const profile = await fetchInstagramProfile(accessToken);
      await prisma.userInstagramLink.upsert({
        where: { userId: result.userId },
        create: {
          userId: result.userId,
          igUserId: profile.igUserId,
          username: profile.username,
          accessToken,
          tokenExpiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
          accountType: profile.accountType
        },
        update: {
          igUserId: profile.igUserId,
          username: profile.username,
          accessToken,
          tokenExpiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
          accountType: profile.accountType
        }
      });
    } catch (e2) {
      console.warn("[instagram] login link upsert failed:", e2 instanceof Error ? e2.message : e2);
    }

    return redirectAuthSuccess("instagram", {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      userId: result.userId,
      publicHandle: result.publicHandle,
      legalName: result.legalName,
      accountStatus: String(result.accountStatus)
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Instagram 로그인 처리에 실패했습니다.";
    return redirectAuthError("instagram", msg);
  }
});

/** Instagram 연동 상태 */
authV1Routes.get("/instagram/status", requireUserHeader, async (c) => {
  const userId = c.get("vlueUserId") as string;
  const status = await getInstagramLinkStatus(userId);
  return c.json(status);
});

/** 연동된 Instagram 미디어 목록 (permalink 선택용) */
authV1Routes.get("/instagram/media", requireUserHeader, async (c) => {
  try {
    const userId = c.get("vlueUserId") as string;
    const limitRaw = Number(c.req.query("limit") || 40);
    const result = await listLinkedInstagramMedia(userId, Number.isFinite(limitRaw) ? limitRaw : 40);
    return c.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "미디어를 불러오지 못했습니다.";
    const status = (e as { status?: number })?.status;
    return c.json({ error: msg }, status === 401 || status === 404 ? status : 400);
  }
});

/** 선택 media id의 media_url 재조회 (만료 URL 갱신 · 파일 저장 없음) */
authV1Routes.post("/instagram/media/resolve", requireUserHeader, async (c) => {
  try {
    const userId = c.get("vlueUserId") as string;
    const body = (await c.req.json().catch(() => ({}))) as { ids?: unknown };
    const ids = Array.isArray(body.ids) ? body.ids.map(String).filter(Boolean) : [];
    const result = await resolveLinkedInstagramMediaUrls(userId, ids);
    return c.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "미디어 URL을 갱신하지 못했습니다.";
    const status = (e as { status?: number })?.status;
    return c.json({ error: msg }, status === 401 || status === 404 ? status : 400);
  }
});

/** Instagram 연동 해제 */
authV1Routes.delete("/instagram/link", requireUserHeader, async (c) => {
  const userId = c.get("vlueUserId") as string;
  await disconnectInstagramLink(userId);
  return c.json({ ok: true });
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
    const status = (e as Error & { statusCode?: number }).statusCode === 403 ? 403 : 400;
    return c.json({ error: msg }, status);
  }
});
