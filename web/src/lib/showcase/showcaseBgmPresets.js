/**
 * VLUE 쇼케이스 BGM
 * - 기본: 주간 릴스 감성 YouTube 차트 (실제 음악 · iframe 재생)
 * - 레거시 presetId 호환용 SoundHelix 는 폴백으로만 유지
 */

import { apiUrl } from "../apiBase.js";
import { getReelsChartTrackById, getWeeklyReelsBgmChart } from "./showcaseBgmChart.js";

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

/** @typedef {{ id: string, label: string, tag: string, theme: string, url?: string, helixN?: number, videoId?: string, artist?: string, kind: 'youtube'|'mp3' }} ShowcaseBgmPreset */

/** 레거시 MP3 프리셋 (효과음처럼 들릴 수 있어 UI 기본 목록에서는 숨김) */
const LEGACY_MP3 = [
  { id: "reels-house", label: "릴스 업비트 그루브", tag: "#릴스", theme: "lofi", helixN: 1 },
  { id: "shorts-hiphop", label: "숏츠 힙합 플로우", tag: "#숏츠", theme: "lofi", helixN: 2 },
  { id: "dream-big", label: "드림 빅 업비트", tag: "#업비트", theme: "business", helixN: 3 },
  { id: "soft-piano", label: "소프트 피아노", tag: "#피아노", theme: "ambient", helixN: 3 }
];

/** UI 기본 목록 = 주간 YouTube 차트 */
export function buildShowcaseBgmPresets(theme = "all") {
  return getWeeklyReelsBgmChart({ theme, limit: 14 }).map((t) => ({
    id: t.id,
    label: t.label,
    tag: t.tag,
    theme: t.theme,
    videoId: t.videoId,
    artist: t.artist,
    kind: "youtube",
    rank: t.rank
  }));
}

/** @type {ShowcaseBgmPreset[]} — 정적 export (테마 필터용 메타) */
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
      videoId: chart.videoId,
      artist: chart.artist,
      kind: "youtube"
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
  if (mode === "none") return null;
  if (mode === "youtube") return null;
  if (mode === "preset" || mode === "platform") {
    const preset = getBgmPresetById(presetId);
    if (preset?.kind === "youtube") return null;
    return preset?.url || null;
  }
  return null;
}

export function isYoutubeBgmMode(styleConfig) {
  const bgm = styleConfig?.bgm;
  if (!bgm) return false;
  if (bgm.mode === "youtube" && bgm.youtube?.videoId) return true;
  if ((bgm.mode === "preset" || bgm.mode === "platform") && bgm.presetId) {
    const p = getBgmPresetById(bgm.presetId);
    return p?.kind === "youtube";
  }
  return false;
}

/** preset 이 YouTube 차트곡이면 videoId 반환 */
export function resolveShowcaseYoutubeVideoId(styleConfig) {
  const bgm = styleConfig?.bgm;
  if (!bgm) return "";
  if (bgm.mode === "youtube") return String(bgm.youtube?.videoId || "").trim();
  if (bgm.mode === "preset" || bgm.mode === "platform") {
    const p = getBgmPresetById(bgm.presetId);
    return p?.kind === "youtube" ? String(p.videoId || "").trim() : "";
  }
  return "";
}
