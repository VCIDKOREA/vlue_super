import { Hono, type Context } from "hono";
import {
  buildShowcaseOgLandingPage,
  isOgScraperUserAgent
} from "../services/showcase/showcaseOgLandingPage.js";
import {
  coalesceOgHtmlBuild,
  getCachedOgHtml,
  loadShowcaseOgShareMeta,
  setCachedOgHtml,
  toAsciiOgImageUrl
} from "../services/showcase/showcaseOgShareMeta.js";
import {
  getVlueCreateUrl,
  getVluePublicOrigin,
  getVlueShareOrigin,
  getVluePublicApiOrigin,
  getKakaoShareButtonImageUrl,
  kakaoFeedCardImageUrl
} from "../services/bizcard/bizcardPublicUrls.js";
import { formatPhoneDisplayKR } from "../lib/phoneDisplay.js";

/** 공개 쇼케이스 — 카카오 OG 랜딩 */
export const showcasePublicRoutes = new Hono();

function apiBaseFromRequest(c: { req: { header: (n: string) => string | undefined } }) {
  const proto = c.req.header("x-forwarded-proto") || "http";
  const host = c.req.header("x-forwarded-host") || c.req.header("host") || "localhost:8788";
  return `${proto}://${host}`.replace(/\/$/, "");
}

function phoneDigitsForUrl(raw: string): string {
  const digits = String(raw || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("82") && digits.length >= 10) return `0${digits.slice(2)}`;
  return digits;
}

function imageApiBaseFromRequest(c: { req: { header: (n: string) => string | undefined } }) {
  const fromReq = apiBaseFromRequest(c);
  try {
    const host = new URL(fromReq).hostname.toLowerCase();
    if (host === "m.vlue.kr" || host === "api.vlue.kr" || host.endsWith(".up.railway.app")) {
      return fromReq;
    }
  } catch {
    /* ignore */
  }
  return getVluePublicApiOrigin();
}

function sendOgHtml(c: Context, html: string, forScraper: boolean) {
  c.header("Vary", "Accept-Encoding");
  c.header(
    "Cache-Control",
    "public, max-age=120, s-maxage=600, stale-while-revalidate=86400"
  );
  c.header("CDN-Cache-Control", "public, max-age=600");
  c.header("Cloudflare-CDN-Cache-Control", "public, max-age=600");
  c.header("Content-Type", "text/html; charset=utf-8");
  if (c.req.method === "HEAD") {
    c.header("Content-Length", String(Buffer.byteLength(html, "utf8")));
    return c.body(null);
  }
  void forScraper;
  return c.html(html);
}

async function buildOgHtml(c: Context, digits: string, forScraper: boolean): Promise<string> {
  const imageApiBase = imageApiBaseFromRequest(c);
  const webOrigin = getVluePublicOrigin();
  const shareOrigin = getVlueShareOrigin();
  const spaUrl = `${webOrigin}/site/web/showcase/${encodeURIComponent(digits)}`;
  const shareUrl = `${shareOrigin}/showcase/${encodeURIComponent(digits)}`;
  const phoneDisplay = formatPhoneDisplayKR(digits) || digits;

  const meta = await loadShowcaseOgShareMeta(digits);
  const ogImage =
    toAsciiOgImageUrl(meta.shareCover) ||
    (meta.cardId ? kakaoFeedCardImageUrl(imageApiBase, meta.cardId) : "") ||
    toAsciiOgImageUrl(meta.photo) ||
    getKakaoShareButtonImageUrl(webOrigin);

  const name = meta.name || (meta.handle ? `@${meta.handle}` : phoneDisplay);

  return buildShowcaseOgLandingPage({
    name,
    org: meta.org,
    role: meta.role,
    handle: meta.handle,
    phoneDisplay,
    ogImage,
    shareUrl,
    spaUrl,
    createUrl: getVlueCreateUrl(),
    forScraper
  });
}

/**
 * GET /api/v1/showcase/view/:phone 및 GET /showcase/:phone
 * 카카오·문자 스크래퍼용 OG HTML → 사람은 www SPA 쇼케이스로 이동
 */
export async function respondShowcaseOgView(c: Context) {
  try {
    const rawPhone = decodeURIComponent(String(c.req.param("phone") || "").trim());
    const digits = phoneDigitsForUrl(rawPhone);
    if (!digits) return c.text("유효한 번호가 아닙니다.", 400);

    const forScraper = isOgScraperUserAgent(c.req.header("user-agent") || "");
    const cacheKey = `${digits}:${forScraper ? "s" : "h"}`;
    const cached = getCachedOgHtml(cacheKey);
    if (cached) {
      if (cached.stale) {
        void coalesceOgHtmlBuild(cacheKey, () => buildOgHtml(c, digits, forScraper))
          .then((html) => setCachedOgHtml(cacheKey, html))
          .catch(() => undefined);
      }
      return sendOgHtml(c, cached.html, forScraper);
    }

    const html = await coalesceOgHtmlBuild(cacheKey, () => buildOgHtml(c, digits, forScraper));
    setCachedOgHtml(cacheKey, html);
    return sendOgHtml(c, html, forScraper);
  } catch (err) {
    console.warn("[showcase-og-view] failed", err);
    return c.text("쇼케이스를 불러올 수 없습니다.", 500);
  }
}

showcasePublicRoutes.on(["GET", "HEAD"], "/view/:phone", (c) => respondShowcaseOgView(c));
