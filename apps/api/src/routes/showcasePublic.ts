import { Hono, type Context } from "hono";
import { lookupCardByRawNumber } from "../services/cardLookup.js";
import { getUserShowcasePublicLive } from "../services/showcase/showcaseStyleSyncService.js";
import {
  buildShowcaseOgLandingPage,
  isOgScraperUserAgent
} from "../services/showcase/showcaseOgLandingPage.js";
import {
  getVlueCreateUrl,
  getVluePublicOrigin,
  getVlueShareOrigin,
  getVluePublicApiOrigin,
  getKakaoShareButtonImageUrl,
  kakaoFeedCardImageUrl
} from "../services/bizcard/bizcardPublicUrls.js";
import { formatPhoneDisplayKR } from "../lib/phoneDisplay.js";
import { prisma } from "../db/client.js";

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

function pickHttpUrl(...candidates: unknown[]): string {
  for (const c of candidates) {
    const s = String(c || "").trim();
    if (s.startsWith("http://") || s.startsWith("https://")) return s;
  }
  return "";
}

function extractStyleCover(style: unknown): string {
  if (!style || typeof style !== "object") return "";
  const s = style as Record<string, unknown>;
  const pages = Array.isArray(s.pages) ? s.pages : [];
  for (const page of pages) {
    if (!page || typeof page !== "object") continue;
    const p = page as Record<string, unknown>;
    const gallery = (p.gallery && typeof p.gallery === "object" ? p.gallery : null) as Record<
      string,
      unknown
    > | null;
    const photos = Array.isArray(gallery?.photos)
      ? gallery!.photos
      : Array.isArray(p.photos)
        ? p.photos
        : [];
    for (const ph of photos) {
      if (typeof ph === "string") {
        const u = pickHttpUrl(ph);
        if (u) return u;
      } else if (ph && typeof ph === "object") {
        const o = ph as Record<string, unknown>;
        const u = pickHttpUrl(o.url, o.src);
        if (u) return u;
      }
    }
  }
  const legacy = s.gallery && typeof s.gallery === "object" ? (s.gallery as Record<string, unknown>) : null;
  if (Array.isArray(legacy?.photos)) {
    for (const ph of legacy!.photos) {
      if (typeof ph === "string") {
        const u = pickHttpUrl(ph);
        if (u) return u;
      } else if (ph && typeof ph === "object") {
        const o = ph as Record<string, unknown>;
        const u = pickHttpUrl(o.url, o.src);
        if (u) return u;
      }
    }
  }
  return "";
}

function pickProfileImage(profile: unknown): string {
  if (!profile || typeof profile !== "object") return "";
  const o = profile as Record<string, unknown>;
  return pickHttpUrl(o.image_url, o.imageUrl, o.photo_url, o.photoUrl, o.portrait_url);
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

/**
 * GET /api/v1/showcase/view/:phone 및 GET /showcase/:phone
 * 카카오·문자 스크래퍼용 OG HTML → 사람은 www SPA 쇼케이스로 이동
 */
export async function respondShowcaseOgView(c: Context) {
  try {
    const rawPhone = decodeURIComponent(String(c.req.param("phone") || "").trim());
    const digits = phoneDigitsForUrl(rawPhone);
    if (!digits) return c.text("유효한 번호가 아닙니다.", 400);

    const imageApiBase = imageApiBaseFromRequest(c);
    const webOrigin = getVluePublicOrigin();
    const shareOrigin = getVlueShareOrigin();
    const spaUrl = `${webOrigin}/site/web/showcase/${encodeURIComponent(digits)}`;
    const shareUrl = `${shareOrigin}/showcase/${encodeURIComponent(digits)}`;

    const lookup = await lookupCardByRawNumber(digits, { forPublicOgShare: true });
    const body = lookup.status === 200 ? lookup.body : null;
    const matched = Boolean(body && (body as { matched?: boolean }).matched);

    let name = "";
    let org = "";
    let role = "";
    let handle = "";
    let cardId = "";
    let photo = "";
    let cover = "";
    let shareCover = "";

    if (matched && body) {
      const b = body as {
        displayName?: string;
        companyName?: string;
        jobTitle?: string;
        publicHandle?: string;
        cardId?: string;
        image_url?: string | null;
        userId?: string;
        profile?: unknown;
      };
      name = String(b.displayName || "").trim();
      org = String(b.companyName || "").trim();
      role = String(b.jobTitle || "").trim();
      handle = String(b.publicHandle || "").trim().replace(/^@/, "");
      cardId = String(b.cardId || "").trim();
      photo = pickHttpUrl(b.image_url, pickProfileImage(b.profile));

      if (b.userId) {
        try {
          const dc = await prisma.digitalCard.findUnique({
            where: { userId: String(b.userId) },
            select: { id: true, exportSnapshotJson: true }
          });
          if (dc?.id && !cardId) cardId = dc.id;
          const snap =
            dc?.exportSnapshotJson && typeof dc.exportSnapshotJson === "object"
              ? (dc.exportSnapshotJson as Record<string, unknown>)
              : null;
          shareCover = pickHttpUrl(snap?.shareCoverUrl, snap?.kakaoFeedBgUrl);
        } catch {
          /* ignore */
        }
        try {
          const pub = await getUserShowcasePublicLive(b.userId);
          cover = extractStyleCover(pub.live);
        } catch {
          /* ignore */
        }
      }
    }

    const phoneDisplay = formatPhoneDisplayKR(digits) || digits;
    /* 사용자가 지정한 배경 썸네일(shareCover)이 쇼케이스 첫 장보다 우선 */
    const feedCache = shareCover.replace(/[^\w]/g, "").slice(-32);
    const ogImage =
      shareCover ||
      (cardId ? kakaoFeedCardImageUrl(imageApiBase, cardId, feedCache) : "") ||
      cover ||
      photo ||
      getKakaoShareButtonImageUrl(webOrigin);

    if (!name) name = handle ? `@${handle}` : phoneDisplay;

    const forScraper = isOgScraperUserAgent(c.req.header("user-agent") || "");

    const html = buildShowcaseOgLandingPage({
      name,
      org,
      role,
      handle,
      phoneDisplay,
      ogImage,
      shareUrl,
      spaUrl,
      createUrl: getVlueCreateUrl(),
      forScraper
    });

    /* 스크래퍼 HTML과 사람용 HTML을 Cloudflare가 섞지 않도록 엣지 캐시 금지 */
    c.header("Vary", "User-Agent");
    c.header("Cache-Control", forScraper ? "public, max-age=60" : "private, no-store");
    c.header("CDN-Cache-Control", "no-store");
    c.header("Cloudflare-CDN-Cache-Control", "no-store");
    c.header("Content-Type", "text/html; charset=utf-8");
    if (c.req.method === "HEAD") {
      c.header("Content-Length", String(Buffer.byteLength(html, "utf8")));
      return c.body(null);
    }
    return c.html(html);
  } catch (err) {
    console.warn("[showcase-og-view] failed", err);
    return c.text("쇼케이스를 불러올 수 없습니다.", 500);
  }
}

showcasePublicRoutes.on(["GET", "HEAD"], "/view/:phone", (c) => respondShowcaseOgView(c));
