/**
 * 유료 회원 빅푸시 하단 띠배너(커스텀) — 로컬 저장.
 * 미등록 시 AdMob 띠배너로 fallback.
 */
export const RIBBON_BANNER_STORAGE_KEY = "vlue_paid_ribbon_banner_v1";
export const RIBBON_BANNER_CHANGED_EVENT = "vlue-ribbon-banner-changed";

/**
 * @typedef {{ imageUrl: string, linkUrl: string, updatedAt: string }} RibbonBannerConfig
 */

/** @returns {RibbonBannerConfig} */
export function createDefaultRibbonBanner() {
  return { imageUrl: "", linkUrl: "", updatedAt: "" };
}

/** @returns {RibbonBannerConfig} */
export function readRibbonBanner() {
  try {
    const raw = localStorage.getItem(RIBBON_BANNER_STORAGE_KEY);
    if (!raw) return createDefaultRibbonBanner();
    const parsed = JSON.parse(raw);
    return {
      imageUrl: String(parsed?.imageUrl || "").trim(),
      linkUrl: String(parsed?.linkUrl || "").trim(),
      updatedAt: String(parsed?.updatedAt || "")
    };
  } catch {
    return createDefaultRibbonBanner();
  }
}

/** @param {Partial<RibbonBannerConfig>} next */
export function writeRibbonBanner(next = {}) {
  const prev = readRibbonBanner();
  const merged = {
    imageUrl: String(next.imageUrl ?? prev.imageUrl ?? "").trim(),
    linkUrl: String(next.linkUrl ?? prev.linkUrl ?? "").trim(),
    updatedAt: new Date().toISOString()
  };
  try {
    localStorage.setItem(RIBBON_BANNER_STORAGE_KEY, JSON.stringify(merged));
  } catch {
    /* quota */
  }
  try {
    window.dispatchEvent(new CustomEvent(RIBBON_BANNER_CHANGED_EVENT, { detail: merged }));
  } catch {
    /* ignore */
  }
  return merged;
}

export function clearRibbonBanner() {
  return writeRibbonBanner({ imageUrl: "", linkUrl: "" });
}

export function hasCustomRibbonBanner(config = readRibbonBanner()) {
  return Boolean(String(config?.imageUrl || "").trim());
}
