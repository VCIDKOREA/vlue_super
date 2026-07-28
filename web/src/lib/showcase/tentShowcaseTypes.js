/**
 * V1 천막 쇼케이스 — 상용 타입·상태 계약
 * UserTier / PrivacyMode / CallState
 *
 * 용어:
 * - 페이지(page): 위·아래 스와이프 장수 (무료 1 · 유료 콘텐츠 5 + 디지털인증명함)
 * - 장당 사진: 한 페이지 안 사진 수 (최대 20 — Instagram 캐러셀과 동일)
 */

/** @typedef {'free' | 'paid'} UserTier */
/** @typedef {'friend_only' | 'public'} PrivacyMode */
/** @typedef {'ringing' | 'connected' | 'ended' | 'missed'} CallState */

export const USER_TIERS = Object.freeze({ FREE: "free", PAID: "paid" });
export const PRIVACY_MODES = Object.freeze({ FRIEND_ONLY: "friend_only", PUBLIC: "public" });
export const CALL_STATES = Object.freeze({
  RINGING: "ringing",
  CONNECTED: "connected",
  ENDED: "ended",
  MISSED: "missed"
});

/** 디자인 토큰 — Anti-Gold / Minimal Chic High-End */
export const TENT_THEME = Object.freeze({
  matteSilver: "#E2E8F0",
  neonBlue: "#00D2FF",
  midnight: "#0F172A",
  midnightGlass: "rgba(15, 23, 42, 0.88)",
  slateDeep: "#1E293B",
  platinum: "#F8FAFC",
  inkMuted: "rgba(226, 232, 240, 0.62)",
  danger: "#EF4444",
  answer: "#22C55E"
});

/** 위·아래 스와이프 페이지 한도 (콘텐츠 — 디지털인증명함 별도) */
export const SHOWCASE_MAX_PAGES_FREE = 1;
export const SHOWCASE_MAX_PAGES_PAID = 5;

/** 한 페이지(한 장)에 넣을 수 있는 사진 수 — Instagram 게시물 캐러셀과 동일 */
export const SHOWCASE_MAX_PHOTOS_PER_PAGE = 20;

/** @deprecated 이름 호환 — 페이지당 사진 한도 */
export const SHOWCASE_MAX_PHOTOS_FREE = SHOWCASE_MAX_PHOTOS_PER_PAGE;
/** @deprecated 이름 호환 — 페이지당 사진 한도 */
export const SHOWCASE_MAX_PHOTOS_PAID = SHOWCASE_MAX_PHOTOS_PER_PAGE;

/** Instagram 게시물(=세로 페이지) 선택 한도 — 페이지 한도와 동일 규칙 */
export const SHOWCASE_MAX_IG_PAGES_FREE = 1;
export const SHOWCASE_MAX_IG_PAGES_PAID = 5;

/**
 * @param {string} [tier]
 * @returns {UserTier}
 */
export function normalizeUserTier(tier) {
  const t = String(tier || "free").toLowerCase();
  if (t === "paid" || t === "standard" || t === "premium" || t === "b2b") return USER_TIERS.PAID;
  return USER_TIERS.FREE;
}

/**
 * 유료는 항상 public 고정. 무료는 friend_only 기본.
 * @param {UserTier|string} tier
 * @param {PrivacyMode|string} [stored]
 * @returns {PrivacyMode}
 */
export function resolvePrivacyMode(tier, stored) {
  if (normalizeUserTier(tier) === USER_TIERS.PAID) return PRIVACY_MODES.PUBLIC;
  const s = String(stored || "").toLowerCase();
  if (s === PRIVACY_MODES.PUBLIC) return PRIVACY_MODES.PUBLIC;
  return PRIVACY_MODES.FRIEND_ONLY;
}

/**
 * 한 쇼케이스 페이지에 등록 가능한 사진 수 (항상 20)
 * @returns {number}
 */
export function maxShowcasePhotosPerPage() {
  return SHOWCASE_MAX_PHOTOS_PER_PAGE;
}

/**
 * @deprecated maxShowcasePhotosPerPage 사용 — 갤러리 편집기 한도
 * @param {UserTier|string} [_tier]
 * @returns {number}
 */
export function maxShowcasePhotosForTier(_tier) {
  return SHOWCASE_MAX_PHOTOS_PER_PAGE;
}

/**
 * 위·아래 스와이프 가능한 콘텐츠 페이지 수 (디지털 인증명함 제외)
 * - 무료회원: 1
 * - 유료회원: 5 (디지털인증명함은 별도 추가)
 * @param {UserTier|string} tier
 * @param {{ includeDigitalCard?: boolean }} [_opts] 호환용 — 명함은 한도에 차감하지 않음
 * @returns {number}
 */
export function maxShowcaseContentPagesForTier(tier, _opts = {}) {
  if (normalizeUserTier(tier) !== USER_TIERS.PAID) return SHOWCASE_MAX_PAGES_FREE;
  return SHOWCASE_MAX_PAGES_PAID;
}

/**
 * Instagram 게시물(세로 페이지) 선택 한도 — 콘텐츠 페이지 한도와 동일
 * @param {UserTier|string} tier
 * @param {{ includeDigitalCard?: boolean }} [opts]
 * @returns {number}
 */
export function maxInstagramEmbedsForTier(tier, opts = {}) {
  return maxShowcaseContentPagesForTier(tier, opts);
}

/**
 * 네이티브/오버레이 이벤트·props → CallState
 * 알 수 없으면 "" (리스너에서 early-return용)
 * @param {string} [raw]
 * @returns {CallState|""}
 */
export function normalizeCallState(raw) {
  const s = String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  if (!s) return "";
  if (
    s === CALL_STATES.RINGING ||
    s === "incoming" ||
    s === "ring" ||
    s === "alerting"
  ) {
    return CALL_STATES.RINGING;
  }
  if (
    s === CALL_STATES.CONNECTED ||
    s === "active" ||
    s === "answered" ||
    s === "in_call" ||
    s === "incall" ||
    s === "offhook"
  ) {
    return CALL_STATES.CONNECTED;
  }
  if (
    s === CALL_STATES.ENDED ||
    s === "end" ||
    s === "hangup" ||
    s === "hungup" ||
    s === "disconnected" ||
    s === "idle"
  ) {
    return CALL_STATES.ENDED;
  }
  if (
    s === CALL_STATES.MISSED ||
    s === "reject" ||
    s === "rejected" ||
    s === "declined" ||
    s === "busy"
  ) {
    return CALL_STATES.MISSED;
  }
  return "";
}

/**
 * 통화 중 링크/자료실 활성 여부
 * @param {CallState|string} callState
 * @param {{ previewMode?: boolean, forceInteractive?: boolean }} [opts]
 */
export function areShowcaseLinksEnabled(callState, opts = {}) {
  if (opts.forceInteractive || opts.previewMode) return true;
  return String(callState) === CALL_STATES.CONNECTED;
}

/**
 * 무료 유저 프라이버시 분기 — 커스텀 프로필 노출 여부
 * @param {{ tier: UserTier|string, privacyMode?: PrivacyMode|string, isKnownContact: boolean }} input
 */
export function shouldExposeCustomShowcase({ tier, privacyMode, isKnownContact }) {
  const userTier = normalizeUserTier(tier);
  if (userTier === USER_TIERS.PAID) return true;
  const mode = resolvePrivacyMode(userTier, privacyMode);
  if (mode === PRIVACY_MODES.PUBLIC) return true;
  return Boolean(isKnownContact);
}
