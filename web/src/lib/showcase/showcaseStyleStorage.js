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
/** 메인 송출(통화·홈 미리보기) 전용 — 편집용 설정과 분리해 덮어쓰기 방지 */
export const SHOWCASE_LIVE_STYLE_STORAGE_KEY = "vlue_showcase_live_style_v1";
export const SHOWCASE_LIVE_STYLE_CHANGED_EVENT = "vlue-showcase-live-style-changed";
/** editor | mycase — hydrate 가 설정 미리보기를 덮어쓰지 않게 */
export const SHOWCASE_LIVE_SOURCE_STORAGE_KEY = "vlue_showcase_live_source_v1";
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
      soundId: "",
      title: "",
      artistName: "",
      audioUrl: "",
      attributionLabel: "",
      linkBroken: false,
      /** @deprecated SoundCloud 제거 — 마이그레이션 호환 */
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
      /** 홍보용 자유 링크 { id, name, url, logoUrl? } */
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
    /** 소셜 레일 — 좋아요는 항상 활성, 댓글·공유만 끌 수 있음 */
    commentsEnabled: true,
    shareEnabled: true,
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
        /* 오픈채팅 URL이 프로필 칸에 잘못 들어간 경우 복구 */
        const openChat = String(raw.kakaoOpenChat || "").trim();
        const profile = String(raw.kakaoProfile || "").trim();
        if (!openChat && /open\.kakao\.com/i.test(profile)) {
          raw.kakaoOpenChat = profile;
          raw.kakaoProfile = "";
        } else if (openChat && profile && openChat === profile && /open\.kakao\.com/i.test(profile)) {
          raw.kakaoProfile = "";
        }
        raw.kakao = String(raw.kakaoOpenChat || raw.kakaoProfile || legacyKakao || "").trim();
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
              url: String(row.url || "").trim(),
              logoUrl: String(row.logoUrl || row.imageUrl || "").trim()
            }));
        }
        const legacy = Array.isArray(parsed?.commercial?.products) ? parsed.commercial.products : [];
        return legacy
          .filter((row) => row && (row.name || row.url))
          .map((row, i) => ({
            id: String(row.id || `link-${i}`),
            name: String(row.name || "").trim(),
            url: String(row.url || "").trim(),
            logoUrl: String(row.logoUrl || row.imageUrl || "").trim()
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
    commentsEnabled: parsed?.commentsEnabled === false ? false : true,
    shareEnabled: parsed?.shareEnabled === false ? false : true,
    pages: Array.isArray(parsed?.pages) ? parsed.pages.map(normalizeShowcasePage) : defaults.pages
  };
}

export function readShowcaseStyle() {
  try {
    const raw = localStorage.getItem(SHOWCASE_STYLE_STORAGE_KEY);
    if (!raw) return createDefaultShowcaseStyle();
    return normalizeStoredStyle(JSON.parse(raw));
  } catch {
    return createDefaultShowcaseStyle();
  }
}

export function writeShowcaseStyle(next, opts = {}) {
  const replace = Boolean(opts.replace);
  const skipSync = Boolean(opts.skipSync);
  const base = replace
    ? mergeDeep(createDefaultShowcaseStyle(), next)
    : mergeDeep(readShowcaseStyle(), next);
  const withPages = Array.isArray(next?.pages)
    ? { ...base, pages: next.pages.map(normalizeShowcasePage) }
    : base;
  const merged = syncLegacyFieldsFromPages(withPages);
  try {
    localStorage.setItem(SHOWCASE_STYLE_STORAGE_KEY, JSON.stringify(merged));
  } catch (e) {
    const quota =
      e?.name === "QuotaExceededError" ||
      e?.code === 22 ||
      /quota/i.test(String(e?.message || ""));
    console.warn("[showcase-style] localStorage write failed", e);
    if (quota) {
      throw new Error("저장 용량이 부족합니다. 사진·로고 용량을 줄인 뒤 다시 시도해 주세요.");
    }
    throw e instanceof Error ? e : new Error("쇼케이스 설정 저장에 실패했습니다.");
  }
  window.dispatchEvent(new CustomEvent(SHOWCASE_STYLE_CHANGED_EVENT, { detail: merged }));
  if (!skipSync) {
    try {
      import("./showcaseStyleSync.js")
        .then((m) => {
          m.bumpLocalShowcaseStyleUpdatedAt();
          m.scheduleShowcaseStylePush();
        })
        .catch(() => {});
    } catch {
      /* ignore */
    }
  }
  return merged;
}

function normalizeStoredStyle(parsed) {
  let merged = mergeDeep(createDefaultShowcaseStyle(), parsed);
  if (merged.bgm.customUrl) {
    merged.bgm.mode = merged.bgm.mode === "custom" ? "preset" : merged.bgm.mode;
  }
  const feed = merged.platformFeed || {};
  if (feed.instagramHandle === "@vlue.official" && !feed.instagramProfileUrl) {
    feed.instagramHandle = "";
  }
  if (feed.kakaoProfileTitle === "VLUE 프로필" && !feed.kakaoProfileUrl) {
    feed.kakaoProfileTitle = "";
  }
  merged.platformFeed = feed;
  if (!Object.prototype.hasOwnProperty.call(parsed, "pages")) {
    merged.pages = migrateLegacyPages(merged);
  } else if (Array.isArray(merged.pages)) {
    merged.pages = stripInstagramContentPages(merged.pages);
  }
  return syncLegacyFieldsFromPages(merged);
}

/** 메인 송출 스타일만 읽기 (없으면 null) */
export function readLiveShowcaseStyle() {
  try {
    const raw = localStorage.getItem(SHOWCASE_LIVE_STYLE_STORAGE_KEY);
    if (!raw) return null;
    return normalizeStoredStyle(JSON.parse(raw));
  } catch {
    return null;
  }
}

/**
 * 통화·홈 빅푸시 미리보기용 — 메인 송출(라이브)만 사용.
 * 편집 초안(editor)으로 폴백하지 않음: 마이케이스 삭제 후에도 송출이 남지 않게 한다.
 */
export function readActiveShowcaseStyle() {
  return readLiveShowcaseStyle() || createDefaultShowcaseStyle();
}

/** @returns {{ source: 'editor'|'mycase', at: number }|null} */
export function readLiveShowcaseSource() {
  try {
    const raw = localStorage.getItem(SHOWCASE_LIVE_SOURCE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || (parsed.source !== "editor" && parsed.source !== "mycase")) return null;
    return { source: parsed.source, at: Number(parsed.at) || 0 };
  } catch {
    return null;
  }
}

/**
 * 마이케이스 메인 송출 → 통화용 라이브 스타일만 갱신 (편집 설정 유지)
 * @param {object} next
 * @param {{ source?: 'editor'|'mycase' }} [opts]
 */
export function writeLiveShowcaseStyle(next, opts = {}) {
  const merged = normalizeStoredStyle(next && typeof next === "object" ? next : {});
  const source = opts.source === "mycase" ? "mycase" : "editor";
  const skipSync = Boolean(opts.skipSync);
  try {
    localStorage.setItem(SHOWCASE_LIVE_STYLE_STORAGE_KEY, JSON.stringify(merged));
    localStorage.setItem(
      SHOWCASE_LIVE_SOURCE_STORAGE_KEY,
      JSON.stringify({ source, at: Date.now() })
    );
  } catch (e) {
    console.warn("[showcase-live-style] localStorage write failed", e);
    return null;
  }
  /* 편집용 SHOWCASE_STYLE_CHANGED 는 쏘지 않음 — 마이케이스 목록 무한 리로드 방지 */
  window.dispatchEvent(new CustomEvent(SHOWCASE_LIVE_STYLE_CHANGED_EVENT, { detail: merged }));
  if (!skipSync) {
    try {
      import("./showcaseStyleSync.js")
        .then((m) => {
          m.bumpLocalShowcaseStyleUpdatedAt();
          m.scheduleShowcaseStylePush();
        })
        .catch(() => {});
    } catch {
      /* ignore */
    }
  }
  return merged;
}

export function clearLiveShowcaseStyle() {
  try {
    localStorage.removeItem(SHOWCASE_LIVE_STYLE_STORAGE_KEY);
    localStorage.removeItem(SHOWCASE_LIVE_SOURCE_STORAGE_KEY);
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new CustomEvent(SHOWCASE_LIVE_STYLE_CHANGED_EVENT, { detail: null }));
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
