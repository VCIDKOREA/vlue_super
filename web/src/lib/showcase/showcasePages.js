/**
 * 쇼케이스 세로 페이지 모델
 * - 디지털인증명함 사용 시 1페이지는 항상 명함 (pages[] 밖)
 * - pages[]: 개인커스텀 / 기본형 콘텐츠 페이지 (V1 — 인스타 페이지 없음)
 */

import { SHOWCASE_MAX_PHOTOS_PER_PAGE, maxShowcaseContentPagesForTier } from "./tentShowcaseTypes.js";

/** @typedef {'instagram' | 'rich_custom' | 'default'} ShowcasePageType */

export const SHOWCASE_PAGE_TYPES = Object.freeze({
  /** @deprecated V1 — 인스타 페이지 미지원. 홍보 링크만 사용 */
  INSTAGRAM: "instagram",
  RICH_CUSTOM: "rich_custom",
  DEFAULT: "default"
});

/** V1 — 콘텐츠 페이지에서 인스타그램 슬롯 제거 */
export function stripInstagramContentPages(pages) {
  return (Array.isArray(pages) ? pages : [])
    .filter((p) => normalizePageType(p?.type) !== SHOWCASE_PAGE_TYPES.INSTAGRAM)
    .map(normalizeShowcasePage);
}

function uid(prefix = "page") {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createDefaultPageRichCustom() {
  return {
    fontFamily: "pretendard",
    fontSize: 16,
    fontColor: "#191f28",
    fontWeight: "600",
    textAlign: "left",
    bodyText: "",
    emoji: ""
  };
}

export function createDefaultPageCaseTheme() {
  return { frame: "classic", accent: "#2b6ff0", pattern: "none" };
}

/**
 * 페이지당 비즈니스 링크 1개
 * @param {unknown} raw
 * @returns {{ id: string, name: string, url: string, logoUrl: string }|null}
 */
export function normalizeBusinessLink(raw) {
  if (!raw || typeof raw !== "object") return null;
  const name = String(raw.name || "").trim();
  const url = String(raw.url || "").trim();
  if (!name || !url) return null;
  let logoUrl = String(raw.logoUrl || raw.imageUrl || "").trim();
  /* data:/blob: 는 서버 동기화에서 탈락 — 미리보기에도 「링크」 폴백만 보이므로 비움 */
  if (logoUrl.startsWith("data:") || logoUrl.startsWith("blob:")) {
    logoUrl = "";
  }
  return {
    id: String(raw.id || `link-${Date.now().toString(36)}`).trim(),
    name,
    url,
    logoUrl
  };
}

/**
 * @param {ShowcasePageType} [type]
 * @param {object} [seed]
 */
export function createShowcasePage(type = SHOWCASE_PAGE_TYPES.RICH_CUSTOM, seed = {}) {
  const t = normalizePageType(type);
  const photoCap = t === SHOWCASE_PAGE_TYPES.RICH_CUSTOM ? 1 : SHOWCASE_MAX_PHOTOS_PER_PAGE;
  return {
    id: seed.id || uid("page"),
    type: t,
    instagramMedia: t === SHOWCASE_PAGE_TYPES.INSTAGRAM ? seed.instagramMedia || null : null,
    gallery: {
      photos: Array.isArray(seed.gallery?.photos)
        ? seed.gallery.photos.slice(0, photoCap)
        : Array.isArray(seed.photos)
          ? seed.photos.slice(0, photoCap)
          : []
    },
    richCustom: { ...createDefaultPageRichCustom(), ...(seed.richCustom || {}) },
    caseTheme: { ...createDefaultPageCaseTheme(), ...(seed.caseTheme || {}) },
    businessLink: normalizeBusinessLink(seed.businessLink)
  };
}

export function normalizePageType(type) {
  const t = String(type || "").toLowerCase();
  if (t === SHOWCASE_PAGE_TYPES.INSTAGRAM) return SHOWCASE_PAGE_TYPES.INSTAGRAM;
  if (t === SHOWCASE_PAGE_TYPES.DEFAULT) return SHOWCASE_PAGE_TYPES.DEFAULT;
  return SHOWCASE_PAGE_TYPES.RICH_CUSTOM;
}

export function pageTypeLabel(type) {
  const t = normalizePageType(type);
  if (t === SHOWCASE_PAGE_TYPES.INSTAGRAM) return "인스타그램";
  if (t === SHOWCASE_PAGE_TYPES.DEFAULT) return "기본형";
  return "쇼케이스";
}

/**
 * 화면 표기 페이지 번호 (명함 포함 시 콘텐츠는 2부터)
 * @param {number} contentIndex0  content pages[] 0-based index
 * @param {boolean} includeDigitalCard
 */
export function contentPageDisplayNumber(contentIndex0, includeDigitalCard) {
  return (includeDigitalCard ? 2 : 1) + contentIndex0;
}

export function normalizeShowcasePage(raw) {
  if (!raw || typeof raw !== "object") return createShowcasePage();
  return createShowcasePage(raw.type, raw);
}

/**
 * 레거시 flat 설정 → pages[]
 * @param {object} config
 * @returns {object[]}
 */
export function migrateLegacyPages(config) {
  if (Array.isArray(config?.pages) && config.pages.length > 0) {
    return stripInstagramContentPages(config.pages);
  }

  const pages = [];
  const photos = Array.isArray(config?.gallery?.photos) ? config.gallery.photos : [];
  const style = String(config?.styleType || "default");
  if (photos.length > 0 || style === "rich_custom" || style === "certificate") {
    pages.push(
      createShowcasePage(SHOWCASE_PAGE_TYPES.RICH_CUSTOM, {
        id: "legacy-custom",
        gallery: { photos },
        richCustom: config?.richCustom,
        caseTheme: config?.caseTheme
      })
    );
  }

  return pages;
}

/**
 * pages[] → 레거시 필드 동기화 (구 코드 호환)
 * commercial.links(전역) → 페이지별 businessLink 1개로 이전
 * @param {object} config
 */
export function syncLegacyFieldsFromPages(config) {
  const pagesIn = stripInstagramContentPages(config.pages);
  const globalLinks = [
    ...(Array.isArray(config?.commercial?.links) ? config.commercial.links : []),
    ...(Array.isArray(config?.commercial?.products) ? config.commercial.products : [])
  ]
    .map(normalizeBusinessLink)
    .filter(Boolean);

  const anyPageLink = pagesIn.some((p) => normalizeBusinessLink(p?.businessLink));
  const pages = pagesIn.map((p, i) => {
    const existing = normalizeBusinessLink(p?.businessLink);
    if (existing) return { ...p, businessLink: existing };
    if (anyPageLink) return { ...p, businessLink: null };
    /* 전역 링크가 남아 있으면 페이지 순서대로 1개씩 이전 */
    return { ...p, businessLink: globalLinks[i] || null };
  });

  const customPages = pages.filter((p) => p.type === SHOWCASE_PAGE_TYPES.RICH_CUSTOM);
  const firstCustom = customPages[0];
  const allCustomPhotos = customPages.flatMap((p) => p.gallery?.photos || []);

  let styleType = "default";
  if (customPages.length) styleType = "rich_custom";

  return {
    ...config,
    pages,
    styleType,
    gallery: { photos: allCustomPhotos.slice(0, SHOWCASE_MAX_PHOTOS_PER_PAGE) },
    richCustom: firstCustom?.richCustom || config.richCustom,
    caseTheme: firstCustom?.caseTheme || config.caseTheme,
    commercial: {
      ...(config.commercial || {}),
      /* 페이지별로 옮긴 뒤에는 전역 링크 목록을 비움 */
      links: [],
      products: []
    },
    platformFeed: {
      ...(config.platformFeed || {}),
      instagramMedia: [],
      instagramPostUrls: [],
      instagramPostUrl: ""
    }
  };
}

/**
 * @param {object} config
 * @param {string} tier
 * @param {{ includeDigitalCard?: boolean }} [opts]
 */
export function clampShowcasePages(config, tier, opts = {}) {
  const max = maxShowcaseContentPagesForTier(tier, opts);
  const pages = (Array.isArray(config.pages) ? config.pages : []).map(normalizeShowcasePage).slice(0, max);
  return syncLegacyFieldsFromPages({ ...config, pages });
}

export function pageStatusSummary(page) {
  const p = normalizeShowcasePage(page);
  if (p.type === SHOWCASE_PAGE_TYPES.INSTAGRAM) {
    if (p.instagramMedia?.id) return "게시물 선택됨";
    return "게시물 미선택";
  }
  const n = (p.gallery?.photos || []).length;
  const parts = [];
  if (n > 0) parts.push(`사진 ${n}장`);
  if (p.businessLink?.url) parts.push("링크");
  if (parts.length) return parts.join(" · ");
  if (String(p.richCustom?.bodyText || "").trim()) return "소개 작성됨";
  return "미설정";
}

export function isPageConfigured(page) {
  const p = normalizeShowcasePage(page);
  if (p.type === SHOWCASE_PAGE_TYPES.INSTAGRAM) return Boolean(p.instagramMedia?.id);
  if ((p.gallery?.photos || []).length > 0) return true;
  if (p.businessLink?.url) return true;
  if (String(p.richCustom?.bodyText || "").trim()) return true;
  return false;
}
