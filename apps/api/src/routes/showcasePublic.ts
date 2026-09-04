import { Hono, type Context } from "hono";
import {
  buildShowcaseOgLandingPage,
  isUserDocumentNavigation
} from "../services/showcase/showcaseOgLandingPage.js";
import {
  fetchOgCoverBytes,
  getCachedOgCover,
  loadShowcaseOgShareMeta,
  setCachedOgCover,
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
import { resolveKakaoProfilePageUrl } from "../services/kakaoLinkService.js";
import { buildKakaoTalkAddBridgeHtml } from "../services/showcase/kakaoTalkAddBridgePage.js";
import { normalizeKakaoTalkId } from "../integrations/kakao/kakaoTalkId.js";

/** 공개 쇼케이스 — 카카오 OG 랜딩 */
export const showcasePublicRoutes = new Hono();

function apiBaseFromRequest(c: { req: { header: (n: string) => string | undefined } }) {
  const proto = c.req.header("x-forwarded-proto") || "http";
  const host = c.req.header("x-forwarded-host") || c.req.header("host") || "localhost:8788";
  return `${proto}://${host}`.replace(/\/$/, "");
}

export function phoneDigitsForUrl(raw: string): string {
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

function spaUrlFor(digits: string) {
  return `${getVluePublicOrigin()}/site/web/showcase/${encodeURIComponent(digits)}`;
}

function sanitizeShareToken(cacheKey = "") {
  return String(cacheKey || "")
    .replace(/\.(jpe?g|png|gif|webp|avif|bmp|svg)([?#].*)?$/i, "")
    .replace(/[^\w-]/g, "")
    .slice(0, 40);
}

function shareUrlFor(digits: string, cacheKey = "") {
  const base = `${getVlueShareOrigin()}/showcase/${encodeURIComponent(digits)}`;
  const v = sanitizeShareToken(cacheKey);
  /* 카카오는 ?v= 쿼리를 무시하고 경로 단위로 OG 캐시하는 경우가 많음 → /t/{token} 경로 사용 */
  return v ? `${base}/t/${encodeURIComponent(v)}` : base;
}

function coverUrlFor(digits: string, cacheKey = "") {
  const base = `${getVlueShareOrigin()}/showcase/${encodeURIComponent(digits)}`;
  const v = sanitizeShareToken(cacheKey);
  return v
    ? `${base}/t/${encodeURIComponent(v)}/cover.jpg`
    : `${base}/cover.jpg`;
}

function coverCacheKey(meta: {
  shareCover?: string;
  photo?: string;
  name?: string;
  org?: string;
  role?: string;
  handle?: string;
  phone?: string;
}) {
  const media = String(meta.shareCover || meta.photo || "").trim();
  const fingerprint = [
    media,
    meta.name || "",
    meta.org || "",
    meta.role || "",
    meta.handle || "",
    meta.phone || ""
  ].join("|");
  let h = 2166136261;
  for (let i = 0; i < fingerprint.length; i++) {
    h ^= fingerprint.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const hash = (h >>> 0).toString(36);
  /* 파일명 확장자(.jpg 등)를 토큰에 넣으면 카톡이 이미지 URL로 오인 */
  const mediaStem = media
    .replace(/\.[a-zA-Z0-9]{2,5}([?#].*)?$/, "")
    .replace(/[^\w-]/g, "");
  const tail = mediaStem.slice(-20);
  const key = `${hash}${tail ? `-${tail}` : ""}`.replace(/[^\w-]/g, "");
  return key.slice(0, 40) || String(Date.now());
}

function sendOgHtml(c: Context, html: string) {
  c.header("Vary", "Accept-Encoding, Sec-Fetch-Mode, Sec-Fetch-User");
  /* OG는 짧게 — 타이틀사진·명함 정보 변경 직후 스크랩 반영 */
  c.header("Cache-Control", "public, max-age=60, s-maxage=60, must-revalidate");
  c.header("CDN-Cache-Control", "public, max-age=60");
  c.header("Cloudflare-CDN-Cache-Control", "public, max-age=60");
  c.header("Content-Type", "text/html; charset=utf-8");
  if (c.req.method === "HEAD") {
    c.header("Content-Length", String(Buffer.byteLength(html, "utf8")));
    return c.body(null);
  }
  return c.html(html);
}

async function resolveUpstreamCoverUrl(c: Context, digits: string): Promise<string> {
  const meta = await loadShowcaseOgShareMeta(digits);
  const webOrigin = getVluePublicOrigin();
  const imageApiBase = imageApiBaseFromRequest(c);
  return (
    toAsciiOgImageUrl(meta.shareCover) ||
    (meta.cardId ? kakaoFeedCardImageUrl(imageApiBase, meta.cardId) : "") ||
    toAsciiOgImageUrl(meta.photo) ||
    getKakaoShareButtonImageUrl(webOrigin)
  );
}

async function buildOgHtml(digits: string): Promise<string> {
  const phoneDisplay = formatPhoneDisplayKR(digits) || digits;
  const meta = await loadShowcaseOgShareMeta(digits);
  const name = meta.name || (meta.handle ? `@${meta.handle}` : phoneDisplay);
  const v = coverCacheKey({ ...meta, phone: digits });
  return buildShowcaseOgLandingPage({
    name,
    org: meta.org,
    role: meta.role,
    handle: meta.handle,
    phoneDisplay,
    ogImage: coverUrlFor(digits, v),
    shareUrl: shareUrlFor(digits, v),
    spaUrl: spaUrlFor(digits),
    createUrl: getVlueCreateUrl(),
    forScraper: true
  });
}

/**
 * GET /api/v1/showcase/view/:phone 및 GET /showcase/:phone
 * 문자·카카오 스크래퍼는 항상 OG HTML. 사람이 탭하면 SPA로 보낸다.
 */
export async function respondShowcaseOgView(c: Context) {
  try {
    const rawPhone = decodeURIComponent(String(c.req.param("phone") || "").trim());
    const digits = phoneDigitsForUrl(rawPhone);
    if (!digits) return c.text("유효한 번호가 아닙니다.", 400);

    if (
      isUserDocumentNavigation({
        userAgent: c.req.header("user-agent"),
        secFetchUser: c.req.header("sec-fetch-user"),
        secFetchMode: c.req.header("sec-fetch-mode"),
        secFetchDest: c.req.header("sec-fetch-dest")
      })
    ) {
      return c.redirect(spaUrlFor(digits), 302);
    }

    const token = String(c.req.param("token") || "").trim();
    const meta = await loadShowcaseOgShareMeta(digits);
    const currentToken = coverCacheKey({ ...meta, phone: digits });

    /* 구 주소(/showcase/010…) 스크랩 → 최신 /t/{token} 로 보내 카카오 OG 캐시 우회 */
    if (!token && currentToken) {
      const dest = shareUrlFor(digits, currentToken);
      c.header("Cache-Control", "no-store");
      return c.redirect(dest, 302);
    }

    /* 토큰이 옛것이면 현재 토큰으로 정규화 */
    if (token && currentToken && token !== currentToken) {
      c.header("Cache-Control", "no-store");
      return c.redirect(shareUrlFor(digits, currentToken), 302);
    }

    const html = await buildOgHtml(digits);
    setCachedOgHtml(digits, html);
    return sendOgHtml(c, html);
  } catch (err) {
    console.warn("[showcase-og-view] failed", err);
    return c.text("쇼케이스를 불러올 수 없습니다.", 500);
  }
}

/** 안드로이드 OG는 같은 호스트의 짧은 이미지 경로를 더 잘 읽는다. */
export async function respondShowcaseOgCover(c: Context) {
  try {
    const rawPhone = decodeURIComponent(String(c.req.param("phone") || "").trim());
    const digits = phoneDigitsForUrl(rawPhone);
    if (!digits) return c.text("not found", 404);

    /* 토큰·?v= 있으면 메모리 캐시 스킵 — 타이틀사진 변경 즉시 반영 */
    const bust =
      String(c.req.param("token") || "").trim() || String(c.req.query("v") || "").trim();
    const hit = bust ? null : getCachedOgCover(digits);
    if (hit) {
      c.header("Cache-Control", "public, max-age=60, must-revalidate");
      c.header("CDN-Cache-Control", "public, max-age=60");
      c.header("Cloudflare-CDN-Cache-Control", "public, max-age=60");
      c.header("Content-Type", hit.contentType);
      if (c.req.method === "HEAD") {
        c.header("Content-Length", String(hit.bytes.length));
        return c.body(null);
      }
      return c.body(new Uint8Array(hit.bytes));
    }

    const target = await resolveUpstreamCoverUrl(c, digits);
    const fetched = await fetchOgCoverBytes(target);
    if (!fetched) {
      return c.redirect(target || getKakaoShareButtonImageUrl(getVluePublicOrigin()), 302);
    }
    setCachedOgCover(digits, fetched.bytes, fetched.contentType);
    c.header("Cache-Control", "public, max-age=60, must-revalidate");
    c.header("CDN-Cache-Control", "public, max-age=60");
    c.header("Cloudflare-CDN-Cache-Control", "public, max-age=60");
    c.header("Content-Type", fetched.contentType);
    if (c.req.method === "HEAD") {
      c.header("Content-Length", String(fetched.bytes.length));
      return c.body(null);
    }
    return c.body(new Uint8Array(fetched.bytes));
  } catch (err) {
    console.warn("[showcase-og-cover] failed", err);
    return c.redirect(getKakaoShareButtonImageUrl(getVluePublicOrigin()), 302);
  }
}

showcasePublicRoutes.on(["GET", "HEAD"], "/view/:phone", (c) => respondShowcaseOgView(c));

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** OAuth 인증 카카오 — 개인 ID 친구추가 또는 채널 URL로 리다이렉트 */
showcasePublicRoutes.get("/users/:userId/kakao-profile", async (c) => {
  const userId = String(c.req.param("userId") || "").trim();
  if (!UUID_RE.test(userId)) {
    return c.text("유효한 사용자 ID가 아닙니다.", 400);
  }
  const url = await resolveKakaoProfilePageUrl(userId);
  if (!url) {
    return c.text("등록된 카카오톡 ID 또는 카카오 채널이 없습니다.", 404);
  }
  return c.redirect(url, 302);
});

/** 카카오톡 친구추가 브릿지 (웹·데스크톱 폴백) */
showcasePublicRoutes.get("/kakao-talk/:talkId/add", (c) => {
  const talkId = String(c.req.param("talkId") || "").trim();
  if (!normalizeKakaoTalkId(talkId)) {
    return c.text("유효한 카카오톡 ID가 아닙니다.", 400);
  }
  const html = buildKakaoTalkAddBridgeHtml(talkId);
  if (!html) return c.text("유효한 카카오톡 ID가 아닙니다.", 400);
  return c.html(html);
});
