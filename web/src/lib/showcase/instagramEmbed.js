/**
 * Instagram 게시물 → VLUE 쇼케이스용 미디어 메타데이터
 * - 이미지 파일은 서버에 저장하지 않음
 * - media_url 을 img src 에 직접 사용 (만료 시 resolve API로 갱신)
 */

const POST_PATH_RE = /^\/(p|reel|reels|tv)\/([A-Za-z0-9_-]+)/i;
const MAX_PHOTOS_PER_PAGE = 20;

/**
 * @typedef {{
 *   id: string,
 *   mediaUrl?: string,
 *   thumbnailUrl?: string,
 *   permalink?: string,
 *   caption?: string | null,
 *   mediaType?: string,
 *   timestamp?: string | null,
 *   children?: Array<{ id: string, mediaUrl?: string, thumbnailUrl?: string, mediaType?: string }>
 * }} InstagramShowcaseMedia
 */

export function isInstagramPostOrReelUrl(raw) {
  const url = String(raw || "").trim();
  if (!url) return false;
  try {
    const parsed = new URL(url.startsWith("http") ? url : `https://${url}`);
    const host = parsed.hostname.replace(/^www\./, "").toLowerCase();
    if (host !== "instagram.com" && host !== "instagr.am") return false;
    return POST_PATH_RE.test(parsed.pathname);
  } catch {
    return false;
  }
}

function normalizeChild(row) {
  if (!row || typeof row !== "object") return null;
  const id = String(row.id || "").trim();
  const mediaUrl = String(row.mediaUrl || row.media_url || "").trim();
  const thumbnailUrl = String(row.thumbnailUrl || row.thumbnail_url || "").trim();
  if (!id && !mediaUrl && !thumbnailUrl) return null;
  return {
    id: id || mediaUrl || thumbnailUrl,
    mediaUrl: mediaUrl || thumbnailUrl,
    thumbnailUrl: thumbnailUrl || mediaUrl,
    mediaType: String(row.mediaType || row.media_type || "IMAGE")
  };
}

/**
 * 연동 후 선택한 Instagram 게시물 메타 (페이지 = 게시물 1개, 내부 사진 ≤ 20)
 * pages[] 우선, 없으면 platformFeed.instagramMedia (레거시)
 * @param {object} [styleConfig]
 * @returns {InstagramShowcaseMedia[]}
 */
export function listInstagramShowcaseMedia(styleConfig) {
  const fromPages = [];
  const seen = new Set();
  const pages = Array.isArray(styleConfig?.pages) ? styleConfig.pages : [];
  for (const page of pages) {
    if (String(page?.type || "") !== "instagram") continue;
    const row = page?.instagramMedia;
    if (!row || typeof row !== "object") continue;
    const id = String(row.id || "").trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    fromPages.push(normalizeMediaRow(row));
  }
  if (fromPages.length) return fromPages;

  const feed = styleConfig?.platformFeed || {};
  const raw = Array.isArray(feed.instagramMedia) ? feed.instagramMedia : [];
  const out = [];
  for (const row of raw) {
    const normalized = normalizeMediaRow(row);
    if (!normalized || seen.has(normalized.id)) continue;
    seen.add(normalized.id);
    out.push(normalized);
  }
  return out;
}

function normalizeMediaRow(row) {
  if (!row || typeof row !== "object") return null;
  const id = String(row.id || "").trim();
  if (!id) return null;
  const children = (Array.isArray(row.children) ? row.children : [])
    .map(normalizeChild)
    .filter(Boolean)
    .slice(0, MAX_PHOTOS_PER_PAGE);
  const mediaUrl = String(row.mediaUrl || row.thumbnailUrl || "").trim();
  return {
    id,
    mediaUrl,
    thumbnailUrl: String(row.thumbnailUrl || mediaUrl).trim(),
    permalink: String(row.permalink || "").trim(),
    caption: typeof row.caption === "string" ? row.caption : null,
    mediaType: String(row.mediaType || "").trim() || "IMAGE",
    timestamp: typeof row.timestamp === "string" ? row.timestamp : null,
    children
  };
}

/** 한 게시물 페이지에 표시할 사진 URL 목록 (캐러셀 children 우선) */
export function photosForInstagramMediaItem(item) {
  if (!item) return [];
  const children = Array.isArray(item.children) ? item.children : [];
  if (children.length) {
    return children
      .map((c) => ({
        id: c.id,
        url: String(c.mediaUrl || c.thumbnailUrl || "").trim(),
        mediaUrl: c.mediaUrl
      }))
      .filter((p) => p.url)
      .slice(0, MAX_PHOTOS_PER_PAGE);
  }
  const url = String(item.mediaUrl || item.thumbnailUrl || "").trim();
  return url ? [{ id: item.id, url, mediaUrl: item.mediaUrl }] : [];
}

/** @deprecated */
export function listInstagramEmbedUrls(styleConfig) {
  return listInstagramShowcaseMedia(styleConfig)
    .map((m) => m.permalink)
    .filter((u) => isInstagramPostOrReelUrl(u));
}

/** @deprecated 임베드 폐기 — 항상 false */
export function shouldUseInstagramEmbedMode() {
  return false;
}

/** @deprecated 임베드 폐기 */
export function pickInstagramEmbedSourceUrl() {
  return "";
}

/** @deprecated 임베드 폐기 — iframe 경로 없음 */
export function resolveInstagramEmbed() {
  return { ok: false, reason: "embed_removed" };
}

export function isInstagramVerified(styleConfig) {
  return styleConfig?.platformFeed?.instagramVerified === true;
}

export function instagramVerifiedLabel(styleConfig) {
  if (!isInstagramVerified(styleConfig)) return "";
  const handle = String(styleConfig?.platformFeed?.instagramHandle || "").trim();
  return handle ? `Instagram 인증완료✔ ${handle}` : "Instagram 인증완료✔";
}
