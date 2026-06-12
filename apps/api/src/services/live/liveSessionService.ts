import { prisma } from "../../db/client.js";
import { createSellerVodProduct } from "./sellerVodService.js";

/**
 * 실시간 라이브 — 외부 스트림 URL만 바인딩 (비용 0원: 영상 송출·트래픽은 YouTube/Insta/TikTok 인프라)
 */
export async function createExternalLiveSession(input: {
  sellerUserId: string;
  title?: string;
  streamUrl: string;
  platform?: string;
  aspectRatio?: string;
}) {
  const streamUrl = String(input.streamUrl || "").trim().slice(0, 1000);
  if (!streamUrl) throw new Error("라이브 스트림 URL이 필요합니다.");

  const row = await prisma.mediaLiveSession.create({
    data: {
      sellerUserId: input.sellerUserId,
      title: String(input.title || "라이브 방송").slice(0, 200),
      streamUrl,
      platform: String(input.platform || detectPlatformFromUrl(streamUrl)).slice(0, 32),
      aspectRatio: input.aspectRatio === "9:16" ? "9:16" : "16:9",
      status: "live"
    }
  });
  return serializeLiveSession(row);
}

export async function endLiveSession(sessionId: string, sellerUserId: string) {
  const row = await prisma.mediaLiveSession.findFirst({
    where: { id: sessionId, sellerUserId }
  });
  if (!row) throw new Error("라이브 세션을 찾을 수 없습니다.");
  if (row.status === "ended") return serializeLiveSession(row);

  const updated = await prisma.mediaLiveSession.update({
    where: { id: sessionId },
    data: { status: "ended", endedAt: new Date() }
  });
  return serializeLiveSession(updated);
}

/**
 * 라이브 종료 웹훅 — 녹화본 URL을 Seller_VOD_Products에 자동 매핑
 * (녹화 파일은 R2/Supabase CDN에 저장, API는 URL 텍스트만 수신)
 */
export async function handleLiveRecordingWebhook(input: {
  sessionId: string;
  videoUrl: string;
  thumbUrl?: string | null;
  durationSec?: number | null;
  productTitle?: string | null;
  priceKrw?: number | null;
  webhookSecret?: string;
}) {
  const expected = String(process.env.LIVE_VOD_WEBHOOK_SECRET || "").trim();
  if (expected && input.webhookSecret !== expected) {
    throw new Error("웹훅 인증 실패");
  }

  const session = await prisma.mediaLiveSession.findUnique({ where: { id: input.sessionId } });
  if (!session) throw new Error("라이브 세션을 찾을 수 없습니다.");

  if (session.status !== "ended") {
    await prisma.mediaLiveSession.update({
      where: { id: session.id },
      data: { status: "ended", endedAt: new Date() }
    });
  }

  const vod = await createSellerVodProduct({
    sellerUserId: session.sellerUserId,
    liveSessionId: session.id,
    title: session.title || "지난 라이브",
    productTitle: input.productTitle || session.title,
    videoUrl: input.videoUrl,
    thumbUrl: input.thumbUrl,
    aspectRatio: session.aspectRatio,
    platform: session.platform,
    source: "live_recording",
    category: "past_live_deals",
    priceKrw: input.priceKrw,
    durationSec: input.durationSec
  });

  return { sessionId: session.id, vod };
}

export async function getLiveSession(sessionId: string) {
  const row = await prisma.mediaLiveSession.findUnique({ where: { id: sessionId } });
  return row ? serializeLiveSession(row) : null;
}

function detectPlatformFromUrl(url: string) {
  const lower = url.toLowerCase();
  if (lower.includes("instagram")) return "instagram";
  if (lower.includes("tiktok")) return "tiktok";
  if (lower.includes("youtube") || lower.includes("youtu.be")) return "youtube";
  if (lower.includes("vimeo")) return "vimeo";
  if (lower.includes("m3u8") || lower.includes("hls")) return "hls";
  return "external";
}

function serializeLiveSession(row: {
  id: string;
  sellerUserId: string;
  title: string;
  streamUrl: string;
  platform: string;
  aspectRatio: string;
  status: string;
  startedAt: Date;
  endedAt: Date | null;
  createdAt: Date;
}) {
  return {
    id: row.id,
    sellerUserId: row.sellerUserId,
    title: row.title,
    streamUrl: row.streamUrl,
    platform: row.platform,
    aspectRatio: row.aspectRatio,
    status: row.status,
    isLive: row.status === "live",
    startedAt: row.startedAt.toISOString(),
    endedAt: row.endedAt?.toISOString() || null,
    createdAt: row.createdAt.toISOString(),
    note: "traffic-cost-zero: stream bytes served by external platform CDN only"
  };
}
