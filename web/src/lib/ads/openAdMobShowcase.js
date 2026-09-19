export const VLUE_OPEN_ADMOB_SHOWCASE = "vlue-open-admob-showcase";
export const VLUE_CLOSE_ADMOB_SHOWCASE = "vlue-close-admob-showcase";

/** @param {object} assets */
export function openAdMobShowcase(assets) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(VLUE_OPEN_ADMOB_SHOWCASE, { detail: assets || {} }));
}

export function closeAdMobShowcase() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(VLUE_CLOSE_ADMOB_SHOWCASE));
}
