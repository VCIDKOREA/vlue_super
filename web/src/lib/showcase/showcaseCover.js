/**
 * 쇼케이스 스타일에서 그리드용 대표 썸네일 URL 추출
 * @param {object|null|undefined} style
 * @returns {string}
 */
export function extractShowcaseCoverUrl(style) {
  if (!style || typeof style !== "object") return "";

  const tryUrl = (u) => {
    const s = String(u || "").trim();
    if (!s) return "";
    if (s.startsWith("blob:")) return ""; // 휘발성 — 저장 불가
    return s;
  };

  const pages = Array.isArray(style.pages) ? style.pages : [];
  for (const page of pages) {
    const photos = page?.gallery?.photos || page?.photos || [];
    if (!Array.isArray(photos)) continue;
    for (const ph of photos) {
      const url = tryUrl(ph?.url || ph?.src || ph);
      if (url) return url;
    }
    const ig = page?.instagramMedia;
    if (ig) {
      const url = tryUrl(ig.thumbnailUrl || ig.mediaUrl || ig.url);
      if (url) return url;
    }
  }

  const legacy = style?.gallery?.photos;
  if (Array.isArray(legacy)) {
    for (const ph of legacy) {
      const url = tryUrl(ph?.url || ph?.src || ph);
      if (url) return url;
    }
  }

  const feed = style?.platformFeed;
  const av = tryUrl(feed?.avatarUrl || feed?.instagramAvatarUrl || feed?.kakaoAvatarUrl);
  if (av) return av;

  return "";
}

/**
 * 아카이브 제목 후보
 * @param {object|null|undefined} style
 */
export function extractShowcaseArchiveTitle(style) {
  const body = String(style?.richCustom?.bodyText || "").trim();
  if (body) return body.slice(0, 40);
  const pageBody = Array.isArray(style?.pages)
    ? String(style.pages.find((p) => p?.richCustom?.bodyText)?.richCustom?.bodyText || "").trim()
    : "";
  if (pageBody) return pageBody.slice(0, 40);
  return `쇼케이스 ${new Date().toLocaleDateString("ko-KR")}`;
}
