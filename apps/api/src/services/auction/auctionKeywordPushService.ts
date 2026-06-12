import { prisma } from "../../db/client.js";
import { sendOfficePushToUser } from "../fcmNotificationService.js";
import { ssePublish } from "../../realtime/sseHub.js";

function tokenize(text: string): string[] {
  return String(text || "")
    .toLowerCase()
    .split(/[\s,·/|]+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2);
}

export function matchesKeyword(auctionText: string, keyword: string): boolean {
  const kw = String(keyword || "").trim().toLowerCase();
  if (!kw) return false;
  const hay = auctionText.toLowerCase();
  if (hay.includes(kw)) return true;
  const tokens = tokenize(kw);
  return tokens.length > 0 && tokens.every((t) => hay.includes(t));
}

export async function notifyAuctionKeywordMatches(auction: {
  id: string;
  title: string;
  category: string;
  keywords: string;
  sellerUserId: string;
}) {
  const corpus = `${auction.title} ${auction.category} ${auction.keywords}`;
  const rows = await prisma.userInterestKeyword.findMany({
    where: { userId: { not: auction.sellerUserId } },
    select: { userId: true, keyword: true }
  });

  const matchedByUser = new Map<string, string[]>();
  for (const row of rows) {
    if (!matchesKeyword(corpus, row.keyword)) continue;
    const list = matchedByUser.get(row.userId) || [];
    list.push(row.keyword);
    matchedByUser.set(row.userId, list);
  }

  const results: Array<{ userId: string; sent: boolean }> = [];
  for (const [userId, kws] of matchedByUser) {
    const kwLabel = kws[0] || auction.title;
    const title = "VLUE 경매 알림";
    const body = `기획자님! 찾으시는 ${auction.title} 경매가 방금 시작되었습니다!`;

    try {
      await sendOfficePushToUser(userId, title, body, {
        type: "auction_keyword_match",
        auctionId: auction.id,
        keyword: kwLabel
      });
    } catch {
      /* FCM optional */
    }

    ssePublish(userId, {
      type: "auction.keyword_match",
      auctionId: auction.id,
      title: auction.title,
      keyword: kwLabel,
      message: body
    });

    results.push({ userId, sent: true });
  }

  return { matchedUsers: results.length, results };
}
