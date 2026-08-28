import { prisma } from "../db/client.js";
import { exchangeKakaoCodeForAccessToken } from "../integrations/kakao/kakaoOAuth.js";
import {
  extractKakaoProfilePageUrlFromShowcaseStyle,
  normalizeKakaoProfilePageUrl
} from "../integrations/kakao/kakaoProfilePageUrl.js";
import {
  buildKakaoTalkAddBridgePath,
  extractKakaoTalkIdFromShowcaseStyle
} from "../integrations/kakao/kakaoTalkId.js";
import { fetchKakaoUserFromAccessToken } from "../integrations/kakao/kakaoUserMe.js";

async function resolveKakaoProfilePageUrlForUser(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { showcaseStyleJson: true, showcaseLiveStyleJson: true }
  });
  if (!user) return "";
  return (
    extractKakaoProfilePageUrlFromShowcaseStyle(user.showcaseLiveStyleJson) ||
    extractKakaoProfilePageUrlFromShowcaseStyle(user.showcaseStyleJson) ||
    ""
  );
}

async function resolveKakaoTalkIdForUser(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { showcaseStyleJson: true, showcaseLiveStyleJson: true }
  });
  if (!user) return "";
  return (
    extractKakaoTalkIdFromShowcaseStyle(user.showcaseLiveStyleJson) ||
    extractKakaoTalkIdFromShowcaseStyle(user.showcaseStyleJson) ||
    ""
  );
}

export async function resolveKakaoTalkAddBridgeUrl(userId: string): Promise<string> {
  const talkId = await resolveKakaoTalkIdForUser(userId);
  if (!talkId) return "";
  const path = buildKakaoTalkAddBridgePath(talkId);
  if (!path) return "";
  const apiOrigin = String(process.env.API_PUBLIC_ORIGIN || "https://api.vlue.kr").replace(/\/$/, "");
  return `${apiOrigin}${path}`;
}

export async function resolveKakaoProfilePageUrl(userId: string): Promise<string> {
  const talkBridge = await resolveKakaoTalkAddBridgeUrl(userId);
  if (talkBridge) return talkBridge;

  const link = await prisma.userKakaoLink.findUnique({
    where: { userId },
    select: { profilePageUrl: true }
  });
  const stored = normalizeKakaoProfilePageUrl(link?.profilePageUrl);
  if (stored) return stored;
  return resolveKakaoProfilePageUrlForUser(userId);
}

export async function completeKakaoLinkForUser(userId: string, code: string) {
  const accessToken = await exchangeKakaoCodeForAccessToken(code);
  const profile = await fetchKakaoUserFromAccessToken(accessToken);
  const prev = await prisma.userKakaoLink.findUnique({ where: { userId } });

  const nickname =
    String(profile.nickname || "").trim() ||
    String(prev?.nickname || "").trim() ||
    `카카오${profile.id.slice(-4)}`;
  const profileImageUrl =
    String(profile.profileImageUrl || "").trim() || String(prev?.profileImageUrl || "").trim() || null;
  const profilePageUrl =
    normalizeKakaoProfilePageUrl(prev?.profilePageUrl) ||
    (await resolveKakaoProfilePageUrlForUser(userId)) ||
    null;

  const link = await prisma.userKakaoLink.upsert({
    where: { userId },
    create: {
      userId,
      kakaoUserId: profile.id,
      nickname,
      profileImageUrl,
      profilePageUrl,
      accessToken
    },
    update: {
      kakaoUserId: profile.id,
      nickname,
      profileImageUrl,
      profilePageUrl: profilePageUrl || prev?.profilePageUrl || null,
      accessToken
    }
  });

  return {
    kakaoUserId: link.kakaoUserId,
    nickname: link.nickname,
    profileImageUrl: link.profileImageUrl,
    profilePageUrl: link.profilePageUrl || ""
  };
}

export async function getKakaoLinkStatus(userId: string) {
  const link = await prisma.userKakaoLink.findUnique({
    where: { userId },
    select: {
      kakaoUserId: true,
      nickname: true,
      profileImageUrl: true,
      profilePageUrl: true,
      linkedAt: true,
      updatedAt: true
    }
  });
  if (!link) return { linked: false as const };
  const profilePageUrl =
    normalizeKakaoProfilePageUrl(link.profilePageUrl) ||
    (await resolveKakaoProfilePageUrlForUser(userId));
  return {
    linked: true as const,
    kakaoUserId: link.kakaoUserId,
    nickname: link.nickname,
    profileImageUrl: link.profileImageUrl,
    profilePageUrl,
    linkedAt: link.linkedAt
  };
}

export async function disconnectKakaoLink(userId: string) {
  await prisma.userKakaoLink.deleteMany({ where: { userId } });
  return { ok: true };
}
