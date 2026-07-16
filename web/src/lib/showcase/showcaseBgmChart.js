/**
 * 릴스·숏츠 감성 BGM 차트 (YouTube 공식 embed)
 *
 * 중요: 인스타/틱톡 공식 TOP100 저작권 음원은 라이선스 없이 MP3로 스트리밍할 수 없음.
 * → YouTube에 공개·임베드 가능한 **실제 음악**(로파이·바이럴 감성·Audio Library 계열)을
 *    주간 순위로 회전해 제공. 사용자가 URL로 원하는 곡도 지정 가능.
 */

/** @typedef {{ id: string, label: string, tag: string, theme: string, videoId: string, artist: string }} ReelsChartTrack */

/** @type {ReelsChartTrack[]} */
export const REELS_BGM_CHART_POOL = [
  {
    id: "reels-lofi-radio",
    label: "Lofi Hip Hop Radio",
    tag: "로파이",
    theme: "lofi",
    videoId: "jfKfPfyJRdk",
    artist: "Lofi Girl"
  },
  {
    id: "reels-synthwave",
    label: "Synthwave Drive",
    tag: "신스웨이브",
    theme: "business",
    videoId: "4xDzrJKXOOY",
    artist: "Lofi Girl"
  },
  {
    id: "reels-coffee-shop",
    label: "Coffee Shop Vibes",
    tag: "카페",
    theme: "cafe",
    videoId: "0n80vO2P2es",
    artist: "Coffee Shop Vibes"
  },
  {
    id: "reels-chillhop",
    label: "Chillhop Essentials",
    tag: "칠합",
    theme: "lofi",
    videoId: "7NOSDKbWMlQ",
    artist: "Chillhop Music"
  },
  {
    id: "reels-study-beats",
    label: "Study Beats",
    tag: "집중",
    theme: "lofi",
    videoId: "5qap5aO4i9A",
    artist: "Lofi Girl"
  },
  {
    id: "reels-night-jazz",
    label: "Late Night Jazz",
    tag: "재즈",
    theme: "cafe",
    videoId: "Dx5iJTaoZuw",
    artist: "Cafe Music BGM"
  },
  {
    id: "reels-ambient-calm",
    label: "Calm Ambient Flow",
    tag: "앰비언트",
    theme: "ambient",
    videoId: "n61ULEU7CO0",
    artist: "Ambient Worlds"
  },
  {
    id: "reels-upbeat-work",
    label: "Upbeat Work Energy",
    tag: "업비트",
    theme: "business",
    videoId: "htXuwXA5mxk",
    artist: "YouTube Audio Library"
  },
  {
    id: "reels-rainy-lofi",
    label: "Rainy Window Lofi",
    tag: "감성",
    theme: "lofi",
    videoId: "DWcJFNfaf9c",
    artist: "STEEZYASFUCK"
  },
  {
    id: "reels-morning-cafe",
    label: "Morning Cafe Piano",
    tag: "피아노",
    theme: "cafe",
    videoId: "lTRiuFIWV54",
    artist: "Cafe Music BGM channel"
  },
  {
    id: "reels-city-walk",
    label: "City Walk Beats",
    tag: "시티",
    theme: "lofi",
    videoId: "f02mOEt11OQ",
    artist: "The Jazz Hop Café"
  },
  {
    id: "reels-dream-pop",
    label: "Dream Pop Soft",
    tag: "드림",
    theme: "ambient",
    videoId: "M7lc1UVf-VE",
    artist: "YouTube Audio Library"
  },
  {
    id: "reels-focus-deep",
    label: "Deep Focus",
    tag: "포커스",
    theme: "ambient",
    videoId: "WPni755-Krg",
    artist: "Lofi Girl"
  },
  {
    id: "reels-summer-chill",
    label: "Summer Chill",
    tag: "썸머",
    theme: "cafe",
    videoId: "kgx4WGK0oNU",
    artist: "Chill Music Lab"
  },
  {
    id: "reels-groove-night",
    label: "Night Groove",
    tag: "그루브",
    theme: "business",
    videoId: "hHW1oY26kxQ",
    artist: "Chillhop Music"
  },
  {
    id: "reels-soft-morning",
    label: "Soft Morning",
    tag: "모닝",
    theme: "cafe",
    videoId: "1fueZCTYkpA",
    artist: "Coffee Music"
  }
];

/**
 * 주간 단위로 순위를 돌려 "매번 업데이트"되는 차트 느낌
 * @param {{ theme?: string, limit?: number }} [opts]
 */
export function getWeeklyReelsBgmChart(opts = {}) {
  const limit = Math.min(20, Math.max(4, Number(opts.limit) || 12));
  const theme = String(opts.theme || "all");
  const pool =
    theme === "all" ? REELS_BGM_CHART_POOL : REELS_BGM_CHART_POOL.filter((t) => t.theme === theme);
  const source = pool.length ? pool : REELS_BGM_CHART_POOL;
  const week = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000));
  const start = ((week % source.length) + source.length) % source.length;
  const rotated = [...source.slice(start), ...source.slice(0, start)];
  return rotated.slice(0, limit).map((t, i) => ({
    ...t,
    rank: i + 1,
    tag: `#${i + 1} ${t.tag}`
  }));
}

export function getReelsChartTrackById(id) {
  return REELS_BGM_CHART_POOL.find((t) => t.id === id) || null;
}
