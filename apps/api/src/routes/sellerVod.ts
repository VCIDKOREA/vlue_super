import { Hono } from "hono";
import { requireUserHeader } from "../middleware/cardGate.js";
import {
  createSellerVodProduct,
  incrementSellerVodView,
  listSellerVodProducts
} from "../services/live/sellerVodService.js";
import {
  completeMediaCommerceEscrow,
  prepareMediaCommerceEscrow
} from "../services/live/mediaCommerceEscrowService.js";

export const sellerVodRoutes = new Hono();

/** 판매자 개인 상점 — [지난 라이브 특가 상품] VOD 목록 */
sellerVodRoutes.get("/seller/:sellerUserId/vod", async (c) => {
  try {
    const sellerUserId = c.req.param("sellerUserId");
    const category = c.req.query("category") || "past_live_deals";
    const limit = Number(c.req.query("limit") || 20);
    const items = await listSellerVodProducts(sellerUserId, { category, limit });
    return c.json({ ok: true, items });
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown error";
    return c.json({ ok: false, error: message }, 400);
  }
});

sellerVodRoutes.post("/vod/:id/view", async (c) => {
  try {
    await incrementSellerVodView(c.req.param("id"));
    return c.json({ ok: true });
  } catch {
    return c.json({ ok: false }, 400);
  }
});

sellerVodRoutes.use("*", requireUserHeader);

sellerVodRoutes.post("/vod", async (c) => {
  try {
    const userId = c.get("vlueUserId") as string;
    const body = await c.req.json<{
      title?: string;
      videoUrl?: string;
      productTitle?: string;
      thumbUrl?: string;
      aspectRatio?: string;
      platform?: string;
      source?: string;
      priceKrw?: number;
    }>();
    const vod = await createSellerVodProduct({
      sellerUserId: userId,
      title: String(body?.title || "VOD"),
      videoUrl: String(body?.videoUrl || ""),
      productTitle: body?.productTitle,
      thumbUrl: body?.thumbUrl,
      aspectRatio: body?.aspectRatio,
      platform: body?.platform,
      source: (body?.source as "direct_upload") || "direct_upload",
      priceKrw: body?.priceKrw
    });
    return c.json({ ok: true, vod });
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown error";
    return c.json({ ok: false, error: message }, 400);
  }
});

/** 라이브/VOD 인앱 에스크로 결제 — Iamport 팝업 연동 */
sellerVodRoutes.post("/escrow/prepare", async (c) => {
  try {
    const buyerUserId = c.get("vlueUserId") as string;
    const body = await c.req.json<{
      sellerUserId?: string;
      feedId?: string;
      campaignId?: string;
      productTitle?: string;
      amountKrw?: number;
      merchantUid?: string;
    }>();
    const sellerUserId = String(body?.sellerUserId || buyerUserId).trim();
    const prepared = await prepareMediaCommerceEscrow({
      buyerUserId,
      sellerUserId,
      feedId: String(body?.feedId || ""),
      campaignId: body?.campaignId,
      productTitle: String(body?.productTitle || "라이브 특가"),
      amountKrw: Number(body?.amountKrw || 0),
      merchantUid: body?.merchantUid
    });
    return c.json({ ok: true, ...prepared });
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown error";
    return c.json({ ok: false, error: message }, 400);
  }
});

sellerVodRoutes.post("/escrow/complete", async (c) => {
  try {
    const buyerUserId = c.get("vlueUserId") as string;
    const body = await c.req.json<{ merchantUid?: string; impUid?: string }>();
    const result = await completeMediaCommerceEscrow({
      merchantUid: String(body?.merchantUid || ""),
      impUid: String(body?.impUid || ""),
      buyerUserId
    });
    return c.json({
      ok: true,
      paymentStatus: result.escrow.paymentStatus,
      escrowId: result.escrow.id,
      alreadyPaid: result.alreadyPaid
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown error";
    return c.json({ ok: false, error: message }, 400);
  }
});
