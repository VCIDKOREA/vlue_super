import { SHOWCASE_STYLE_TYPES } from "./showcaseStyleTypes.js";
import { SHOWCASE_MAX_PHOTOS_PER_PAGE } from "./tentShowcaseTypes.js";
import {
  migrateLegacyPages,
  normalizeShowcasePage,
  stripInstagramContentPages,
  syncLegacyFieldsFromPages
} from "./showcasePages.js";

export const SHOWCASE_STYLE_STORAGE_KEY = "vlue_showcase_style_v1";
export const SHOWCASE_STYLE_CHANGED_EVENT = "vlue-showcase-style-changed";
/** 마이페이지·홈에서 쇼케이스 설정 패널 열기 */
export const SHOWCASE_OPEN_SETTINGS_EVENT = "vlue-showcase-open-settings";
/** 한 쇼케이스 페이지당 사진 한도 */
export const SHOWCASE_MAX_PHOTOS = SHOWCASE_MAX_PHOTOS_PER_PAGE;
export {
  SHOWCASE_MAX_PHOTOS_FREE,
  SHOWCASE_MAX_PHOTOS_PAID,
  SHOWCASE_MAX_PHOTOS_PER_PAGE,
  maxShowcasePhotosForTier,
  maxShowcasePhotosPerPage,
  maxShowcaseContentPagesForTier,
  maxInstagramEmbedsForTier
} from "./tentShowcaseTypes.js";

/** @typedef {Object} ShowcaseGalleryPhoto
 * @property {string} id
 * @property {string} url
 * @property {string} [caption]
 * @property {string} [overlayText]
 * @property {string} [overlayFont]
 * @property {number} [overlayFontSize]
 * @property {string} [overlayColor]
 * @property {number} [overlayX]
 * @property {number} [overlayY]
 * @property {string} [overlayAnim]
 * @property {string} [overlayBorder]
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
      /** @deprecated products → links */
      products: [],
      /** 홍보용 자유 링크 { id, name, url } */
      links: [],
      outlinks: {
        instagram: "",
        youtube: "",
        /** @deprecated 전용 TikTok 칸 제거 — 자유 링크(commercial.links) 사용 */
        tiktok: "",
        facebook: "",
        /** @deprecated → kakaoOpenChat */
        kakao: "",
        kakaoOpenChat: "",
        kakaoProfile: ""
      },
      attachments: [],
      locationLabel: "",
      couponLabel: ""
    },
    platformFeed: {
      instagramHandle: "",
      instagramProfileUrl: "",
      /** @deprecated URL 임베드 — instagramMedia 사용 */
      instagramPostUrl: "",
      /** @deprecated URL 임베드 — instagramMedia 사용 */
      instagramPostUrls: [],
      /** 연동 계정에서 고른 게시물 사진 (VLUE 재구성 뷰) */
      instagramMedia: [],
      /** Instagram Login 연동 완료 시 true */
      instagramVerified: false,
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
    showBroadcastName: true,
    /**
     * 세로 콘텐츠 페이지 (디지털인증명함 제외)
     * type: instagram | rich_custom | default
     */
    pages: []
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
      outlinks: (() => {
        const raw = { ...defaults.commercial.outlinks, ...parsed?.commercial?.outlinks };
        const legacyKakao = String(raw.kakao || "").trim();
        if (legacyKakao && !raw.kakaoOpenChat && !raw.kakaoProfile) {
          if (/open\.kakao\.com/i.test(legacyKakao)) raw.kakaoOpenChat = legacyKakao;
          else raw.kakaoProfile = legacyKakao;
        }
        return raw;
      })(),
      products: parsed?.commercial?.products || defaults.commercial.products,
      links: (() => {
        const fromLinks = Array.isArray(parsed?.commercial?.links) ? parsed.commercial.links : null;
        if (fromLinks) {
          return fromLinks
            .filter((row) => row && (row.name || row.url))
            .map((row, i) => ({
              id: String(row.id || `link-${i}`),
              name: String(row.name || "").trim(),
              url: String(row.url || "").trim()
            }));
        }
        const legacy = Array.isArray(parsed?.commercial?.products) ? parsed.commercial.products : [];
        return legacy
          .filter((row) => row && (row.name || row.url))
          .map((row, i) => ({
            id: String(row.id || `link-${i}`),
            name: String(row.name || "").trim(),
            url: String(row.url || "").trim()
          }));
      })(),
      menuItems: parsed?.commercial?.menuItems || defaults.commercial.menuItems
    },
    platformFeed: (() => {
      const merged = { ...defaults.platformFeed, ...parsed?.platformFeed };
      const fromArr = Array.isArray(parsed?.platformFeed?.instagramPostUrls)
        ? parsed.platformFeed.instagramPostUrls
        : [];
      const legacy = String(parsed?.platformFeed?.instagramPostUrl || merged.instagramPostUrl || "").trim();
      const urls = [];
      const seen = new Set();
      for (const raw of [...fromArr, legacy]) {
        const s = String(raw || "").trim();
        if (!s || seen.has(s)) continue;
        seen.add(s);
        urls.push(s);
      }
      merged.instagramPostUrls = urls;
      merged.instagramPostUrl = urls[0] || "";
      merged.instagramMedia = Array.isArray(parsed?.platformFeed?.instagramMedia)
        ? parsed.platformFeed.instagramMedia
        : Array.isArray(merged.instagramMedia)
          ? merged.instagramMedia
          : [];
      merged.instagramVerified = parsed?.platformFeed?.instagramVerified === true;
      return merged;
    })(),
    caseTheme: { ...defaults.caseTheme, ...parsed?.caseTheme },
    tags: Array.isArray(parsed?.tags) ? parsed.tags : defaults.tags,
    privacyMode: parsed?.privacyMode === "public" ? "public" : defaults.privacyMode,
    showBroadcastName: parsed?.showBroadcastName === false ? false : true,
    pages: Array.isArray(parsed?.pages) ? parsed.pages.map(normalizeShowcasePage) : defaults.pages
  };
}

export function readShowcaseStyle() {
  try {
    const raw = localStorage.getItem(SHOWCASE_STYLE_STORAGE_KEY);
    if (!raw) return createDefaultShowcaseStyle();
    const parsed = JSON.parse(raw);
    let merged = mergeDeep(createDefaultShowcaseStyle(), parsed);
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
    /* pages 키가 없을 때만 레거시 이관 (빈 배열은 의도된 상태) */
    if (!Object.prototype.hasOwnProperty.call(parsed, "pages")) {
      merged.pages = migrateLegacyPages(merged);
    } else if (Array.isArray(merged.pages)) {
      merged.pages = stripInstagramContentPages(merged.pages);
    }
    merged = syncLegacyFieldsFromPages(merged);
    return merged;
  } catch {
    return createDefaultShowcaseStyle();
  }
}

export function writeShowcaseStyle(next, opts = {}) {
  const replace = Boolean(opts.replace);
  const base = replace
    ? mergeDeep(createDefaultShowcaseStyle(), next)
    : mergeDeep(readShowcaseStyle(), next);
  const withPages = Array.isArray(next?.pages)
    ? { ...base, pages: next.pages.map(normalizeShowcasePage) }
    : base;
  const merged = syncLegacyFieldsFromPages(withPages);
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
