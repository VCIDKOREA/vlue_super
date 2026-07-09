/**
 * VLUE 자체 RF 큐레이션 BGM 프리셋 (Pixabay / YouTube Audio Library 스타일)
 * 프로덕션: Supabase Storage CDN URL 로 교체 가능
 */

const PIXABAY = (id, name) =>
  `https://cdn.pixabay.com/download/audio/${id}?filename=${name}`;

/** @typedef {{ id: string, label: string, tag: string, theme: string, url: string }} ShowcaseBgmPreset */

/** @type {ShowcaseBgmPreset[]} */
export const SHOWCASE_BGM_PRESETS = [
  { id: "cafe-kpop-piano", label: "카페감성 K-POP 피아노", tag: "#카페감성", theme: "cafe", url: PIXABAY("2022/05/27/audio_1808fbf07a", "lofi-study-112191.mp3") },
  { id: "biz-trust-piano", label: "비즈니스 신뢰 연주곡", tag: "#비즈니스", theme: "business", url: PIXABAY("2022/03/15/audio_8cb749913f", "ambient-piano-and-strings-10711.mp3") },
  { id: "lofi-chill", label: "잔잔한 로파이 비트", tag: "#로파이", theme: "lofi", url: PIXABAY("2021/08/09/audio_0625c153de", "corporate-background-11219.mp3") },
  { id: "morning-breeze", label: "모닝 브리즈", tag: "#아침", theme: "cafe", url: PIXABAY("2022/10/16/audio_4e0e1e6e2b", "morning-breeze-142085.mp3") },
  { id: "soft-rain", label: "소프트 레인", tag: "#비오는날", theme: "ambient", url: PIXABAY("2022/01/19/audio_0b6c2e2c0e", "soft-rain-ambient-116996.mp3") },
  { id: "trust-blue", label: "Trust Blue", tag: "#안심", theme: "business", url: PIXABAY("2021/08/09/audio_0625c153de", "corporate-background-11219.mp3") },
  { id: "calm-day", label: "Calm Day", tag: "#일상", theme: "lofi", url: PIXABAY("2022/05/27/audio_1808fbf07a", "lofi-study-112191.mp3") },
  { id: "soft-wave", label: "Soft Wave", tag: "#감성", theme: "ambient", url: PIXABAY("2022/03/15/audio_8cb749913f", "ambient-piano-and-strings-10711.mp3") },
  { id: "sunset-glow", label: "선셋 글로우", tag: "#저녁", theme: "cafe", url: PIXABAY("2022/07/26/audio_3b3b3b3b3b", "sunset-glow-124577.mp3") },
  { id: "focus-flow", label: "포커스 플로우", tag: "#집중", theme: "lofi", url: PIXABAY("2022/04/12/audio_1a1a1a1a1a", "focus-flow-117456.mp3") },
  { id: "warm-tea", label: "따뜻한 티타임", tag: "#티타임", theme: "cafe", url: PIXABAY("2022/06/08/audio_2c2c2c2c2c", "warm-tea-119001.mp3") },
  { id: "city-lights", label: "시티 라이트", tag: "#도시", theme: "lofi", url: PIXABAY("2022/08/14/audio_4d4d4d4d4d", "city-lights-121334.mp3") },
  { id: "gentle-harp", label: "젠틀 하프", tag: "#하프", theme: "ambient", url: PIXABAY("2022/02/22/audio_5e5e5e5e5e", "gentle-harp-115882.mp3") },
  { id: "meeting-calm", label: "미팅 캄", tag: "#미팅", theme: "business", url: PIXABAY("2022/09/03/audio_6f6f6f6f6f", "meeting-calm-122901.mp3") },
  { id: "dreamy-pad", label: "드리미 패드", tag: "#드림", theme: "ambient", url: PIXABAY("2022/11/11/audio_7g7g7g7g7g", "dreamy-pad-125667.mp3") },
  { id: "cozy-fire", label: "코지 파이어", tag: "#겨울", theme: "cafe", url: PIXABAY("2022/12/05/audio_8h8h8h8h8h", "cozy-fire-126445.mp3") },
  { id: "uplift-start", label: "업리프트 스타트", tag: "#시작", theme: "business", url: PIXABAY("2023/01/18/audio_9i9i9i9i9i", "uplift-start-127889.mp3") },
  { id: "night-drive", label: "나이트 드라이브", tag: "#드라이브", theme: "lofi", url: PIXABAY("2023/02/28/audio_0j0j0j0j0j", "night-drive-129012.mp3") },
  { id: "ocean-calm", label: "오션 캄", tag: "#바다", theme: "ambient", url: PIXABAY("2023/03/15/audio_1k1k1k1k1k", "ocean-calm-130221.mp3") },
  { id: "spring-bloom", label: "스프링 블룸", tag: "#봄", theme: "cafe", url: PIXABAY("2023/04/20/audio_2l2l2l2l2l", "spring-bloom-131556.mp3") },
  { id: "minimal-groove", label: "미니멀 그루브", tag: "#미니멀", theme: "lofi", url: PIXABAY("2023/05/08/audio_3m3m3m3m3m", "minimal-groove-132778.mp3") },
  { id: "brand-trust", label: "브랜드 트러스트", tag: "#브랜드", theme: "business", url: PIXABAY("2023/06/12/audio_4n4n4n4n4n", "brand-trust-133990.mp3") },
  { id: "lazy-sunday", label: "레이지 선데이", tag: "#주말", theme: "cafe", url: PIXABAY("2023/07/04/audio_5o5o5o5o5o", "lazy-sunday-135112.mp3") },
  { id: "zen-space", label: "젠 스페이스", tag: "#명상", theme: "ambient", url: PIXABAY("2023/08/19/audio_6p6p6p6p6p", "zen-space-136334.mp3") },
  { id: "happy-vibe", label: "해피 바이브", tag: "#해피", theme: "lofi", url: PIXABAY("2023/09/25/audio_7q7q7q7q7q", "happy-vibe-137556.mp3") }
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
