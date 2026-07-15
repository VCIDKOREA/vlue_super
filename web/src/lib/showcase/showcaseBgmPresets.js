/**
 * VLUE RF 큐레이션 BGM — 숏폼(릴스·쇼츠) 감성 Mixkit 프리뷰 MP3
 * (WebView Audio 재생용 CDN · 로컬 미포함)
 */

const MIX = (slug) => `https://assets.mixkit.co/music/preview/${slug}.mp3`;

/** @typedef {{ id: string, label: string, tag: string, theme: string, url: string }} ShowcaseBgmPreset */

/** @type {ShowcaseBgmPreset[]} */
export const SHOWCASE_BGM_PRESETS = [
  { id: "reels-house", label: "릴스 하우스 비트", tag: "#릴스", theme: "lofi", url: MIX("mixkit-tech-house-vibes-130") },
  { id: "shorts-hiphop", label: "숏츠 힙합 그루브", tag: "#숏츠", theme: "lofi", url: MIX("mixkit-hip-hop-02-738") },
  { id: "dream-big", label: "드림 빅 업비트", tag: "#업비트", theme: "business", url: MIX("mixkit-dreaming-big-31") },
  { id: "serene-view", label: "세린 뷰 칠", tag: "#칠", theme: "ambient", url: MIX("mixkit-serene-view-443") },
  { id: "cat-walk", label: "캣워크 팝", tag: "#팝", theme: "cafe", url: MIX("mixkit-cat-walk-371") },
  { id: "hazy-hours", label: "헤이즈 애프터아워", tag: "#나이트", theme: "lofi", url: MIX("mixkit-hazy-after-hours-132") },
  { id: "deep-urban", label: "딥 어반", tag: "#어반", theme: "lofi", url: MIX("mixkit-deep-urban-623") },
  { id: "silent-trap", label: "사일런트 트랩", tag: "#트랩", theme: "lofi", url: MIX("mixkit-silent-descent-slow-trap-185") },
  { id: "sun-daughter", label: "선 앤 도터", tag: "#브라이트", theme: "cafe", url: MIX("mixkit-sun-and-his-daughter-580") },
  { id: "drive-ambition", label: "드라이빙 앰비션", tag: "#드라이브", theme: "business", url: MIX("mixkit-driving-ambition-32") },
  { id: "worldbeat", label: "월드비트 게임", tag: "#바이브", theme: "cafe", url: MIX("mixkit-games-worldbeat-466") },
  { id: "sleepy-cat", label: "슬리피 캣 로파이", tag: "#로파이", theme: "lofi", url: MIX("mixkit-sleepy-cat-135") },
  { id: "soft-piano", label: "소프트 피아노 무드", tag: "#피아노", theme: "ambient", url: MIX("mixkit-beautiful-dream-493") },
  { id: "raising-me", label: "레이징 미 하이프", tag: "#하이프", theme: "business", url: MIX("mixkit-raising-me-higher-34") },
  { id: "valley-sunset", label: "밸리 선셋", tag: "#선셋", theme: "cafe", url: MIX("mixkit-valley-sunset-127") },
  { id: "life-is-a-dream", label: "라이프 이즈 어 드림", tag: "#드림", theme: "ambient", url: MIX("mixkit-life-is-a-dream-837") },
  { id: "bridge-nights", label: "브릿지 오브 더 나잇", tag: "#시티", theme: "lofi", url: MIX("mixkit-bridge-of-the-night-490") },
  { id: "island-beat", label: "아일랜드 비트", tag: "#트로피컬", theme: "cafe", url: MIX("mixkit-island-beat-250") },
  { id: "piano-reflections", label: "피아노 리플렉션", tag: "#감성", theme: "ambient", url: MIX("mixkit-piano-reflections-478") },
  { id: "cbpd-trap", label: "시티 트랩 플로우", tag: "#트랩", theme: "lofi", url: MIX("mixkit-cbpd-400") }
];

export const SHOWCASE_BGM_THEMES = [
  { id: "all", label: "전체" },
  { id: "cafe", label: "카페감성" },
  { id: "business", label: "비즈니스" },
  { id: "lofi", label: "로파이·숏폼" },
  { id: "ambient", label: "앰비언트" }
];

export function getBgmPresetById(id) {
  return SHOWCASE_BGM_PRESETS.find((p) => p.id === id) || null;
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
