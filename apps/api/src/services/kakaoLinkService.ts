import { prisma } from "../db/client.js";
import { exchangeKakaoCodeForAccessToken } from "../integrations/kakao/kakaoOAuth.js";
import { fetchKakaoUserFromAccessToken } from "../integrations/kakao/kakaoUserMe.js";

export async function completeKakaoLinkForUser(userId: string, code: string) {
  const accessToken = await exchangeKakaoCodeForAccessToken(code);
  const profile = await fetchKakaoUserFromAccessToken(accessToken);

  const link = await prisma.userKakaoLink.upsert({
    where: { userId },
    create: {
      userId,
      kakaoUserId: profile.id,
      nickname: profile.nickname || `카카오${profile.id.slice(-4)}`,
      profileImageUrl: profile.profileImageUrl,
      accessToken
    },
    update: {
      kakaoUserId: profile.id,
      nickname: profile.nickname || `카카오${profile.id.slice(-4)}`,
      profileImageUrl: profile.profileImageUrl,
      accessToken
    }
  });

  return {
    kakaoUserId: link.kakaoUserId,
    nickname: link.nickname,
    profileImageUrl: link.profileImageUrl
  };
}

export async function getKakaoLinkStatus(userId: string) {
  const link = await prisma.userKakaoLink.findUnique({
    where: { userId },
    select: {
      kakaoUserId: true,
      nickname: true,
      profileImageUrl: true,
      linkedAt: true,
      updatedAt: true
    }
  });
  if (!link) return { linked: false as const };
  return {
    linked: true as const,
    kakaoUserId: link.kakaoUserId,
    nickname: link.nickname,
    profileImageUrl: link.profileImageUrl,
    linkedAt: link.linkedAt
  };
}

export async function disconnectKakaoLink(userId: string) {
  await prisma.userKakaoLink.deleteMany({ where: { userId } });
  return { ok: true };
}
