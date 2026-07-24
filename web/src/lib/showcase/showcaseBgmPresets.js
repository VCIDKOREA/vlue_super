/**
 * 쇼케이스 BGM — VLUE Signature / User Original / 퍼가기
 * SoundCloud·YouTube UI 경로 제거. 재생은 audioUrl(MP3 등) 직접 재생.
 */

export function createEmptyShowcaseBgm() {
  return {
    mode: "none",
    soundId: "",
    title: "",
    artistName: "",
    audioUrl: "",
    attributionLabel: "",
    linkBroken: false
  };
}

/** @param {import('./showcaseStyleStorage.js').ShowcaseStyleConfig | null | undefined} styleConfig */
export function resolveShowcaseBgmUrl(styleConfig) {
  const bgm = styleConfig?.bgm;
  if (!bgm || bgm.mode === "none" || bgm.linkBroken) return "";
  const url = String(bgm.audioUrl || "").trim();
  if (url) return url;
  return "";
}

/** @param {import('./showcaseStyleStorage.js').ShowcaseStyleConfig | null | undefined} styleConfig */
export function resolveShowcaseBgmLabel(styleConfig) {
  const bgm = styleConfig?.bgm;
  if (!bgm || bgm.mode === "none") return "";
  if (bgm.linkBroken) return "연결이 끊긴 음원";
  const title = String(bgm.title || "").trim();
  const artist = String(bgm.artistName || "").trim();
  if (title && artist) return `${title} · ${artist}`;
  return title || artist || "배경음악";
}

export function isDirectAudioBgmMode(styleConfig) {
  const mode = styleConfig?.bgm?.mode;
  return mode === "signature" || mode === "user" || mode === "borrowed";
}

/** @deprecated SoundCloud 제거 */
export function isSoundCloudBgmMode() {
  return false;
}

/** @deprecated YouTube 피커 제거 */
export function isYoutubeBgmMode() {
  return false;
}

export function resolveShowcaseSoundCloudTrackUrl() {
  return "";
}

export function resolveShowcaseYoutubeVideoId() {
  return "";
}

export function getBgmPresetById() {
  return null;
}

export function resolveShowcasePresetBgmUrl() {
  return null;
}

export const SHOWCASE_BGM_PRESETS = [];
