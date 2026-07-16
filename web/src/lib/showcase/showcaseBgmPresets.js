/**
 * VLUE RF 큐레이션 BGM
 * Mixkit CDN 은 Android WebView 에서 로드 실패(403/차단)
 * SoundHelix 직링크는 CORS(crossOrigin) / WebView 차단 이슈 → API 프록시 사용
 * 라벨은 숏폼(릴스·쇼츠) 감성으로 구성
 */

import { apiUrl } from "../apiBase.js";

/** @param {number} n 1..10 */
export function showcaseBgmProxyUrl(n) {
  const song = Math.min(10, Math.max(1, Number(n) || 1));
  return apiUrl(`/api/bgm/${song}`);
}

const HELIX = (n) => showcaseBgmProxyUrl(n);

/** @typedef {{ id: string, label: string, tag: string, theme: string, url: string, helixN: number }} ShowcaseBgmPreset */

/** @type {ShowcaseBgmPreset[]} */
export const SHOWCASE_BGM_PRESETS = [
  { id: "reels-house", label: "릴스 업비트 그루브", tag: "#릴스", theme: "lofi", helixN: 1, url: HELIX(1) },
  { id: "shorts-hiphop", label: "숏츠 힙합 플로우", tag: "#숏츠", theme: "lofi", helixN: 2, url: HELIX(2) },
  { id: "dream-big", label: "드림 빅 업비트", tag: "#업비트", theme: "business", helixN: 3, url: HELIX(3) },
  { id: "serene-view", label: "세린 칠 무드", tag: "#칠", theme: "ambient", helixN: 4, url: HELIX(4) },
  { id: "cat-walk", label: "캣워크 팝 비트", tag: "#팝", theme: "cafe", helixN: 5, url: HELIX(5) },
  { id: "hazy-hours", label: "나이트 시티 바이브", tag: "#나이트", theme: "lofi", helixN: 6, url: HELIX(6) },
  { id: "deep-urban", label: "딥 어반 비트", tag: "#어반", theme: "lofi", helixN: 7, url: HELIX(7) },
  { id: "silent-trap", label: "슬로우 트랩", tag: "#트랩", theme: "lofi", helixN: 8, url: HELIX(8) },
  { id: "sun-daughter", label: "브라이트 선샤인", tag: "#브라이트", theme: "cafe", helixN: 9, url: HELIX(9) },
  { id: "drive-ambition", label: "드라이빙 앰비션", tag: "#드라이브", theme: "business", helixN: 10, url: HELIX(10) },
  { id: "worldbeat", label: "월드비트 에너지", tag: "#바이브", theme: "cafe", helixN: 1, url: HELIX(1) },
  { id: "sleepy-cat", label: "로파이 슬립", tag: "#로파이", theme: "lofi", helixN: 2, url: HELIX(2) },
  { id: "soft-piano", label: "소프트 피아노", tag: "#피아노", theme: "ambient", helixN: 3, url: HELIX(3) },
  { id: "raising-me", label: "하이프 레이즈", tag: "#하이프", theme: "business", helixN: 4, url: HELIX(4) },
  { id: "valley-sunset", label: "선셋 밸리", tag: "#선셋", theme: "cafe", helixN: 5, url: HELIX(5) },
  { id: "life-is-a-dream", label: "드림 웨이브", tag: "#드림", theme: "ambient", helixN: 6, url: HELIX(6) },
  { id: "bridge-nights", label: "시티 브릿지", tag: "#시티", theme: "lofi", helixN: 7, url: HELIX(7) },
  { id: "island-beat", label: "트로피컬 비트", tag: "#트로피컬", theme: "cafe", helixN: 8, url: HELIX(8) },
  { id: "piano-reflections", label: "감성 리플렉션", tag: "#감성", theme: "ambient", helixN: 9, url: HELIX(9) },
  { id: "cbpd-trap", label: "시티 트랩 플로우", tag: "#트랩", theme: "lofi", helixN: 10, url: HELIX(10) }
];

export const SHOWCASE_BGM_THEMES = [
  { id: "all", label: "전체" },
  { id: "cafe", label: "카페감성" },
  { id: "business", label: "비즈니스" },
  { id: "lofi", label: "로파이·숏폼" },
  { id: "ambient", label: "앰비언트" }
];

export function getBgmPresetById(id) {
  const p = SHOWCASE_BGM_PRESETS.find((x) => x.id === id) || null;
  if (!p) return null;
  /* apiUrl 은 런타임 origin 의존 — 매번 최신 프록시 URL 사용 */
  return { ...p, url: showcaseBgmProxyUrl(p.helixN) };
}

/** @param {import('./showcaseStyleStorage.js').ShowcaseStyleConfig | null | undefined} styleConfig */
export function resolveShowcaseBgmUrl(styleConfig) {
  if (!styleConfig?.bgm) return null;
  const { mode, presetId } = styleConfig.bgm;
  if (mode === "none") return null;
  if (mode === "preset" || mode === "platform") {
    const preset = getBgmPresetById(presetId);
    return preset?.url || null;
  }
  if (mode === "youtube") return null;
  return null;
}

export function isYoutubeBgmMode(styleConfig) {
  return styleConfig?.bgm?.mode === "youtube" && Boolean(styleConfig.bgm.youtube?.videoId);
}
