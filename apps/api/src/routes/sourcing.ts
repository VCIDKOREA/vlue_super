import { Hono } from "hono";
import { requireUserHeader } from "../middleware/cardGate.js";
import {
  buildAiGenerate,
  buildVisionDraft,
  fetchInlineSourcingFromUrl
} from "../services/sourcing/sourcingService.js";
import { listPageFeedProducts, registerPageProduct } from "../services/sourcing/pageProductService.js";

export const sourcingRoutes = new Hono();
sourcingRoutes.use("*", requireUserHeader);

sourcingRoutes.post("/vision-draft", async (c) => {
  try {
    const body = await c.req.json<{
      imageUrl?: string;
      imageBase64?: string;
      imageBase64List?: string[];
      storeProfileId?: string;
      sellerMemo?: string;
      keywords?: string;
    }>();
    const draft = await buildVisionDraft(body);
    return c.json({ ok: true, ...draft });
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown error";
    return c.json({ error: message }, 400);
  }
});

sourcingRoutes.post("/ai-generate", async (c) => {
  try {
    const body = await c.req.json<{
      imageUrl?: string;
      imageBase64?: string;
      imageBase64List?: string[];
      keywords?: string;
      sellerMemo?: string;
      storeProfileId?: string;
    }>();
    const list = (body.imageBase64List || []).filter(Boolean);
    const merged = {
      ...body,
      imageBase64: body.imageBase64 || list[0],
      imageBase64List: list.slice(0, 10),
      keywords: body.keywords || body.sellerMemo
    };
    const result = await buildAiGenerate(merged);
    return c.json({ ok: true, ...result });
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown error";
    return c.json({ error: message }, 400);
  }
});

sourcingRoutes.post("/inline-import", async (c) => {
  try {
    const body = await c.req.json<{ url?: string }>();
    const url = String(body?.url || "").trim();
    if (!url) return c.json({ error: "url is required" }, 400);
    const item = await fetchInlineSourcingFromUrl(url);
    return c.json({ ok: true, item });
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown error";
    return c.json({ error: message }, 400);
  }
});

sourcingRoutes.post("/register-product", async (c) => {
  try {
    const userId = c.get("vlueUserId") as string;
    const body = await c.req.json<{
      title?: string;
      priceKrw?: number;
      description?: string;
      imageUrls?: string[];
      videoUrl?: string;
      mediaKind?: "gallery" | "image" | "video";
      listingType?: "photo_gallery" | "media_single";
      sourceUrl?: string;
      sourceType?: "inline" | "ai" | "crawl" | "vision";
      platform?: string;
      category?: string;
      draft?: Record<string, unknown>;
    }>();
    const title = String(body?.title || "").trim();
    if (!title) return c.json({ error: "title is required" }, 400);
    const priceKrw = Number(body?.priceKrw) || 0;
    const result = await registerPageProduct({
      userId,
      title,
      priceKrw,
      description: body?.description,
      imageUrls: body?.imageUrls,
      videoUrl: body?.videoUrl,
      mediaKind: body?.mediaKind,
      listingType: body?.listingType,
      sourceUrl: body?.sourceUrl,
      sourceType: body?.sourceType,
      platform: body?.platform,
      category: body?.category,
      draft: body?.draft
    });
    return c.json({ ok: true, ...result });
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown error";
    return c.json({ error: message }, 400);
  }
});

sourcingRoutes.get("/page-feed", async (c) => {
  try {
    const items = await listPageFeedProducts(150);
    return c.json({ ok: true, items });
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown error";
    return c.json({ error: message }, 400);
  }
});
