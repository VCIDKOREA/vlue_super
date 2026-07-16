/**
 * VLUE 쇼케이스 BGM
 * - 기본: 주간 릴스 감성 SoundCloud 차트 (Widget embed)
 * - 레거시 YouTube / SoundHelix MP3 는 호환용으로만 유지
 */

import { apiUrl } from "../apiBase.js";
import { getReelsChartTrackById, getWeeklyReelsBgmChart } from "./showcaseBgmChart.js";
import { extractSoundCloudTrackUrl } from "./showcaseSoundCloud.js";

/** @param {number} n 1..10 */
export function showcaseBgmDirectUrl(n) {
  const song = Math.min(10, Math.max(1, Number(n) || 1));
  return `https://www.soundhelix.com/examples/mp3/SoundHelix-Song-${song}.mp3`;
}

/** @param {number} n 1..10 */
export function showcaseBgmProxyUrl(n) {
  const song = Math.min(10, Math.max(1, Number(n) || 1));
  return apiUrl(`/api/bgm/${song}`);
}

/**
 * 미리듣기 URL 후보 — 프록시(있으면) → 직링크
 * @param {number} n
 * @returns {string[]}
 */
export function showcaseBgmUrlCandidates(n) {
  const song = Math.min(10, Math.max(1, Number(n) || 1));
  const direct = showcaseBgmDirectUrl(song);
  const proxy = showcaseBgmProxyUrl(song);
  if (proxy && proxy !== direct && !proxy.includes("soundhelix.com")) {
    return [proxy, direct];
  }
  return [direct];
}

/**
 * @typedef {{
 *   id: string,
 *   label: string,
 *   tag: string,
 *   theme: string,
 *   url?: string,
 *   helixN?: number,
 *   videoId?: string,
 *   trackId?: string,
 *   trackUrl?: string,
 *   artworkUrl?: string,
 *   artist?: string,
 *   kind: 'soundcloud'|'youtube'|'mp3',
 *   rank?: number
 * }} ShowcaseBgmPreset
 */

/** 레거시 MP3 프리셋 (UI 기본 목록에서는 숨김) */
const LEGACY_MP3 = [
  { id: "reels-house", label: "릴스 업비트 그루브", tag: "#릴스", theme: "lofi", helixN: 1 },
  { id: "shorts-hiphop", label: "숏츠 힙합 플로우", tag: "#숏츠", theme: "lofi", helixN: 2 },
  { id: "dream-big", label: "드림 빅 업비트", tag: "#업비트", theme: "business", helixN: 3 },
  { id: "soft-piano", label: "소프트 피아노", tag: "#피아노", theme: "ambient", helixN: 3 }
];

/** UI 기본 목록 = 주간 SoundCloud 차트 */
export function buildShowcaseBgmPresets(theme = "all") {
  return getWeeklyReelsBgmChart({ theme, limit: 14 }).map((t) => ({
    id: t.id,
    label: t.label,
    tag: t.tag,
    theme: t.theme,
    trackId: t.trackId,
    trackUrl: t.trackUrl,
    artworkUrl: t.artworkUrl,
    artist: t.artist,
    kind: "soundcloud",
    rank: t.rank
  }));
}

/** @type {ShowcaseBgmPreset[]} */
export const SHOWCASE_BGM_PRESETS = buildShowcaseBgmPresets("all");

export const SHOWCASE_BGM_THEMES = [
  { id: "all", label: "전체" },
  { id: "cafe", label: "카페감성" },
  { id: "business", label: "비즈니스" },
  { id: "lofi", label: "로파이·숏폼" },
  { id: "ambient", label: "앰비언트" }
];

export function getBgmPresetById(id) {
  const chart = getReelsChartTrackById(id);
  if (chart) {
    return {
      id: chart.id,
      label: chart.label,
      tag: chart.tag,
      theme: chart.theme,
      trackId: chart.trackId,
      trackUrl: chart.trackUrl,
      artworkUrl: chart.artworkUrl,
      artist: chart.artist,
      kind: "soundcloud"
    };
  }
  const legacy = LEGACY_MP3.find((x) => x.id === id);
  if (legacy) {
    const urls = showcaseBgmUrlCandidates(legacy.helixN);
    return {
      ...legacy,
      kind: "mp3",
      url: urls[0],
      urlFallbacks: urls.slice(1)
    };
  }
  return null;
}

/** @param {import('./showcaseStyleStorage.js').ShowcaseStyleConfig | null | undefined} styleConfig */
export function resolveShowcaseBgmUrl(styleConfig) {
  if (!styleConfig?.bgm) return null;
  const { mode, presetId } = styleConfig.bgm;
  if (mode === "none" || mode === "youtube" || mode === "soundcloud") return null;
  if (mode === "preset" || mode === "platform") {
    const preset = getBgmPresetById(presetId);
    if (preset?.kind === "soundcloud" || preset?.kind === "youtube") return null;
    return preset?.url || null;
  }
  return null;
}

export function isSoundCloudBgmMode(styleConfig) {
  const bgm = styleConfig?.bgm;
  if (!bgm) return false;
  if (bgm.mode === "soundcloud" && (bgm.soundcloud?.trackUrl || bgm.soundcloud?.trackId)) return true;
  if ((bgm.mode === "preset" || bgm.mode === "platform") && bgm.presetId) {
    const p = getBgmPresetById(bgm.presetId);
    return p?.kind === "soundcloud";
  }
  return false;
}

/** @deprecated YouTube 레거시 — 새 차트는 SoundCloud */
export function isYoutubeBgmMode(styleConfig) {
  const bgm = styleConfig?.bgm;
  if (!bgm) return false;
  if (bgm.mode === "youtube" && bgm.youtube?.videoId) return true;
  return false;
}

export function resolveShowcaseSoundCloudTrackUrl(styleConfig) {
  const bgm = styleConfig?.bgm;
  if (!bgm) return "";
  if (bgm.mode === "soundcloud") {
    const fromUrl = extractSoundCloudTrackUrl(bgm.soundcloud?.trackUrl || "");
    if (fromUrl) return fromUrl;
    const id = String(bgm.soundcloud?.trackId || "").trim();
    return id ? `https://api.soundcloud.com/tracks/${id}` : "";
  }
  if (bgm.mode === "preset" || bgm.mode === "platform") {
    const p = getBgmPresetById(bgm.presetId);
    return p?.kind === "soundcloud" ? String(p.trackUrl || "").trim() : "";
  }
  return "";
}

/** @deprecated */
export function resolveShowcaseYoutubeVideoId(styleConfig) {
  const bgm = styleConfig?.bgm;
  if (!bgm) return "";
  if (bgm.mode === "youtube") return String(bgm.youtube?.videoId || "").trim();
  return "";
}
