import { listPhotoTextOverlays } from "../../components/showcase/ShowcasePhotoTextOverlay.jsx";

/** 케이스함 피드 게시물 카테고리 */
export const MYCASE_FEED_CATEGORIES = Object.freeze([
  { id: "daily", label: "일상" },
  { id: "food", label: "음식" },
  { id: "travel", label: "여행" },
  { id: "business", label: "사업" },
  { id: "work", label: "작품" },
  { id: "story", label: "나의 이야기" }
]);

export const MYCASE_FEED_MAX_IMAGES = 10;

export function mycaseCategoryLabel(id) {
  const hit = MYCASE_FEED_CATEGORIES.find((c) => c.id === id);
  return hit?.label || "게시물";
}

/** 그리드 필터 옵션 (전체 + 피드 카테고리 + 아카이브) */
export const MYCASE_CATEGORY_FILTER_OPTIONS = Object.freeze([
  { id: "all", label: "전체" },
  ...MYCASE_FEED_CATEGORIES,
  { id: "archive", label: "아카이브" }
]);

export function mycaseCategoryFilterLabel(filterId) {
  const hit = MYCASE_CATEGORY_FILTER_OPTIONS.find((c) => c.id === filterId);
  return hit?.label || "전체";
}

/** 통화 쇼케이스·케이스함 게시물 소셜 slideId (좋아요·댓글·공유 연동) */
export function mycaseSocialSlideId(caseId, imageId) {
  const cid = String(caseId || "").trim();
  const iid = String(imageId || "").trim();
  if (!cid) return "";
  const raw = iid ? `mycase-${cid}-${iid}` : `mycase-${cid}`;
  return raw.slice(0, 80);
}

function tryUrl(u) {
  const s = String(u || "").trim();
  if (!s || s.startsWith("blob:") || s.startsWith("data:")) return "";
  return s;
}

/** @param {object} photo */
export function normalizeMycaseImage(photo, idx = 0) {
  const url = tryUrl(photo?.url || photo?.src || photo);
  if (!url) return null;
  const out = {
    id: String(photo?.id || `img-${idx}`),
    url
  };
  if (!photo || typeof photo !== "object") return out;
  if (Array.isArray(photo.textOverlays) && photo.textOverlays.length) {
    out.textOverlays = photo.textOverlays;
  }
  for (const key of [
    "overlayText",
    "overlayFont",
    "overlayFontSize",
    "overlayColor",
    "overlayX",
    "overlayY",
    "overlayAnim",
    "overlayBorder"
  ]) {
    if (photo[key] != null && photo[key] !== "") out[key] = photo[key];
  }
  return out;
}

function serializeMycaseImageForPayload(photo, idx = 0) {
  const norm = normalizeMycaseImage(photo, idx);
  if (!norm) return null;
  const overlays = listPhotoTextOverlays(norm).map(
    ({ id, text, font, fontSize, color, x, y, anim, border }) => ({
      id,
      text,
      font,
      fontSize,
      color,
      x,
      y,
      anim,
      border
    })
  );
  const out = { id: norm.id, url: norm.url };
  if (overlays.length) out.textOverlays = overlays;
  return out;
}

/**
 * payloadJson → 게시물 메타·이미지 목록
 * @param {object|null|undefined} payloadJson
 * @param {object|null|undefined} [item]
 */
export function parseMycasePostPayload(payloadJson, item = null) {
  const payload = payloadJson && typeof payloadJson === "object" ? payloadJson : {};
  let postType = String(payload.postType || "").trim();
  if (!postType) {
    if (Array.isArray(payload.images) && payload.images.length > 0) postType = "feed";
    else if (payload.style && typeof payload.style === "object") postType = "showcase";
    else postType = "feed";
  }

  if (postType === "feed") {
    const images = (Array.isArray(payload.images) ? payload.images : [])
      .map((ph, i) => normalizeMycaseImage(ph, i))
      .filter(Boolean)
      .slice(0, MYCASE_FEED_MAX_IMAGES);
    return {
      postType: "feed",
      category: String(payload.category || "daily"),
      caption: String(payload.caption || item?.title || "").trim(),
      lineId: String(payload.lineId || "").trim(),
      images,
      style: null
    };
  }

  const style = payload.style && typeof payload.style === "object" ? payload.style : null;
  const images = extractImagesFromShowcaseStyle(style);
  return {
    postType: "showcase",
    category: String(payload.category || "").trim() || "archive",
    caption: String(item?.title || "").trim(),
    lineId: String(payload.lineId || "").trim(),
    images,
    style
  };
}

/** @param {object|null|undefined} style */
export function extractImagesFromShowcaseStyle(style) {
  if (!style || typeof style !== "object") return [];
  const out = [];
  const seen = new Set();

  const push = (ph, idx) => {
    const norm = normalizeMycaseImage(ph, idx);
    if (!norm || seen.has(norm.url)) return;
    seen.add(norm.url);
    out.push(norm);
  };

  const pages = Array.isArray(style.pages) ? style.pages : [];
  for (const page of pages) {
    const photos = page?.gallery?.photos || page?.photos || [];
    if (Array.isArray(photos)) photos.forEach((ph, i) => push(ph, out.length + i));
    const ig = page?.instagramMedia;
    if (ig) push({ url: ig.thumbnailUrl || ig.mediaUrl || ig.url, id: ig.id }, out.length);
  }

  const legacy = style?.gallery?.photos;
  if (Array.isArray(legacy)) legacy.forEach((ph, i) => push(ph, out.length + i));

  return out.slice(0, MYCASE_FEED_MAX_IMAGES);
}

/** @param {object} input */
export function buildFeedPostPayloadJson({ category, caption, images, lineId }) {
  const list = (Array.isArray(images) ? images : [])
    .map((ph, i) => serializeMycaseImageForPayload(ph, i))
    .filter(Boolean)
    .slice(0, MYCASE_FEED_MAX_IMAGES);
  return {
    v: 3,
    postType: "feed",
    category: String(category || "daily"),
    caption: String(caption || "").trim().slice(0, 2000),
    lineId: String(lineId || "").trim() || null,
    images: list
  };
}
