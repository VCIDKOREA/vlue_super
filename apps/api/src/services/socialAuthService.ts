import type { AccountStatus, SocialLoginProvider } from "@prisma/client";
import { prisma } from "../db/client.js";
import { fetchKakaoUserFromAccessToken } from "../integrations/kakao/kakaoUserMe.js";
import { issueTokenPair, type TokenPair } from "./authSessions.js";

export type SocialLoginRequestBody = {
  socialToken?: string;
  provider?: string;
  email?: string;
  nickname?: string;
};

export type SocialLoginResponse = {
  userId: string;
  legalName: string;
  publicHandle: string;
  accountStatus: AccountStatus;
  phoneE164: string | null;
  linkedProvider: SocialLoginProvider;
} & TokenPair;

type HonoLikeReq = { header: (name: string) => string | undefined };

type ResolvedSocialIdentity = {
  provider: SocialLoginProvider;
  providerUserId: string;
  providerEmail: string | null;
};

function normalizeProvider(raw: string): SocialLoginProvider | null {
  const p = raw.trim().toLowerCase();
  if (p === "kakao") return "kakao";
  if (p === "naver") return "naver";
  return null;
}

async function resolveSocialIdentity(
  provider: SocialLoginProvider,
  token: string,
  body: SocialLoginRequestBody
): Promise<ResolvedSocialIdentity> {
  if (provider === "kakao") {
    const k = await fetchKakaoUserFromAccessToken(token);
    return {
      provider: "kakao",
      providerUserId: k.id,
      providerEmail:
        k.email ||
        (typeof body.email === "string" && body.email.trim() ? body.email.trim() : null) ||
        null
    };
  }

  if (provider === "naver") {
    const res = await fetch("https://openapi.naver.com/v1/nid/me", {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) {
      throw new Error("네이버 토큰 검증에 실패했습니다.");
    }
    const json = (await res.json()) as {
      response?: { id?: string; email?: string };
    };
    const providerUserId = String(json.response?.id || "").trim();
    if (!providerUserId) {
      throw new Error("네이버 사용자 식별자를 확인할 수 없습니다.");
    }
    return {
      provider: "naver",
      providerUserId,
      providerEmail: json.response?.email || null
    };
  }

  throw new Error(`지원하지 않는 provider: ${provider}`);
}

async function findUserBySocialMapping(identity: ResolvedSocialIdentity) {
  const link = await prisma.userSocialLoginLink.findUnique({
    where: {
      provider_providerUserId: {
        provider: identity.provider,
        providerUserId: identity.providerUserId
      }
    },
    include: {
      user: {
        select: {
          id: true,
          legalName: true,
          publicHandle: true,
          accountStatus: true,
          phoneE164: true
        }
      }
    }
  });
  if (link?.user) return { user: link.user, via: "link_table" as const };

  const legacy = await prisma.user.findFirst({
    where: {
      socialProvider: identity.provider,
      socialId: identity.providerUserId
    },
    select: {
      id: true,
      legalName: true,
      publicHandle: true,
      accountStatus: true,
      phoneE164: true
    }
  });
  if (!legacy) return null;

  await prisma.userSocialLoginLink.upsert({
    where: {
      userId_provider: { userId: legacy.id, provider: identity.provider }
    },
    create: {
      userId: legacy.id,
      provider: identity.provider,
      providerUserId: identity.providerUserId,
      providerEmail: identity.providerEmail
    },
    update: {
      providerUserId: identity.providerUserId,
      providerEmail: identity.providerEmail,
      lastLoginAt: new Date()
    }
  });

  return { user: legacy, via: "legacy_migrated" as const };
}

async function loginMappedUser(
  user: {
    id: string;
    legalName: string | null;
    publicHandle: string | null;
    accountStatus: AccountStatus;
    phoneE164: string | null;
  },
  identity: ResolvedSocialIdentity,
  req: HonoLikeReq
): Promise<SocialLoginResponse> {
  await prisma.userSocialLoginLink.updateMany({
    where: { userId: user.id, provider: identity.provider },
    data: { lastLoginAt: new Date() }
  });

  const pair = await issueTokenPair(user.id, req);
  return {
    userId: user.id,
    legalName: user.legalName || "",
    publicHandle: user.publicHandle || "",
    accountStatus: user.accountStatus,
    phoneE164: user.phoneE164,
    linkedProvider: identity.provider,
    ...pair
  };
}

/**
 * 연동된 소셜 계정으로만 로그인 — 신규 User 생성 금지 (VLUE 순정 가입 정책).
 */
export async function completeSocialLogin(
  body: SocialLoginRequestBody,
  req: HonoLikeReq
): Promise<SocialLoginResponse> {
  const provider = normalizeProvider(String(body.provider || ""));
  const token = String(body.socialToken || "").trim();
  if (!provider || !token) {
    throw new Error("provider와 socialToken이 필요합니다.");
  }

  const identity = await resolveSocialIdentity(provider, token, body);
  const mapped = await findUserBySocialMapping(identity);
  if (!mapped?.user) {
    throw new Error(
      "연동된 VLUE 계정이 없습니다. VLUE 순정 회원가입 후 [설정 > 소셜 연동]에서 카카오/네이버를 연결해 주세요."
    );
  }

  return loginMappedUser(mapped.user, identity, req);
}

/**
 * 로그인된 VLUE 마스터 계정에 소셜 1:1 연동.
 */
export async function linkSocialAccountToUser(
  userId: string,
  body: SocialLoginRequestBody,
  req: HonoLikeReq
) {
  const provider = normalizeProvider(String(body.provider || ""));
  const token = String(body.socialToken || "").trim();
  if (!provider || !token) {
    throw new Error("provider와 socialToken이 필요합니다.");
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, signupMethod: true }
  });
  if (!user) throw new Error("사용자를 찾을 수 없습니다.");
  if (user.signupMethod !== "vlue_native") {
    throw new Error("VLUE 순정 가입 계정만 소셜 연동할 수 있습니다.");
  }

  const identity = await resolveSocialIdentity(provider, token, body);

  const taken = await prisma.userSocialLoginLink.findUnique({
    where: {
      provider_providerUserId: {
        provider: identity.provider,
        providerUserId: identity.providerUserId
      }
    },
    select: { userId: true }
  });
  if (taken && taken.userId !== userId) {
    throw new Error("이 소셜 계정은 이미 다른 VLUE 계정에 연동되어 있습니다.");
  }

  const link = await prisma.userSocialLoginLink.upsert({
    where: {
      userId_provider: { userId, provider: identity.provider }
    },
    create: {
      userId,
      provider: identity.provider,
      providerUserId: identity.providerUserId,
      providerEmail: identity.providerEmail
    },
    update: {
      providerUserId: identity.providerUserId,
      providerEmail: identity.providerEmail,
      lastLoginAt: new Date()
    }
  });

  await prisma.user.update({
    where: { id: userId },
    data: {
      socialProvider: identity.provider,
      socialId: identity.providerUserId
    }
  });

  return {
    ok: true,
    link: {
      id: link.id,
      provider: link.provider,
      providerUserId: link.providerUserId,
      linkedAt: link.linkedAt
    }
  };
}
