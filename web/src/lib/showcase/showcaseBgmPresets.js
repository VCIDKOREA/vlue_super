/**
 * VLUE RF 큐레이션 BGM 프리셋
 * Pixabay download CDN 은 WebView CORS/403 으로 미리듣기 실패 → SoundHelix 공개 샘플 사용
 */

const HELIX = (n) => `https://www.soundhelix.com/examples/mp3/SoundHelix-Song-${n}.mp3`;

/** @typedef {{ id: string, label: string, tag: string, theme: string, url: string }} ShowcaseBgmPreset */

/** @type {ShowcaseBgmPreset[]} */
export const SHOWCASE_BGM_PRESETS = [
  { id: "cafe-kpop-piano", label: "카페감성 K-POP 피아노", tag: "#카페감성", theme: "cafe", url: HELIX(1) },
  { id: "biz-trust-piano", label: "비즈니스 신뢰 연주곡", tag: "#비즈니스", theme: "business", url: HELIX(2) },
  { id: "lofi-chill", label: "잔잔한 로파이 비트", tag: "#로파이", theme: "lofi", url: HELIX(3) },
  { id: "morning-breeze", label: "모닝 브리즈", tag: "#아침", theme: "cafe", url: HELIX(4) },
  { id: "soft-rain", label: "소프트 레인", tag: "#비오는날", theme: "ambient", url: HELIX(5) },
  { id: "trust-blue", label: "Trust Blue", tag: "#안심", theme: "business", url: HELIX(6) },
  { id: "calm-day", label: "Calm Day", tag: "#일상", theme: "lofi", url: HELIX(7) },
  { id: "soft-wave", label: "Soft Wave", tag: "#감성", theme: "ambient", url: HELIX(8) },
  { id: "sunset-glow", label: "선셋 글로우", tag: "#저녁", theme: "cafe", url: HELIX(9) },
  { id: "focus-flow", label: "포커스 플로우", tag: "#집중", theme: "lofi", url: HELIX(10) },
  { id: "warm-tea", label: "따뜻한 티타임", tag: "#티타임", theme: "cafe", url: HELIX(1) },
  { id: "city-lights", label: "시티 라이트", tag: "#도시", theme: "lofi", url: HELIX(2) },
  { id: "gentle-harp", label: "젠틀 하프", tag: "#하프", theme: "ambient", url: HELIX(3) },
  { id: "meeting-calm", label: "미팅 캄", tag: "#미팅", theme: "business", url: HELIX(4) },
  { id: "dreamy-pad", label: "드리미 패드", tag: "#드림", theme: "ambient", url: HELIX(5) },
  { id: "cozy-fire", label: "코지 파이어", tag: "#겨울", theme: "cafe", url: HELIX(6) },
  { id: "uplift-start", label: "업리프트 스타트", tag: "#시작", theme: "business", url: HELIX(7) },
  { id: "night-drive", label: "나이트 드라이브", tag: "#드라이브", theme: "lofi", url: HELIX(8) },
  { id: "ocean-calm", label: "오션 캄", tag: "#바다", theme: "ambient", url: HELIX(9) },
  { id: "spring-bloom", label: "스프링 블룸", tag: "#봄", theme: "cafe", url: HELIX(10) },
  { id: "minimal-groove", label: "미니멀 그루브", tag: "#미니멀", theme: "lofi", url: HELIX(1) },
  { id: "brand-trust", label: "브랜드 트러스트", tag: "#브랜드", theme: "business", url: HELIX(2) },
  { id: "lazy-sunday", label: "레이지 선데이", tag: "#주말", theme: "cafe", url: HELIX(3) },
  { id: "zen-space", label: "젠 스페이스", tag: "#명상", theme: "ambient", url: HELIX(4) },
  { id: "happy-vibe", label: "해피 바이브", tag: "#해피", theme: "lofi", url: HELIX(5) }
];

export const SHOWCASE_BGM_THEMES = [
  { id: "all", label: "전체" },
  { id: "cafe", label: "카페감성" },
  { id: "business", label: "비즈니스" },
  { id: "lofi", label: "로파이" },
  { id: "ambient", label: "앰비언트" }
];

export function getBgmPresetById(id) {
  return SHOWCASE_BGM_PRESETS.find((p) => p.id === id) || null;
}

/** @param {import('./showcaseStyleStorage.js').ShowcaseStyleConfig | null | undefined} styleConfig */
export function resolveShowcaseBgmUrl(styleConfig) {
  if (!styleConfig?.bgm) return null;
  const { mode, presetId } = styleConfig.bgm;
  if (mode === "none" || mode === "platform") return null;
  if (mode === "preset") {
    const preset = getBgmPresetById(presetId);
    return preset?.url || null;
  }
  if (mode === "youtube") return null;
  return null;
}

export function isYoutubeBgmMode(styleConfig) {
  return styleConfig?.bgm?.mode === "youtube" && Boolean(styleConfig.bgm.youtube?.videoId);
}
