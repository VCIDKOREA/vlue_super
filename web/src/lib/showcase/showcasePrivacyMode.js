import {
  PRIVACY_MODES,
  normalizeUserTier,
  resolvePrivacyMode,
  USER_TIERS
} from "./tentShowcaseTypes.js";
import { readShowcaseStyle, writeShowcaseStyle } from "./showcaseStyleStorage.js";

export const SHOWCASE_PRIVACY_CHANGED = "vlue-showcase-privacy-changed";

/**
 * @param {string} [membershipTier]
 * @returns {import('./tentShowcaseTypes.js').PrivacyMode}
 */
export function readShowcasePrivacyMode(membershipTier = "free") {
  const style = readShowcaseStyle();
  return resolvePrivacyMode(membershipTier, style.privacyMode);
}

/**
 * 유료는 public 고정 저장. 무료만 friend_only|public 선택.
 * @param {import('./tentShowcaseTypes.js').PrivacyMode|string} mode
 * @param {string} [membershipTier]
 */
export function writeShowcasePrivacyMode(mode, membershipTier = "free") {
  const tier = normalizeUserTier(membershipTier);
  const next =
    tier === USER_TIERS.PAID
      ? PRIVACY_MODES.PUBLIC
      : String(mode) === PRIVACY_MODES.PUBLIC
        ? PRIVACY_MODES.PUBLIC
        : PRIVACY_MODES.FRIEND_ONLY;
  const style = readShowcaseStyle();
  writeShowcaseStyle({ ...style, privacyMode: next }, { skipSync: true });
  try {
    window.dispatchEvent(new CustomEvent(SHOWCASE_PRIVACY_CHANGED, { detail: { privacyMode: next } }));
  } catch {
    /* ignore */
  }
  return next;
}
