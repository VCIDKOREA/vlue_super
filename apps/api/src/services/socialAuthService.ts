import type { AccountStatus, SocialLoginProvider } from "@prisma/client";
import { prisma } from "../db/client.js";
import { fetchKakaoUserFromAccessToken } from "../integrations/kakao/kakaoUserMe.js";
import { fetchGoogleUserFromAccessToken } from "../integrations/google/googleOAuth.js";
import { fetchInstagramProfile } from "../integrations/instagram/instagramOAuth.js";
import { resolvePublicHandleForNewUser } from "../lib/publicHandle.js";
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
  isNewUser?: boolean;
} & TokenPair;

type HonoLikeReq = { header: (name: string) => string | undefined };

type ResolvedSocialIdentity = {
  provider: SocialLoginProvider;
  providerUserId: string;
  providerEmail: string | null;
  displayName: string | null;
  emailVerified: boolean;
};

function normalizeProvider(raw: string): SocialLoginProvider | null {
  const p = raw.trim().toLowerCase();
  if (p === "kakao") return "kakao";
  if (p === "naver") return "naver";
  if (p === "google") return "google";
  if (p === "instagram") return "instagram";
  return null;
}

function signupMethodForProvider(provider: SocialLoginProvider): string {
  return `social_${provider}`;
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
        null,
      displayName: k.nickname || (typeof body.nickname === "string" ? body.nickname.trim() : null) || null,
      emailVerified: Boolean(k.emailVerified)
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
      response?: { id?: string; email?: string; nickname?: string; name?: string };
    };
    const providerUserId = String(json.response?.id || "").trim();
    if (!providerUserId) {
      throw new Error("네이버 사용자 식별자를 확인할 수 없습니다.");
    }
    return {
      provider: "naver",
      providerUserId,
      providerEmail: json.response?.email || null,
      displayName: json.response?.nickname || json.response?.name || null,
      emailVerified: Boolean(json.response?.email)
    };
  }

  if (provider === "google") {
    const g = await fetchGoogleUserFromAccessToken(token);
    return {
      provider: "google",
      providerUserId: g.id,
      providerEmail: g.email,
      displayName: g.name || (typeof body.nickname === "string" ? body.nickname.trim() : null) || null,
      emailVerified: g.emailVerified
    };
  }

  if (provider === "instagram") {
    const ig = await fetchInstagramProfile(token);
    return {
      provider: "instagram",
      providerUserId: ig.igUserId || ig.appScopedUserId,
      providerEmail: null,
      displayName: ig.username || null,
      emailVerified: false
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

async function createUserFromSocial(identity: ResolvedSocialIdentity) {
  const publicHandle = await resolvePublicHandleForNewUser(prisma, null);
  let email: string | null = identity.providerEmail;
  if (email) {
    const clash = await prisma.user.findUnique({
      where: { email },
      select: { id: true }
    });
    if (clash) email = null;
  }

  const provisionalName = identity.displayName ? identity.displayName.slice(0, 120) : null;

  const created = await prisma.user.create({
    data: {
      publicHandle,
      email,
      legalName: provisionalName,
      identityVerified: false,
      accountStatus: "pending_identity",
      signupMethod: signupMethodForProvider(identity.provider),
      socialProvider: identity.provider,
      socialId: identity.providerUserId,
      isVerified: Boolean(identity.emailVerified && identity.providerEmail),
      status: "ACTIVE",
      currentDiscountRate: 30,
      socialLoginLinks: {
        create: {
          provider: identity.provider,
          providerUserId: identity.providerUserId,
          providerEmail: identity.providerEmail,
          lastLoginAt: new Date()
        }
      }
    },
    select: {
      id: true,
      legalName: true,
      publicHandle: true,
      accountStatus: true,
      phoneE164: true
    }
  });

  return created;
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
  req: HonoLikeReq,
  isNewUser = false
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
    isNewUser,
    ...pair
  };
}

/**
 * 소셜 로그인 upsert — 연동 계정이 없으면 pending_identity 유저를 즉시 생성한다.
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
  if (mapped?.user) {
    return loginMappedUser(mapped.user, identity, req, false);
  }

  const created = await createUserFromSocial(identity);
  return loginMappedUser(created, identity, req, true);
}

/**
 * 로그인된 VLUE 계정에 소셜 1:1 연동 (추가 연결).
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
