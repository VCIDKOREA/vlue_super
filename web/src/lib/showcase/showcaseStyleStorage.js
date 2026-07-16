import { SHOWCASE_STYLE_TYPES } from "./showcaseStyleTypes.js";

export const SHOWCASE_STYLE_STORAGE_KEY = "vlue_showcase_style_v1";
export const SHOWCASE_STYLE_CHANGED_EVENT = "vlue-showcase-style-changed";
/** 마이페이지·홈에서 쇼케이스 설정 패널 열기 */
export const SHOWCASE_OPEN_SETTINGS_EVENT = "vlue-showcase-open-settings";
export const SHOWCASE_MAX_PHOTOS = 10;
export { SHOWCASE_MAX_PHOTOS_FREE, SHOWCASE_MAX_PHOTOS_PAID, maxShowcasePhotosForTier } from "./tentShowcaseTypes.js";

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
    /** V1 — 무료: friend_only 기본 / 유료: public 고정 */
    privacyMode: "friend_only",
    /** V1 — #해시태그 (유료 · 홈 디렉토리 검색) */
    tags: [],
    bgm: {
      mode: "none",
      presetId: "",
      youtube: { videoId: "", title: "", artist: "", query: "" },
      soundcloud: {
        trackUrl: "",
        trackId: "",
        title: "",
        artist: "",
        artworkUrl: "",
        query: "",
        license: "",
        licenseLabel: "",
        attribution: "",
        sourceVerified: false,
        commercialCcOnly: false,
        verifiedAt: ""
      }
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
    /** 디지털인증명함 「VLUE 인증」뱃지 표시 — 미등록 번호 UI와 무관 */
    verifiedBadgeOn: true,
    commercial: {
      menuItems: [],
      products: [],
      outlinks: { instagram: "", youtube: "", kakao: "" },
      attachments: [],
      locationLabel: "",
      couponLabel: ""
    },
    platformFeed: {
      instagramHandle: "",
      instagramProfileUrl: "",
      /** 쇼케이스 박스 Native embed용 — /p/ · /reel/ 게시물 URL */
      instagramPostUrl: "",
      instagramAvatarUrl: "",
      kakaoProfileTitle: "",
      kakaoProfileUrl: "",
      kakaoAvatarUrl: "",
      avatarUrl: ""
    },
    caseTheme: {
      frame: "classic",
      accent: "#2b6ff0",
      pattern: "none"
    },
    /** 디지털인증명함 미사용 시 — 쇼케이스에 이름(상호) 송출 여부. 기본 켜짐 */
    showBroadcastName: true
  };
}

function mergeDeep(defaults, parsed) {
  return {
    ...defaults,
    ...parsed,
    bgm: {
      ...defaults.bgm,
      ...parsed?.bgm,
      youtube: { ...defaults.bgm.youtube, ...parsed?.bgm?.youtube },
      soundcloud: { ...defaults.bgm.soundcloud, ...parsed?.bgm?.soundcloud }
    },
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
    tags: Array.isArray(parsed?.tags) ? parsed.tags : defaults.tags,
    privacyMode: parsed?.privacyMode === "public" ? "public" : defaults.privacyMode,
    showBroadcastName: parsed?.showBroadcastName === false ? false : true
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
    /* 과거 데모 기본값 정리 */
    const feed = merged.platformFeed || {};
    if (feed.instagramHandle === "@vlue.official" && !feed.instagramProfileUrl) {
      feed.instagramHandle = "";
    }
    if (feed.kakaoProfileTitle === "VLUE 프로필" && !feed.kakaoProfileUrl) {
      feed.kakaoProfileTitle = "";
    }
    merged.platformFeed = feed;
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
