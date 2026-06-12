import { Hono } from "hono";
import {
  scrapeProductFromUrl,
  ScrapeBlockedError
} from "../services/sourcing/productScraper.js";

export const scrapeProductRoutes = new Hono();

/** GET /api/scrape-product?url= — 외부 쇼핑몰 OG/JSON-LD 스크래핑 */
scrapeProductRoutes.get("/", async (c) => {
  const url = String(c.req.query("url") || "").trim();
  if (!url) {
    return c.json({ ok: false, error: "url query is required" }, 400);
  }
  try {
    const product = await scrapeProductFromUrl(url);
    return c.json({ ok: true, ...product });
  } catch (e) {
    if (e instanceof ScrapeBlockedError) {
      return c.json({
        ok: false,
        blocked: true,
        message: e.message || "해당 사이트는 직접 입력이 필요합니다"
      });
    }
    const message = e instanceof Error ? e.message : "스크래핑에 실패했습니다";
    return c.json({ ok: false, error: message }, 400);
  }
});
