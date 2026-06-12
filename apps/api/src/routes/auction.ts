import { Hono } from "hono";
import { requireUserHeader } from "../middleware/cardGate.js";
import {
  confirmAuctionEscrowRelease,
  createAuction,
  fetchMarketPriceForKeyword,
  finalizeAuctionEscrow,
  getAuctionDetail,
  listInterestKeywords,
  listLiveAuctions,
  placeBid,
  recordSearchKeyword,
  upsertInterestKeyword
} from "../services/auction/auctionService.js";
import { generateAuctionDescription } from "../services/auction/auctionAiDescriptionService.js";

export const auctionRoutes = new Hono();

/** 공개 — 경매 목록 */
auctionRoutes.get("/list", async (c) => {
  try {
    const category = c.req.query("category") || undefined;
    const limit = Number(c.req.query("limit") || 30);
    const items = await listLiveAuctions({ category, limit });
    return c.json({ ok: true, items });
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : "unknown" }, 500);
  }
});

/** 공개 — 시중가 검색 */
auctionRoutes.get("/market-price/search", async (c) => {
  try {
    const keyword = c.req.query("keyword") || c.req.query("q") || "";
    const result = await fetchMarketPriceForKeyword(String(keyword));
    return c.json({ ok: true, ...result });
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : "unknown" }, 500);
  }
});

auctionRoutes.post("/ai-description", async (c) => {
  try {
    const body = await c.req.json<{
      title?: string;
      keywords?: string;
      condition?: string;
      category?: string;
    }>();
    const result = await generateAuctionDescription({
      title: String(body.title || ""),
      keywords: body.keywords,
      condition: body.condition,
      category: body.category
    });
    return c.json({ ok: true, ...result });
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : "unknown" }, 400);
  }
});

auctionRoutes.use("*", requireUserHeader);

auctionRoutes.get("/keywords/me", async (c) => {
  try {
    const userId = c.get("vlueUserId") as string;
    const rows = await listInterestKeywords(userId);
    return c.json({ ok: true, keywords: rows });
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : "unknown" }, 500);
  }
});

auctionRoutes.post("/keywords", async (c) => {
  try {
    const userId = c.get("vlueUserId") as string;
    const body = await c.req.json<{ keyword?: string; source?: "watchlist" | "search" }>();
    const row = await upsertInterestKeyword(userId, String(body.keyword || ""), body.source || "watchlist");
    return c.json({ ok: true, keyword: row });
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : "unknown" }, 400);
  }
});

auctionRoutes.post("/keywords/search", async (c) => {
  try {
    const userId = c.get("vlueUserId") as string;
    const body = await c.req.json<{ keyword?: string }>();
    const row = await recordSearchKeyword(userId, String(body.keyword || ""));
    return c.json({ ok: true, keyword: row });
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : "unknown" }, 400);
  }
});

auctionRoutes.post("/", async (c) => {
  try {
    const userId = c.get("vlueUserId") as string;
    const body = await c.req.json<{
      title?: string;
      description?: string;
      category?: string;
      keywords?: string;
      condition?: "new_item" | "used_item";
      shippingFeeKrw?: number;
      imageUrls?: string[];
      startPriceKrw?: number;
      buyNowPriceKrw?: number | null;
      startsAt?: string;
      endsAt?: string;
      fetchMarketPrice?: boolean;
    }>();
    const auction = await createAuction(userId, {
      title: String(body.title || ""),
      description: body.description,
      category: body.category,
      keywords: body.keywords,
      condition: body.condition,
      shippingFeeKrw: body.shippingFeeKrw,
      imageUrls: body.imageUrls,
      startPriceKrw: Number(body.startPriceKrw),
      buyNowPriceKrw: body.buyNowPriceKrw,
      startsAt: String(body.startsAt || ""),
      endsAt: String(body.endsAt || ""),
      fetchMarketPrice: body.fetchMarketPrice
    });
    return c.json({ ok: true, auction });
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : "unknown" }, 400);
  }
});

auctionRoutes.post("/:id/bid", async (c) => {
  try {
    const userId = c.get("vlueUserId") as string;
    const body = await c.req.json<{ amountKrw?: number }>();
    const result = await placeBid(c.req.param("id"), userId, Number(body.amountKrw));
    return c.json({ ok: true, ...result });
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : "unknown" }, 400);
  }
});

auctionRoutes.post("/:id/escrow/hold", async (c) => {
  try {
    const userId = c.get("vlueUserId") as string;
    const escrow = await finalizeAuctionEscrow(c.req.param("id"), userId);
    return c.json({ ok: true, escrow });
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : "unknown" }, 400);
  }
});

auctionRoutes.post("/:id/escrow/confirm", async (c) => {
  try {
    const userId = c.get("vlueUserId") as string;
    const escrow = await confirmAuctionEscrowRelease(c.req.param("id"), userId);
    return c.json({ ok: true, escrow });
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : "unknown" }, 400);
  }
});

auctionRoutes.get("/:id", async (c) => {
  try {
    const detail = await getAuctionDetail(c.req.param("id"));
    if (!detail) return c.json({ error: "not_found" }, 404);
    return c.json({ ok: true, ...detail });
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : "unknown" }, 500);
  }
});
