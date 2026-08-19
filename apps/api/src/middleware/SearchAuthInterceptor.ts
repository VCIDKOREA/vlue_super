/**
 * V1 쇼케이스 검색 — 권한 가드
 * 로그인 → 본인인증(CI). 검색자 DCC·유료 여부는 요구하지 않음.
 */
import type { Context, Next } from "hono";
import { prisma } from "../db/client.js";
import { resolveRequestUserId } from "../lib/authContext.js";
import { assertSearchRateLimit } from "../services/showcase/SearchRateLimiter.js";

export type SearchAuthCode =
  | "LOGIN_REQUIRED"
  | "ACCOUNT_SUSPENDED"
  | "IDENTITY_REQUIRED"
  | "SHOWCASE_REQUIRED"
  | "RATE_LIMITED";

export type SearchAuthOk = {
  ok: true;
  userId: string;
};

export type SearchAuthFail = {
  ok: false;
  status: 401 | 403 | 429;
  code: SearchAuthCode;
  error: string;
  /** 프론트 팝업·리다이렉트 힌트 */
  meta?: {
    loginRequired?: boolean;
    redirect?: string;
    popup?: string;
    retryAfterSec?: number;
    suspended?: boolean;
  };
};

export type SearchAuthResult = SearchAuthOk | SearchAuthFail;

/**
 * 상호주의 검색 자격 판정 (미들웨어·서비스 공용)
 */
export async function evaluateShowcaseSearchAuth(userId: string | null): Promise<SearchAuthResult> {
  if (!userId) {
    return {
      ok: false,
      status: 401,
      code: "LOGIN_REQUIRED",
      error: "쇼케이스 검색은 로그인 후 이용할 수 있습니다.",
      meta: {
        loginRequired: true,
        popup: "login",
        redirect: "/login"
      }
    };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      publicHandle: true,
      accountStatus: true,
      status: true,
      identityVerified: true,
      ciHash: true,
      searchSuspendedAt: true
    }
  });

  if (!user || user.status === "DELETED") {
    return {
      ok: false,
      status: 401,
      code: "LOGIN_REQUIRED",
      error: "유효한 계정이 아닙니다. 다시 로그인해 주세요.",
      meta: { loginRequired: true, popup: "login", redirect: "/login" }
    };
  }

  if (user.accountStatus === "suspended" || user.searchSuspendedAt) {
    return {
      ok: false,
      status: 403,
      code: "ACCOUNT_SUSPENDED",
      error: "보안 정책에 의해 검색이 제한된 계정입니다. 고객센터로 문의해 주세요.",
      meta: { redirect: "/support" }
    };
  }

  const { isPlatformCeoHandle } = await import("../services/admin/platformAccountRoles.js");
  const isCeo = isPlatformCeoHandle(user.publicHandle);

  /* 플랫폼 ceo — 휴대폰 본인인증·CI·승인 전부 통과로 간주 (로그인 시 DB도 동기화) */
  if (isCeo) {
    const { ensurePlatformCeoPremium } = await import(
      "../services/membership/platformCeoPremium.js"
    );
    await ensurePlatformCeoPremium(user.id);
  } else if (!user.identityVerified || !user.ciHash) {
    /* 범죄자 가명 가입 방어: 본인인증(CI) 완료 필수 */
    return {
      ok: false,
      status: 403,
      code: "IDENTITY_REQUIRED",
      error: "휴대폰 본인인증이 완료된 계정만 쇼케이스 검색을 이용할 수 있습니다.",
      meta: { redirect: "/onboarding/identity", popup: "identity" }
    };
  }

  const rate = await assertSearchRateLimit(user.id);
  if (!rate.ok) {
    return {
      ok: false,
      status: 429,
      code: "RATE_LIMITED",
      error: rate.error,
      meta: rate.meta
    };
  }

  return { ok: true, userId: user.id };
}

/**
 * Hono 미들웨어 — 쇼케이스 검색 라우트 전용
 */
export async function SearchAuthInterceptor(c: Context, next: Next) {
  const me = await resolveRequestUserId(c);
  const gate = await evaluateShowcaseSearchAuth(me);
  if (!gate.ok) {
    return c.json(
      {
        ok: false,
        error: gate.error,
        code: gate.code,
        meta: gate.meta
      },
      gate.status
    );
  }
  c.set("vlueUserId", gate.userId);
  c.set("showcaseSearchAllowed", true);
  await next();
}
