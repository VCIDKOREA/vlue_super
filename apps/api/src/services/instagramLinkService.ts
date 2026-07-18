import { prisma } from "../db/client.js";
import {
  exchangeInstagramCodeForShortLivedToken,
  exchangeInstagramShortLivedForLongLived,
  fetchInstagramMedia,
  fetchInstagramProfile,
  resolveInstagramMediaByIds,
  type InstagramMediaItem
} from "../integrations/instagram/instagramOAuth.js";

export async function completeInstagramLinkForUser(userId: string, code: string) {
  const short = await exchangeInstagramCodeForShortLivedToken(code);
  let accessToken = short.accessToken;
  let expiresAt: Date | null = new Date(Date.now() + 60 * 60 * 1000);

  try {
    const long = await exchangeInstagramShortLivedForLongLived(short.accessToken);
    accessToken = long.accessToken;
    expiresAt = new Date(Date.now() + Math.max(long.expiresIn, 60) * 1000);
  } catch (e) {
    console.warn(
      "[instagram] long-lived token exchange failed:",
      e instanceof Error ? e.message : e
    );
  }

  const profile = await fetchInstagramProfile(accessToken);

  const link = await prisma.userInstagramLink.upsert({
    where: { userId },
    create: {
      userId,
      igUserId: profile.igUserId,
      username: profile.username,
      accessToken,
      tokenExpiresAt: expiresAt,
      accountType: profile.accountType
    },
    update: {
      igUserId: profile.igUserId,
      username: profile.username,
      accessToken,
      tokenExpiresAt: expiresAt,
      accountType: profile.accountType
    }
  });

  return {
    username: link.username,
    igUserId: link.igUserId,
    accountType: link.accountType,
    tokenExpiresAt: link.tokenExpiresAt,
    accessToken
  };
}

export async function getInstagramLinkStatus(userId: string) {
  const link = await prisma.userInstagramLink.findUnique({
    where: { userId },
    select: {
      username: true,
      igUserId: true,
      accountType: true,
      tokenExpiresAt: true,
      linkedAt: true,
      updatedAt: true
    }
  });
  if (!link) return { linked: false as const };
  const expired =
    link.tokenExpiresAt instanceof Date ? link.tokenExpiresAt.getTime() < Date.now() : false;
  return {
    linked: true as const,
    username: link.username,
    igUserId: link.igUserId,
    accountType: link.accountType,
    tokenExpiresAt: link.tokenExpiresAt,
    linkedAt: link.linkedAt,
    expired
  };
}

export async function disconnectInstagramLink(userId: string) {
  await prisma.userInstagramLink.deleteMany({ where: { userId } });
  return { ok: true };
}

async function requireActiveToken(userId: string) {
  const link = await prisma.userInstagramLink.findUnique({ where: { userId } });
  if (!link) {
    throw Object.assign(new Error("Instagram 계정이 연동되지 않았습니다."), { status: 404 });
  }
  if (link.tokenExpiresAt && link.tokenExpiresAt.getTime() < Date.now()) {
    throw Object.assign(new Error("Instagram 연동이 만료되었습니다. 다시 연동해 주세요."), {
      status: 401
    });
  }
  return link;
}

export async function listLinkedInstagramMedia(
  userId: string,
  limit = 40
): Promise<{ username: string; media: InstagramMediaItem[] }> {
  const link = await requireActiveToken(userId);
  const media = await fetchInstagramMedia(link.igUserId, link.accessToken, limit);
  return { username: link.username, media };
}

/** 저장된 media id의 URL 재발급 — 이미지 파일은 저장하지 않고 URL만 갱신 */
export async function resolveLinkedInstagramMediaUrls(userId: string, ids: string[]) {
  const link = await requireActiveToken(userId);
  const media = await resolveInstagramMediaByIds(link.accessToken, ids);
  return { username: link.username, media };
}
