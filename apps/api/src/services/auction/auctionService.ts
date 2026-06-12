import type { AuctionCondition, AuctionStatus } from "@prisma/client";
import { prisma } from "../../db/client.js";
import { ssePublish, ssePublishAllConnected } from "../../realtime/sseHub.js";
import { resolvePaymentProvider } from "../adapters/paymentProvider.js";
import { searchNaverShoppingMarketPrice } from "../../integrations/naver/naverShoppingSearch.js";
import { notifyAuctionKeywordMatches } from "./auctionKeywordPushService.js";

const BID_INCREMENT = 1000;

export function resolveAuctionStatus(startsAt: Date, endsAt: Date, stored: AuctionStatus): AuctionStatus {
  if (stored === "cancelled" || stored === "settled") return stored;
  const now = Date.now();
  if (now < startsAt.getTime()) return "scheduled";
  if (now <= endsAt.getTime()) return "live";
  return "ended";
}

function serializeAuction(row: {
  id: string;
  title: string;
  description: string;
  category: string;
  keywords: string;
  condition: AuctionCondition;
  shippingFeeKrw: number;
  imageUrls: unknown;
  videoUrl?: string | null;
  startPriceKrw: number;
  currentPriceKrw: number;
  buyNowPriceKrw: number | null;
  bidCount: number;
  startsAt: Date;
  endsAt: Date;
  status: AuctionStatus;
  winnerUserId: string | null;
  marketPriceJson: unknown;
  sellerUserId: string;
  seller?: { publicHandle: string | null; legalName: string | null } | null;
}) {
  const status = resolveAuctionStatus(row.startsAt, row.endsAt, row.status);
  const remainMs = Math.max(0, row.endsAt.getTime() - Date.now());
  const urgent = remainMs > 0 && remainMs <= 60 * 60 * 1000;
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    category: row.category,
    keywords: row.keywords,
    condition: row.condition,
    shippingFeeKrw: row.shippingFeeKrw,
    imageUrls: Array.isArray(row.imageUrls) ? row.imageUrls : [],
    videoUrl: row.videoUrl || null,
    startPriceKrw: row.startPriceKrw,
    currentPriceKrw: row.currentPriceKrw,
    buyNowPriceKrw: row.buyNowPriceKrw,
    bidCount: row.bidCount,
    startsAt: row.startsAt.toISOString(),
    endsAt: row.endsAt.toISOString(),
    status,
    remainMs,
    urgent,
    winnerUserId: row.winnerUserId,
    marketPriceJson: row.marketPriceJson,
    sellerUserId: row.sellerUserId,
    sellerLabel: row.seller?.publicHandle || row.seller?.legalName || "VLUE 판매자"
  };
}

export async function createAuction(
  sellerUserId: string,
  input: {
    title: string;
    description?: string;
    category?: string;
    keywords?: string;
    condition?: AuctionCondition;
    shippingFeeKrw?: number;
    imageUrls?: string[];
    videoUrl?: string | null;
    startPriceKrw: number;
    buyNowPriceKrw?: number | null;
    startsAt: string;
    endsAt: string;
    fetchMarketPrice?: boolean;
  }
) {
  const startsAt = new Date(input.startsAt);
  const endsAt = new Date(input.endsAt);
  if (!Number.isFinite(startsAt.getTime()) || !Number.isFinite(endsAt.getTime()) || endsAt <= startsAt) {
    throw new Error("경매 시작·종료 일시가 올바르지 않습니다.");
  }
  const startPriceKrw = Math.max(0, Number(input.startPriceKrw) || 0);
  if (startPriceKrw <= 0) throw new Error("시작 금액을 입력해 주세요.");

  let marketPriceJson: unknown = null;
  if (input.fetchMarketPrice !== false) {
    const market = await searchNaverShoppingMarketPrice(input.title, 8);
    if (market.available) marketPriceJson = market;
  }

  const initialStatus = resolveAuctionStatus(startsAt, endsAt, "scheduled");

  const row = await prisma.auction.create({
    data: {
      sellerUserId,
      title: String(input.title).trim().slice(0, 200),
      description: String(input.description || "").trim(),
      category: String(input.category || "전체").trim().slice(0, 40),
      keywords: String(input.keywords || "").trim().slice(0, 300),
      condition: input.condition || "used_item",
      shippingFeeKrw: Math.max(0, Number(input.shippingFeeKrw) || 0),
      imageUrls: (input.imageUrls || []).slice(0, 12),
      videoUrl: String(input.videoUrl || "").trim().slice(0, 1000) || null,
      startPriceKrw,
      currentPriceKrw: startPriceKrw,
      buyNowPriceKrw: input.buyNowPriceKrw ? Math.max(startPriceKrw, Number(input.buyNowPriceKrw)) : null,
      startsAt,
      endsAt,
      status: initialStatus,
      marketPriceJson: marketPriceJson ?? undefined
    },
    include: { seller: { select: { publicHandle: true, legalName: true } } }
  });

  void notifyAuctionKeywordMatches({
    id: row.id,
    title: row.title,
    category: row.category,
    keywords: row.keywords,
    sellerUserId
  });

  return serializeAuction(row);
}

export async function listLiveAuctions(opts?: { category?: string; limit?: number }) {
  const limit = Math.min(Math.max(opts?.limit || 30, 1), 100);
  const rows = await prisma.auction.findMany({
    where: {
      status: { in: ["scheduled", "live"] },
      ...(opts?.category && opts.category !== "전체" ? { category: opts.category } : {})
    },
    orderBy: { endsAt: "asc" },
    take: limit,
    include: { seller: { select: { publicHandle: true, legalName: true } } }
  });
  return rows
    .map(serializeAuction)
    .filter((a) => a.status === "scheduled" || a.status === "live");
}

export async function getAuctionDetail(auctionId: string) {
  const row = await prisma.auction.findUnique({
    where: { id: auctionId },
    include: {
      seller: { select: { publicHandle: true, legalName: true } },
      bids: {
        orderBy: { amountKrw: "desc" },
        take: 20,
        include: { bidder: { select: { publicHandle: true, legalName: true } } }
      },
      escrow: true
    }
  });
  if (!row) return null;
  const auction = serializeAuction(row);
  return {
    auction,
    bids: row.bids.map((b) => ({
      id: b.id,
      amountKrw: b.amountKrw,
      createdAt: b.createdAt.toISOString(),
      bidderLabel: b.bidder.publicHandle || b.bidder.legalName || "입찰자"
    })),
    escrow: row.escrow
      ? {
          status: row.escrow.status,
          amountKrw: row.escrow.amountKrw,
          heldAt: row.escrow.heldAt?.toISOString() || null,
          releasedAt: row.escrow.releasedAt?.toISOString() || null
        }
      : null
  };
}

export async function placeBid(auctionId: string, bidderUserId: string, amountKrw: number) {
  const amount = Math.max(0, Number(amountKrw) || 0);
  const row = await prisma.auction.findUnique({ where: { id: auctionId } });
  if (!row) throw new Error("경매를 찾을 수 없습니다.");
  if (row.sellerUserId === bidderUserId) throw new Error("본인 경매에는 입찰할 수 없습니다.");

  const status = resolveAuctionStatus(row.startsAt, row.endsAt, row.status);
  if (status !== "live") throw new Error("진행 중인 경매만 입찰할 수 있습니다.");

  const minBid = row.bidCount > 0 ? row.currentPriceKrw + BID_INCREMENT : row.startPriceKrw;
  if (amount < minBid) throw new Error(`최소 입찰가는 ${minBid.toLocaleString("ko-KR")}원입니다.`);

  const updated = await prisma.$transaction(async (tx) => {
    const bid = await tx.auctionBid.create({
      data: { auctionId, bidderUserId, amountKrw: amount }
    });
    const auction = await tx.auction.update({
      where: { id: auctionId },
      data: {
        currentPriceKrw: amount,
        bidCount: { increment: 1 },
        winnerUserId: bidderUserId
      },
      include: { seller: { select: { publicHandle: true, legalName: true } } }
    });
    return { bid, auction };
  });

  const payload = {
    type: "auction.bid",
    auctionId,
    currentPriceKrw: updated.auction.currentPriceKrw,
    bidCount: updated.auction.bidCount,
    remainMs: Math.max(0, updated.auction.endsAt.getTime() - Date.now()),
    bidderUserId
  };
  ssePublish(updated.auction.sellerUserId, payload);
  ssePublish(bidderUserId, payload);
  ssePublishAllConnected(payload);

  return {
    bid: {
      id: updated.bid.id,
      amountKrw: updated.bid.amountKrw,
      createdAt: updated.bid.createdAt.toISOString()
    },
    auction: serializeAuction(updated.auction)
  };
}

export async function finalizeAuctionEscrow(auctionId: string, buyerUserId: string) {
  const row = await prisma.auction.findUnique({
    where: { id: auctionId },
    include: { escrow: true }
  });
  if (!row) throw new Error("경매를 찾을 수 없습니다.");

  const status = resolveAuctionStatus(row.startsAt, row.endsAt, row.status);
  if (status !== "ended" && status !== "live") {
    /* buy-now during live allowed */
  }

  const winnerId = row.winnerUserId || buyerUserId;
  if (!winnerId) throw new Error("낙찰자가 없습니다.");
  if (winnerId !== buyerUserId) throw new Error("낙찰자만 결제할 수 있습니다.");
  if (row.escrow) return row.escrow;

  const provider = resolvePaymentProvider();
  const merchantUid = `auction_${auctionId}_${Date.now()}`;
  const total = row.currentPriceKrw + row.shippingFeeKrw;
  const hold = await provider.holdEscrow({
    orderId: merchantUid,
    amountKrw: total,
    buyerUserId
  });

  const escrow = await prisma.auctionEscrow.create({
    data: {
      auctionId,
      buyerUserId: winnerId,
      sellerUserId: row.sellerUserId,
      amountKrw: row.currentPriceKrw,
      shippingFeeKrw: row.shippingFeeKrw,
      status: "held",
      merchantUid,
      escrowRef: hold.escrowRef,
      heldAt: new Date()
    }
  });

  await prisma.auction.update({
    where: { id: auctionId },
    data: { status: "ended", winnerUserId: winnerId }
  });

  return escrow;
}

export async function confirmAuctionEscrowRelease(auctionId: string, buyerUserId: string) {
  const escrow = await prisma.auctionEscrow.findUnique({
    where: { auctionId },
    include: { auction: true }
  });
  if (!escrow) throw new Error("에스크로 정보가 없습니다.");
  if (escrow.buyerUserId !== buyerUserId) throw new Error("구매 확정 권한이 없습니다.");
  if (escrow.status !== "held") throw new Error("이미 처리된 에스크로입니다.");

  const updated = await prisma.$transaction(async (tx) => {
    const row = await tx.auctionEscrow.update({
      where: { auctionId },
      data: { status: "released", releasedAt: new Date() }
    });
    await tx.auction.update({
      where: { id: auctionId },
      data: { status: "settled" }
    });
    return row;
  });

  ssePublish(escrow.sellerUserId, {
    type: "auction.escrow_released",
    auctionId,
    amountKrw: escrow.amountKrw
  });

  return updated;
}

export async function upsertInterestKeyword(userId: string, keyword: string, source: "watchlist" | "search" = "watchlist") {
  const kw = String(keyword || "").trim().slice(0, 80);
  if (!kw) throw new Error("키워드를 입력해 주세요.");
  return prisma.userInterestKeyword.upsert({
    where: { userId_keyword: { userId, keyword: kw } },
    create: { userId, keyword: kw, source },
    update: { source }
  });
}

export async function listInterestKeywords(userId: string) {
  return prisma.userInterestKeyword.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 50
  });
}

export async function recordSearchKeyword(userId: string, keyword: string) {
  return upsertInterestKeyword(userId, keyword, "search");
}

export async function fetchMarketPriceForKeyword(keyword: string) {
  const market = await searchNaverShoppingMarketPrice(keyword, 10);
  return { market_price_info: market };
}
