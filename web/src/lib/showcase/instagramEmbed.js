/**
 * Instagram 게시물/릴스 → 공식 embed URL
 * - 프로필 URL은 임베드 불가 (게시물 단위만)
 * - oEmbed HTML이 가리키는 실제 재생면과 동일: /p|reel|tv/{code}/embed/
 */

const POST_PATH_RE = /^\/(p|reel|reels|tv)\/([A-Za-z0-9_-]+)/i;

/**
 * @typedef {{
 *   ok: true,
 *   kind: "p" | "reel" | "tv",
 *   shortcode: string,
 *   permalink: string,
 *   embedUrl: string,
 *   embedCaptionedUrl: string
 * } | { ok: false, reason: string }} InstagramEmbedResolved
 */

/**
 * @param {string} raw
 * @returns {boolean}
 */
export function isInstagramPostOrReelUrl(raw) {
  return resolveInstagramEmbed(raw).ok === true;
}

/**
 * @param {string} raw
 * @returns {InstagramEmbedResolved}
 */
export function resolveInstagramEmbed(raw, { captioned = false } = {}) {
  const url = String(raw || "").trim();
  if (!url) return { ok: false, reason: "empty" };

  let parsed;
  try {
    parsed = new URL(url.startsWith("http") ? url : `https://${url}`);
  } catch {
    return { ok: false, reason: "invalid_url" };
  }

  const host = parsed.hostname.replace(/^www\./, "").toLowerCase();
  if (host !== "instagram.com" && host !== "instagr.am") {
    return { ok: false, reason: "not_instagram" };
  }

  const match = parsed.pathname.match(POST_PATH_RE);
  if (!match) {
    return { ok: false, reason: "not_post_or_reel" };
  }

  const kindRaw = match[1].toLowerCase();
  const kind = kindRaw === "reels" ? "reel" : kindRaw;
  const shortcode = match[2];
  const pathKind = kind === "reel" ? "reel" : kind === "tv" ? "tv" : "p";
  const permalink = `https://www.instagram.com/${pathKind}/${shortcode}/`;
  const embedUrl = `https://www.instagram.com/${pathKind}/${shortcode}/embed/`;
  const embedCaptionedUrl = `https://www.instagram.com/${pathKind}/${shortcode}/embed/captioned/`;

  return {
    ok: true,
    kind: /** @type {"p"|"reel"|"tv"} */ (pathKind === "reel" ? "reel" : pathKind === "tv" ? "tv" : "p"),
    shortcode,
    permalink,
    embedUrl: captioned ? embedCaptionedUrl : embedUrl,
    embedCaptionedUrl
  };
}

/**
 * 쇼케이스 설정에서 임베드 후보 URL 수집 (우선순위)
 * @param {object} [styleConfig]
 * @param {object} [slide]
 * @returns {string}
 */
export function pickInstagramEmbedSourceUrl(styleConfig, slide) {
  const feed = styleConfig?.platformFeed || {};
  const outlinks = styleConfig?.commercial?.outlinks || {};
  const candidates = [
    slide?.instagramPostUrl,
    slide?.instagramUrl,
    feed.instagramPostUrl,
    outlinks.instagram,
    feed.instagramProfileUrl
  ];
  for (const c of candidates) {
    const s = String(c || "").trim();
    if (!s) continue;
    if (isInstagramPostOrReelUrl(s)) return s;
  }
  return "";
}

/**
 * @param {object} [styleConfig]
 * @param {object} [slide]
 */
export function shouldUseInstagramEmbedMode(styleConfig, slide) {
  const src = pickInstagramEmbedSourceUrl(styleConfig, slide);
  return Boolean(src && resolveInstagramEmbed(src).ok);
}
