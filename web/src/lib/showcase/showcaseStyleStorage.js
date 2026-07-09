import { SHOWCASE_STYLE_TYPES } from "./showcaseStyleTypes.js";

export const SHOWCASE_STYLE_STORAGE_KEY = "vlue_showcase_style_v1";
export const SHOWCASE_STYLE_CHANGED_EVENT = "vlue-showcase-style-changed";
export const SHOWCASE_MAX_PHOTOS = 10;

/** @typedef {Object} ShowcaseGalleryPhoto
 * @property {string} id
 * @property {string} url
 * @property {string} [caption]
 * @property {string} [overlayText]
 * @property {string} [overlayFont]
 * @property {Array<{ id: string, emoji: string, x: number, y: number }>} [emojiStickers]
 */

/** @typedef {Object} ShowcaseStyleConfig */

export function createDefaultShowcaseStyle() {
  return {
    styleType: "default",
    /** V2/V3 — #해시태그 디렉토리 검색용 */
    tags: [],
    bgm: {
      mode: "none",
      presetId: "cafe-kpop-piano",
      youtube: { videoId: "", title: "", artist: "", query: "" }
    },
    gallery: {
      photos: []
    },
    richCustom: {
      fontFamily: "pretendard",
      fontSize: 16,
      fontColor: "#191f28",
      fontWeight: "600",
      textAlign: "left",
      bodyText: "",
      emoji: ""
    },
    verifiedBadgeOn: false,
    commercial: {
      menuItems: [],
      products: [],
      outlinks: { instagram: "", youtube: "", kakao: "" },
      attachments: [],
      locationLabel: "",
      couponLabel: ""
    },
    platformFeed: {
      instagramHandle: "@vlue.official",
      instagramProfileUrl: "",
      kakaoProfileTitle: "VLUE 프로필",
      kakaoProfileUrl: ""
    },
    caseTheme: {
      frame: "classic",
      accent: "#2b6ff0",
      pattern: "none"
    }
  };
}

function mergeDeep(defaults, parsed) {
  return {
    ...defaults,
    ...parsed,
    bgm: { ...defaults.bgm, ...parsed?.bgm, youtube: { ...defaults.bgm.youtube, ...parsed?.bgm?.youtube } },
    gallery: { photos: parsed?.gallery?.photos || defaults.gallery.photos },
    richCustom: { ...defaults.richCustom, ...parsed?.richCustom },
    commercial: {
      ...defaults.commercial,
      ...parsed?.commercial,
      outlinks: { ...defaults.commercial.outlinks, ...parsed?.commercial?.outlinks },
      products: parsed?.commercial?.products || defaults.commercial.products,
      menuItems: parsed?.commercial?.menuItems || defaults.commercial.menuItems
    },
    platformFeed: { ...defaults.platformFeed, ...parsed?.platformFeed },
    caseTheme: { ...defaults.caseTheme, ...parsed?.caseTheme },
    tags: Array.isArray(parsed?.tags) ? parsed.tags : defaults.tags
  };
}

export function readShowcaseStyle() {
  try {
    const raw = localStorage.getItem(SHOWCASE_STYLE_STORAGE_KEY);
    if (!raw) return createDefaultShowcaseStyle();
    const parsed = JSON.parse(raw);
    const merged = mergeDeep(createDefaultShowcaseStyle(), parsed);
    if (merged.bgm.customUrl) {
      merged.bgm.mode = merged.bgm.mode === "custom" ? "preset" : merged.bgm.mode;
    }
    return merged;
  } catch {
    return createDefaultShowcaseStyle();
  }
}

export function writeShowcaseStyle(next) {
  const merged = mergeDeep(readShowcaseStyle(), next);
  localStorage.setItem(SHOWCASE_STYLE_STORAGE_KEY, JSON.stringify(merged));
  window.dispatchEvent(new CustomEvent(SHOWCASE_STYLE_CHANGED_EVENT, { detail: merged }));
  return merged;
}

export function getStyleBgmMode(styleType) {
  return SHOWCASE_STYLE_TYPES[styleType]?.bgmSource || "none";
}

/** @param {string} tag */
export function normalizeShowcaseTag(tag) {
  const t = String(tag || "").trim();
  if (!t) return "";
  return t.startsWith("#") ? t : `#${t}`;
}

export function parseShowcaseTagsInput(input) {
  return String(input || "")
    .split(/[\s,]+/)
    .map(normalizeShowcaseTag)
    .filter(Boolean)
    .slice(0, 12);
}
