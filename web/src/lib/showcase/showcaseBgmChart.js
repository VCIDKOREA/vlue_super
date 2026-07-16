/**
 * 릴스·숏츠 감성 BGM 차트 (SoundCloud Widget embed)
 *
 * YouTube 임베드 실패·지역 제한이 많아 SoundCloud 공개 트랙으로 전환.
 * trackUrl 은 api.soundcloud.com/tracks/{id} 또는 permalink.
 */

/**
 * @typedef {{
 *   id: string,
 *   label: string,
 *   tag: string,
 *   theme: string,
 *   trackId: string,
 *   trackUrl: string,
 *   artworkUrl: string,
 *   artist: string
 * }} ReelsChartTrack
 */

/** @type {ReelsChartTrack[]} */
export const REELS_BGM_CHART_POOL = [
  {
    id: "sc-flickermood",
    label: "Flickermood",
    tag: "앰비언트",
    theme: "ambient",
    trackId: "293",
    trackUrl: "https://api.soundcloud.com/tracks/293",
    artworkUrl: "https://i1.sndcdn.com/artworks-000067273316-smsiqx-t500x500.jpg",
    artist: "Forss"
  },
  {
    id: "sc-funk-nerds",
    label: "Funk for Nerds",
    tag: "업비트",
    theme: "business",
    trackId: "292",
    trackUrl: "https://api.soundcloud.com/tracks/292",
    artworkUrl: "https://i1.sndcdn.com/artworks-000067273305-sndpvm-t500x500.jpg",
    artist: "Forss"
  },
  {
    id: "sc-splashes",
    label: "Using Splashes",
    tag: "칠",
    theme: "lofi",
    trackId: "294",
    trackUrl: "https://api.soundcloud.com/tracks/294",
    artworkUrl: "https://i1.sndcdn.com/artworks-000067273321-fasi2k-t500x500.jpg",
    artist: "Forss"
  },
  {
    id: "sc-journeyman",
    label: "Journeyman",
    tag: "카페",
    theme: "cafe",
    trackId: "295",
    trackUrl: "https://api.soundcloud.com/tracks/295",
    artworkUrl: "https://i1.sndcdn.com/artworks-000067273337-nrnhok-t500x500.jpg",
    artist: "Forss"
  },
  {
    id: "sc-atomised",
    label: "Atomised",
    tag: "로파이",
    theme: "lofi",
    trackId: "296",
    trackUrl: "https://api.soundcloud.com/tracks/296",
    artworkUrl: "https://i1.sndcdn.com/artworks-000067273344-qyp37r-t500x500.jpg",
    artist: "Forss"
  },
  {
    id: "sc-characteristics",
    label: "Characteristics",
    tag: "비즈니스",
    theme: "business",
    trackId: "297",
    trackUrl: "https://api.soundcloud.com/tracks/297",
    artworkUrl: "https://i1.sndcdn.com/artworks-000067273350-xb5img-t500x500.jpg",
    artist: "Forss"
  },
  {
    id: "sc-inversion",
    label: "Lost Through Inversion",
    tag: "딥",
    theme: "ambient",
    trackId: "298",
    trackUrl: "https://api.soundcloud.com/tracks/298",
    artworkUrl: "https://i1.sndcdn.com/artworks-000067273355-i8z5ni-t500x500.jpg",
    artist: "Forss"
  },
  {
    id: "sc-tacit",
    label: "Tacit Knowledge",
    tag: "감성",
    theme: "lofi",
    trackId: "299",
    trackUrl: "https://api.soundcloud.com/tracks/299",
    artworkUrl: "https://i1.sndcdn.com/artworks-000067273359-vazv3x-t500x500.jpg",
    artist: "Forss"
  },
  {
    id: "sc-paradigm",
    label: "Paradigm Shift",
    tag: "포커스",
    theme: "business",
    trackId: "300",
    trackUrl: "https://api.soundcloud.com/tracks/300",
    artworkUrl: "https://i1.sndcdn.com/artworks-000067273366-0ax7gy-t500x500.jpg",
    artist: "Forss"
  },
  {
    id: "sc-hobnotropic",
    label: "Hobnotropic",
    tag: "힐링",
    theme: "ambient",
    trackId: "49931",
    trackUrl: "https://api.soundcloud.com/tracks/49931",
    artworkUrl: "https://i1.sndcdn.com/artworks-000000103093-941e7e-t500x500.jpg",
    artist: "matas petrikas"
  },
  {
    id: "sc-new-year",
    label: "Waiting For The New Year",
    tag: "모닝",
    theme: "cafe",
    trackId: "215386080",
    trackUrl: "https://api.soundcloud.com/tracks/215386080",
    artworkUrl: "https://i1.sndcdn.com/artworks-000166412176-0d9iwn-t500x500.jpg",
    artist: "Common Static"
  },
  {
    id: "sc-mais",
    label: "Mais do Que Sou",
    tag: "그루브",
    theme: "cafe",
    trackId: "257876590",
    trackUrl: "https://api.soundcloud.com/tracks/257876590",
    artworkUrl: "https://i1.sndcdn.com/artworks-VIKCBWs85kbe-0-t500x500.jpg",
    artist: "O Giro"
  },
  {
    id: "sc-kungamordet",
    label: "Kungamordet",
    tag: "시네마",
    theme: "ambient",
    trackId: "309",
    trackUrl: "https://api.soundcloud.com/tracks/309",
    artworkUrl: "https://i1.sndcdn.com/artworks-000039607388-y1u9r5-t500x500.jpg",
    artist: "Jean-Paul Wall"
  },
  {
    id: "sc-lacheln",
    label: "Lächeln",
    tag: "브런치",
    theme: "cafe",
    trackId: "257876591",
    trackUrl: "https://api.soundcloud.com/tracks/257876591",
    artworkUrl: "https://i1.sndcdn.com/artworks-XCNbrKoSAlcq-0-t500x500.jpg",
    artist: "Adoro"
  },
  {
    id: "sc-kussen",
    label: "Küssen (Instrumental)",
    tag: "피아노",
    theme: "cafe",
    trackId: "257876592",
    trackUrl: "https://api.soundcloud.com/tracks/257876592",
    artworkUrl: "https://i1.sndcdn.com/artworks-Q5hIPqJn7o5r-0-t500x500.jpg",
    artist: "Adoro"
  },
  {
    id: "sc-lynguistics",
    label: "Lynguistics",
    tag: "힙합",
    theme: "lofi",
    trackId: "215386082",
    trackUrl: "https://api.soundcloud.com/tracks/215386082",
    artworkUrl: "https://i1.sndcdn.com/artworks-000123702397-wq1kc8-t500x500.jpg",
    artist: "CunninLynguists"
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
