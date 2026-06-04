import { prisma } from "../../db/client.js";
import { isPaidMember } from "../membership/paidMemberGate.js";
import { rankLocalAdsForHotplace } from "./localAdRanking.js";

export type LocalAdDto = {
  id: string;
  userId: string;
  feedPostId: string | null;
  feedPostSource: string | null;
  storeName: string;
  description: string;
  location: string;
  imageUrl: string | null;
  createdAt: string;
  aiScore?: number;
};

function toDto(row: {
  id: string;
  userId: string;
  feedPostId: string | null;
  feedPostSource: string | null;
  storeName: string;
  description: string;
  location: string;
  imageUrl: string | null;
  createdAt: Date;
}): LocalAdDto {
  return {
    id: row.id,
    userId: row.userId,
    feedPostId: row.feedPostId,
    feedPostSource: row.feedPostSource,
    storeName: row.storeName,
    description: row.description,
    location: row.location,
    imageUrl: row.imageUrl,
    createdAt: row.createdAt.toISOString()
  };
}

export async function listLocalAds(): Promise<{ ads: LocalAdDto[] }> {
  const rows = await prisma.localAd.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      userId: true,
      feedPostId: true,
      feedPostSource: true,
      storeName: true,
      description: true,
      location: true,
      imageUrl: true,
      createdAt: true
    }
  });
  const base = rows.map(toDto);
  return { ads: rankLocalAdsForHotplace(base) };
}

export async function createLocalAd(
  userId: string,
  input: {
    feedPostId?: string;
    feedPostSource?: string;
    storeName?: string;
    description?: string;
    location?: string;
    imageUrl?: string | null;
  }
) {
  const paid = await isPaidMember(userId);
  if (!paid.ok) {
    return { error: paid.reason || "유료 구독 회원 전용 기능입니다.", code: "ADS_PAID_ONLY" as const };
  }

  const feedPostId = String(input.feedPostId || "").trim();
  const feedPostSource = String(input.feedPostSource || "mypage").trim().slice(0, 20);
  const storeName = String(input.storeName || "").trim();
  const description = String(input.description || "").trim();
  const location = String(input.location || "").trim();
  const imageUrlRaw = String(input.imageUrl || "").trim();

  if (!feedPostId || feedPostId.length > 64) {
    return { error: "상점 피드에서 광고할 게시물을 선택해 주세요." };
  }
  if (!storeName || storeName.length > 80) {
    return { error: "매장명을 확인해 주세요." };
  }
  if (!description || description.length > 300) {
    return { error: "게시물 소개를 1~300자로 확인해 주세요." };
  }
  if (!location || location.length > 120) {
    return { error: "매장 위치(지역)를 페이지·게시물 정보에서 확인해 주세요." };
  }
  if (imageUrlRaw.length > 512) {
    return { error: "이미지 URL이 너무 깁니다." };
  }

  const duplicate = await prisma.localAd.findFirst({
    where: { userId, feedPostId },
    select: { id: true }
  });
  if (duplicate) {
    return { error: "이미 지역 광고로 등록한 게시물입니다." };
  }

  const row = await prisma.localAd.create({
    data: {
      userId,
      feedPostId,
      feedPostSource,
      storeName,
      description,
      location,
      imageUrl: imageUrlRaw || null
    }
  });

  return { ok: true as const, ad: toDto(row) };
}
