import type { AccountStatus, SocialLoginProvider } from "@prisma/client";
import { prisma } from "../db/client.js";
import { fetchKakaoUserFromAccessToken } from "../integrations/kakao/kakaoUserMe.js";
import { fetchGoogleUserFromAccessToken } from "../integrations/google/googleOAuth.js";
import { fetchInstagramProfile } from "../integrations/instagram/instagramOAuth.js";
import { resolvePublicHandleForNewUser } from "../lib/publicHandle.js";
import { issueTokenPair, type TokenPair } from "./authSessions.js";

/** @deprecated 소셜 즉시 가입으로 전환됨 — 하위 호환용 */
export const SOCIAL_NOT_LINKED_MESSAGE =
  "이 SNS 계정과 연동되어 있지 않습니다. 카카오·네이버·Google로 간편 가입하거나, 아이디 회원가입을 이용해 주세요.";

export class SocialAuthError extends Error {
  statusCode: number;
  code: string;
  constructor(message: string, statusCode = 403, code = "SOCIAL_NOT_LINKED") {
    super(message);
    this.name = "SocialAuthError";
    this.statusCode = statusCode;
    this.code = code;
  }
}

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
  /** 휴대폰 본인인증(PASS) 완료 여부 — DCC 발급 시 필요 */
  identityVerified: boolean;
} & TokenPair;

type HonoLikeReq = { header: (name: string) => string | undefined };

type ResolvedSocialIdentity = {
  provider: SocialLoginProvider;
  providerUserId: string;
  providerEmail: string | null;
  displayName: string | null;
  profileImageUrl: string | null;
  emailVerified: boolean;
};

async function upsertSocialLoginLink(userId: string, identity: ResolvedSocialIdentity) {
  const nick = String(identity.displayName || "").trim().slice(0, 120) || null;
  const { normalizeSocialPhotoUrl } = await import("../lib/socialPhotoUrl.js");
  const photo = normalizeSocialPhotoUrl(identity.profileImageUrl) || null;
  return prisma.userSocialLoginLink.upsert({
    where: {
      userId_provider: { userId, provider: identity.provider }
    },
    create: {
      userId,
      provider: identity.provider,
      providerUserId: identity.providerUserId,
      providerEmail: identity.providerEmail,
      providerNickname: nick,
      providerProfileImageUrl: photo,
      lastLoginAt: new Date()
    },
    update: {
      providerUserId: identity.providerUserId,
      providerEmail: identity.providerEmail,
      ...(nick ? { providerNickname: nick } : {}),
      ...(photo ? { providerProfileImageUrl: photo } : {}),
      lastLoginAt: new Date()
    }
  });
}

function normalizeProvider(raw: string): SocialLoginProvider | null {
  const p = raw.trim().toLowerCase();
  if (p === "kakao") return "kakao";
  if (p === "naver") return "naver";
  if (p === "google") return "google";
  if (p === "instagram") return "instagram";
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
        null,
      displayName: k.nickname || (typeof body.nickname === "string" ? body.nickname.trim() : null) || null,
      profileImageUrl: k.profileImageUrl || null,
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
      response?: {
        id?: string;
        email?: string;
        nickname?: string;
        name?: string;
        profile_image?: string;
      };
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
      profileImageUrl: String(json.response?.profile_image || "").trim() || null,
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
      profileImageUrl: g.picture || null,
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
      profileImageUrl: ig.profilePictureUrl || null,
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
          phoneE164: true,
          identityVerified: true
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
      phoneE164: true,
      identityVerified: true
    }
  });
  if (!legacy && identity.provider === "kakao") {
    const kakaoProfile = await prisma.userKakaoLink.findFirst({
      where: { kakaoUserId: identity.providerUserId },
      include: {
        user: {
          select: {
            id: true,
            legalName: true,
            publicHandle: true,
            accountStatus: true,
            phoneE164: true,
            identityVerified: true
          }
        }
      }
    });
    if (kakaoProfile?.user) {
      await upsertSocialLoginLink(kakaoProfile.user.id, identity);
      return { user: kakaoProfile.user, via: "kakao_profile" as const };
    }
  }

  if (!legacy) return null;

  await upsertSocialLoginLink(legacy.id, identity);

  return { user: legacy, via: "legacy_migrated" as const };
}

async function loginMappedUser(
  user: {
    id: string;
    legalName: string | null;
    publicHandle: string | null;
    accountStatus: AccountStatus;
    phoneE164: string | null;
    identityVerified?: boolean;
  },
  identity: ResolvedSocialIdentity,
  req: HonoLikeReq,
  isNewUser = false
): Promise<SocialLoginResponse> {
  await upsertSocialLoginLink(user.id, identity);

  let identityVerified = Boolean(user.identityVerified);
  if (user.identityVerified === undefined) {
    const row = await prisma.user.findUnique({
      where: { id: user.id },
      select: { identityVerified: true }
    });
    identityVerified = Boolean(row?.identityVerified);
  }

  const pair = await issueTokenPair(user.id, req);
  return {
    userId: user.id,
    legalName: user.legalName || "",
    publicHandle: user.publicHandle || "",
    accountStatus: user.accountStatus,
    phoneE164: user.phoneE164,
    linkedProvider: identity.provider,
    isNewUser,
    identityVerified,
    ...pair
  };
}

/**
 * 소셜 최소 정보로 즉시 가입 — 본인인증(PASS)은 DCC 발급 시점으로 지연.
 */
async function createSocialUser(
  identity: ResolvedSocialIdentity
): Promise<{
  id: string;
  legalName: string | null;
  publicHandle: string | null;
  accountStatus: AccountStatus;
  phoneE164: string | null;
  identityVerified: boolean;
}> {
  const publicHandle = await resolvePublicHandleForNewUser(prisma, null);
  const provisionalName =
    String(identity.displayName || "").trim().slice(0, 40) ||
    `${identity.provider}회원`;
  const email =
    identity.providerEmail && identity.emailVerified
      ? identity.providerEmail.trim().toLowerCase().slice(0, 190)
      : null;

  if (email) {
    const emailTaken = await prisma.user.findFirst({
      where: { email },
      select: { id: true }
    });
    if (emailTaken) {
      throw new SocialAuthError(
        "이 이메일로 이미 가입된 계정이 있습니다. 아이디·비밀번호로 로그인한 뒤 마이페이지에서 SNS를 연동해 주세요.",
        409,
        "EMAIL_TAKEN"
      );
    }
  }

  const created = await prisma.user.create({
    data: {
      legalName: provisionalName,
      publicHandle,
      email,
      signupMethod: identity.provider,
      socialProvider: identity.provider,
      socialId: identity.providerUserId,
      activeProfileSource: identity.provider,
      displayNameMode: "nickname",
      identityVerified: false,
      accountStatus: "active",
      status: "ACTIVE",
      currentDiscountRate: 30,
      requiresParentalConsent: false
    },
    select: {
      id: true,
      legalName: true,
      publicHandle: true,
      accountStatus: true,
      phoneE164: true,
      identityVerified: true
    }
  });

  await upsertSocialLoginLink(created.id, identity);

  return created;
}

/**
 * 소셜 간편 로그인 — 연동 계정이 없으면 최소 정보로 즉시 가입.
 * 본인인증(PASS)은 VLUE DCC 발급 시점에만 요구한다.
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

  const created = await createSocialUser(identity);
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
    select: { id: true, signupMethod: true, identityVerified: true }
  });
  if (!user) throw new Error("사용자를 찾을 수 없습니다.");
  /* 소셜 즉시 가입 유저도 추가 SNS 연동 허용. 미인증·미소셜 계정만 제한. */
  const isSocialSignup = ["kakao", "naver", "google", "instagram"].includes(
    String(user.signupMethod || "")
  );
  if (!user.identityVerified && !isSocialSignup) {
    throw new SocialAuthError(
      "휴대폰 본인인증 또는 소셜 가입 후에 SNS 계정을 연동할 수 있습니다.",
      403,
      "IDENTITY_REQUIRED"
    );
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

  const link = await upsertSocialLoginLink(userId, identity);

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
      providerNickname: link.providerNickname,
      providerProfileImageUrl: link.providerProfileImageUrl,
      linkedAt: link.linkedAt
    }
  };
}

/** 간편 로그인 연동 해제. 같은 제공자의 프로필 연동도 지워서 다른 계정으로 다시 인증할 수 있게 한다. */
export async function unlinkSocialLogin(userId: string, providerRaw: string) {
  const provider = normalizeProvider(String(providerRaw || ""));
  if (!provider) throw new Error("지원하지 않는 소셜 연동입니다.");

  await prisma.userSocialLoginLink.deleteMany({ where: { userId, provider } });
  if (provider === "kakao") {
    await prisma.userKakaoLink.deleteMany({ where: { userId } });
  }
  if (provider === "instagram") {
    await prisma.userInstagramLink.deleteMany({ where: { userId } });
  }
  await prisma.user.updateMany({
    where: { id: userId, socialProvider: provider },
    data: { socialProvider: null, socialId: null }
  });
  await prisma.user.updateMany({
    where: { id: userId, activeProfileSource: provider },
    data: { activeProfileSource: "vlue" }
  });
  return { ok: true, provider };
}
