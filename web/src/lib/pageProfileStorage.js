/**
 * MY 프로필(2번) ↔ 페이지 관리 FeedManager(1번) 단일 저장소
 */

export const PAGE_MANAGER_KEY = "vlue_page_manager";
export const PAGE_CREATED_KEY = "vlue_page_created_once";
/** @deprecated — 마이그레이션 후 page manager 로 통합 */
const PAGE_PROFILE_LEGACY_KEY = "vlue_my_page_profile";
const PAGE_CREATE_LEGACY_KEY = "vlue_my_page_created";
export const MY_PAGE_POSTS_KEY = "vlue_my_page_posts_v1";
export const PAGE_PROFILE_CHANGED_EVENT = "vlue-page-profile-changed";
/** 지역 광고 등 → MY 게시 작성 화면 자동 오픈 */
export const OPEN_MYPAGE_COMPOSER_KEY = "vlue_open_mypage_composer_v1";
export const OPEN_MYPAGE_COMPOSER_STORE_KEY = "vlue_open_mypage_composer_store_v1";

export function requestOpenMyPageComposer({ alsoStore = true } = {}) {
  try {
    sessionStorage.setItem(OPEN_MYPAGE_COMPOSER_KEY, "1");
    if (alsoStore) sessionStorage.setItem(OPEN_MYPAGE_COMPOSER_STORE_KEY, "1");
    else sessionStorage.removeItem(OPEN_MYPAGE_COMPOSER_STORE_KEY);
  } catch {
    /* ignore */
  }
}

function safeParse(raw, fallback = {}) {
  if (!raw) return fallback;
  try {
    const v = JSON.parse(raw);
    return v && typeof v === "object" ? v : fallback;
  } catch {
    return fallback;
  }
}

function readLegacyProfile() {
  return safeParse(localStorage.getItem(PAGE_PROFILE_LEGACY_KEY));
}

/** localStorage 에서 페이지 설정 읽기 (레거시 병합) */
export function readPageManagerConfig() {
  const cfg = safeParse(localStorage.getItem(PAGE_MANAGER_KEY));
  const legacy = readLegacyProfile();
  if (!cfg.feedName && legacy.pageName) cfg.feedName = legacy.pageName;
  if (!cfg.feedIntro && legacy.pageIntro) cfg.feedIntro = legacy.pageIntro;
  if (!cfg.pageProfileImageDataUrl && legacy.profileImageUrl) {
    cfg.pageProfileImageDataUrl = legacy.profileImageUrl;
  }
  return cfg;
}

export function isPageCreated() {
  if (localStorage.getItem(PAGE_CREATED_KEY) === "true") return true;
  if (localStorage.getItem(PAGE_CREATE_LEGACY_KEY) === "true") return true;
  const cfg = readPageManagerConfig();
  return Boolean(String(cfg.feedName || cfg.title || "").trim());
}

export function markPageCreated() {
  localStorage.setItem(PAGE_CREATED_KEY, "true");
  localStorage.setItem(PAGE_CREATE_LEGACY_KEY, "true");
}

/** MY 화면·미리보기용 표시 필드 */
export function getPageDisplayProfile() {
  const cfg = readPageManagerConfig();
  const legacy = readLegacyProfile();
  const feedName =
    String(cfg.feedName || cfg.title || legacy.pageName || "").trim() || "내 페이지";
  const intro =
    String(cfg.feedIntro || cfg.intro || legacy.pageIntro || "").trim() ||
    "나만의 공간을 만들어보세요.";
  const storeName = String(cfg.feedName || cfg.storeName || "").trim() || feedName;
  const notice = String(cfg.notice || "").trim();
  const avatarUrl =
    String(cfg.pageProfileImageDataUrl || legacy.profileImageUrl || "").trim() || "";
  let storeApproved = false;
  try {
    const app = JSON.parse(localStorage.getItem("vlue_store_application_v1") || "{}");
    storeApproved = app?.status === "approved";
  } catch {
    storeApproved = Boolean(cfg.storeApproved);
  }
  const pageKind = storeApproved ? "store" : cfg.pageKind || "vlue_page";
  return { feedName, intro, storeName, notice, avatarUrl, storeApproved, pageKind, raw: cfg };
}

export function savePageManagerConfig(patch, { markCreated = false } = {}) {
  const prev = readPageManagerConfig();
  const next = {
    ...prev,
    ...patch,
    updatedAt: new Date().toISOString()
  };
  localStorage.setItem(PAGE_MANAGER_KEY, JSON.stringify(next));

  const legacy = {
    pageName: next.feedName || next.title || "",
    pageIntro: next.feedIntro || next.intro || "",
    profileImageUrl: next.pageProfileImageDataUrl || "",
    updatedAt: next.updatedAt
  };
  localStorage.setItem(PAGE_PROFILE_LEGACY_KEY, JSON.stringify(legacy));

  if (markCreated) markPageCreated();

  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(PAGE_PROFILE_CHANGED_EVENT));
  }
  return next;
}

export function readMyPagePosts() {
  const raw = localStorage.getItem(MY_PAGE_POSTS_KEY);
  const list = safeParse(raw, []);
  return Array.isArray(list) ? list : [];
}

export function addMyPagePost(post) {
  const prev = readMyPagePosts();
  const next = [post, ...prev].slice(0, 60);
  localStorage.setItem(MY_PAGE_POSTS_KEY, JSON.stringify(next));
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(PAGE_PROFILE_CHANGED_EVENT));
  }
  return next;
}
