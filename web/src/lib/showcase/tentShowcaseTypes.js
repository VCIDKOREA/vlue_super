/**
 * V1 천막 쇼케이스 — 상용 타입·상태 계약
 * UserTier / PrivacyMode / CallState
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

export const SHOWCASE_MAX_PHOTOS_FREE = 1;
export const SHOWCASE_MAX_PHOTOS_PAID = 10;

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
 * @param {UserTier|string} tier
 * @returns {number}
 */
export function maxShowcasePhotosForTier(tier) {
  return normalizeUserTier(tier) === USER_TIERS.PAID ? SHOWCASE_MAX_PHOTOS_PAID : SHOWCASE_MAX_PHOTOS_FREE;
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

/**
 * @param {string} [raw]
 * @returns {CallState}
 */
export function normalizeCallState(raw) {
  const s = String(raw || "").toLowerCase();
  if (s === "active" || s === "offhook" || s === "connected") return CALL_STATES.CONNECTED;
  if (s === "ended" || s === "idle") return CALL_STATES.ENDED;
  if (s === "missed") return CALL_STATES.MISSED;
  if (s === "outgoing" || s === "incoming" || s === "ringing") return CALL_STATES.RINGING;
  return CALL_STATES.RINGING;
}
