import { prisma } from "../../db/client.js";

/** 라이브 종료 VOD · 직접 업로드 — DB에는 video_url 텍스트만 저장 (서버 스토리지 0원) */
export async function listSellerVodProducts(
  sellerUserId: string,
  opts?: { category?: string; limit?: number }
) {
  const category = String(opts?.category || "past_live_deals").trim();
  const limit = Math.min(50, Math.max(1, Number(opts?.limit) || 20));
  const rows = await prisma.sellerVodProduct.findMany({
    where: { sellerUserId, category, status: "ready" },
    orderBy: { createdAt: "desc" },
    take: limit
  });
  return rows.map(serializeSellerVod);
}

export async function createSellerVodProduct(input: {
  sellerUserId: string;
  title: string;
  videoUrl: string;
  productTitle?: string | null;
  thumbUrl?: string | null;
  aspectRatio?: string;
  platform?: string | null;
  source?: "live_recording" | "direct_upload" | "external_link";
  category?: string;
  priceKrw?: number | null;
  liveSessionId?: string | null;
  durationSec?: number | null;
}) {
  const videoUrl = String(input.videoUrl || "").trim().slice(0, 1000);
  if (!videoUrl) throw new Error("video_url이 필요합니다.");

  const row = await prisma.sellerVodProduct.create({
    data: {
      sellerUserId: input.sellerUserId,
      title: String(input.title || "지난 라이브").slice(0, 200),
      productTitle: input.productTitle ? String(input.productTitle).slice(0, 200) : null,
      videoUrl,
      thumbUrl: input.thumbUrl ? String(input.thumbUrl).slice(0, 1000) : null,
      aspectRatio: input.aspectRatio === "9:16" ? "9:16" : "16:9",
      platform: input.platform ? String(input.platform).slice(0, 32) : null,
      source: input.source || "external_link",
      category: String(input.category || "past_live_deals").slice(0, 40),
      priceKrw: input.priceKrw != null ? Math.max(0, Math.floor(Number(input.priceKrw))) : null,
      liveSessionId: input.liveSessionId || null,
      durationSec: input.durationSec != null ? Math.max(0, Math.floor(Number(input.durationSec))) : null,
      status: "ready"
    }
  });
  return serializeSellerVod(row);
}

export async function incrementSellerVodView(vodId: string) {
  await prisma.sellerVodProduct.update({
    where: { id: vodId },
    data: { viewCount: { increment: 1 } }
  });
}

function serializeSellerVod(row: {
  id: string;
  sellerUserId: string;
  liveSessionId: string | null;
  title: string;
  productTitle: string | null;
  videoUrl: string;
  thumbUrl: string | null;
  aspectRatio: string;
  platform: string | null;
  source: string;
  status: string;
  category: string;
  priceKrw: number | null;
  durationSec: number | null;
  viewCount: number;
  createdAt: Date;
}) {
  return {
    id: row.id,
    sellerUserId: row.sellerUserId,
    liveSessionId: row.liveSessionId,
    title: row.title,
    productTitle: row.productTitle,
    videoUrl: row.videoUrl,
    thumbUrl: row.thumbUrl,
    aspectRatio: row.aspectRatio,
    platform: row.platform,
    source: row.source,
    status: row.status,
    category: row.category,
    priceKrw: row.priceKrw,
    durationSec: row.durationSec,
    viewCount: row.viewCount,
    createdAt: row.createdAt.toISOString()
  };
}
