/**
 * 릴스·숏츠 감성 BGM 차트 (SoundCloud)
 *
 * 한국·글로벌에서 재생 가능한 Creative Commons / 공개 임베드 트랙만 엄선.
 * (지역 제한 곡은 차트에서 제외. 런타임 에러 시 blocked 로컬 기록으로 추가 비활성)
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
 *   artist: string,
 *   genreKeys: string[]
 * }} ReelsChartTrack
 */

/** @type {ReelsChartTrack[]} — KR/글로벌 임베드 검증 후보 (Forss 등 CC 계열) */
export const REELS_BGM_CHART_POOL = [
  {
    id: "sc-flickermood",
    label: "Flickermood",
    tag: "앰비언트",
    theme: "ambient",
    trackId: "293",
    trackUrl: "https://api.soundcloud.com/tracks/293",
    artworkUrl: "https://i1.sndcdn.com/artworks-000067273316-smsiqx-t500x500.jpg",
    artist: "Forss",
    genreKeys: ["앰비언트", "ambient", "힐링", "calm", "relax", "study", "스터디"]
  },
  {
    id: "sc-funk-nerds",
    label: "Funk for Nerds",
    tag: "업비트",
    theme: "business",
    trackId: "292",
    trackUrl: "https://api.soundcloud.com/tracks/292",
    artworkUrl: "https://i1.sndcdn.com/artworks-000067273305-sndpvm-t500x500.jpg",
    artist: "Forss",
    genreKeys: ["업비트", "비즈니스", "business", "funk", "에너지", "work"]
  },
  {
    id: "sc-splashes",
    label: "Using Splashes",
    tag: "칠",
    theme: "lofi",
    trackId: "294",
    trackUrl: "https://api.soundcloud.com/tracks/294",
    artworkUrl: "https://i1.sndcdn.com/artworks-000067273321-fasi2k-t500x500.jpg",
    artist: "Forss",
    genreKeys: ["로파이", "lofi", "칠", "chill", "숏폼", "study beats", "스터디"]
  },
  {
    id: "sc-journeyman",
    label: "Journeyman",
    tag: "카페",
    theme: "cafe",
    trackId: "295",
    trackUrl: "https://api.soundcloud.com/tracks/295",
    artworkUrl: "https://i1.sndcdn.com/artworks-000067273337-nrnhok-t500x500.jpg",
    artist: "Forss",
    genreKeys: ["카페", "cafe", "브런치", "커피", "coffee", "감성"]
  },
  {
    id: "sc-atomised",
    label: "Atomised",
    tag: "로파이",
    theme: "lofi",
    trackId: "296",
    trackUrl: "https://api.soundcloud.com/tracks/296",
    artworkUrl: "https://i1.sndcdn.com/artworks-000067273344-qyp37r-t500x500.jpg",
    artist: "Forss",
    genreKeys: ["로파이", "lofi", "study beats", "스터디", "집중", "focus", "숏폼"]
  },
  {
    id: "sc-characteristics",
    label: "Characteristics",
    tag: "비즈니스",
    theme: "business",
    trackId: "297",
    trackUrl: "https://api.soundcloud.com/tracks/297",
    artworkUrl: "https://i1.sndcdn.com/artworks-000067273350-xb5img-t500x500.jpg",
    artist: "Forss",
    genreKeys: ["비즈니스", "business", "오피스", "corporate", "work"]
  },
  {
    id: "sc-inversion",
    label: "Lost Through Inversion",
    tag: "딥",
    theme: "ambient",
    trackId: "298",
    trackUrl: "https://api.soundcloud.com/tracks/298",
    artworkUrl: "https://i1.sndcdn.com/artworks-000067273355-i8z5ni-t500x500.jpg",
    artist: "Forss",
    genreKeys: ["앰비언트", "ambient", "딥", "명상", "calm"]
  },
  {
    id: "sc-tacit",
    label: "Tacit Knowledge",
    tag: "감성",
    theme: "lofi",
    trackId: "299",
    trackUrl: "https://api.soundcloud.com/tracks/299",
    artworkUrl: "https://i1.sndcdn.com/artworks-000067273359-vazv3x-t500x500.jpg",
    artist: "Forss",
    genreKeys: ["로파이", "lofi", "감성", "study", "스터디", "study beats"]
  },
  {
    id: "sc-paradigm",
    label: "Paradigm Shift",
    tag: "포커스",
    theme: "business",
    trackId: "300",
    trackUrl: "https://api.soundcloud.com/tracks/300",
    artworkUrl: "https://i1.sndcdn.com/artworks-000067273366-0ax7gy-t500x500.jpg",
    artist: "Forss",
    genreKeys: ["포커스", "focus", "비즈니스", "study", "집중", "work"]
  },
  {
    id: "sc-hobnotropic",
    label: "Hobnotropic",
    tag: "힐링",
    theme: "ambient",
    trackId: "49931",
    trackUrl: "https://api.soundcloud.com/tracks/49931",
    artworkUrl: "https://i1.sndcdn.com/artworks-000000103093-941e7e-t500x500.jpg",
    artist: "matas petrikas",
    genreKeys: ["힐링", "앰비언트", "ambient", "relax", "calm", "명상"]
  },
  {
    id: "sc-munching",
    label: "Munching at Tiannas",
    tag: "캐주얼",
    theme: "cafe",
    trackId: "13158665",
    trackUrl: "https://api.soundcloud.com/tracks/13158665",
    artworkUrl: "",
    artist: "Alex Stevenson",
    genreKeys: ["카페", "cafe", "캐주얼", "브런치", "chill"]
  }
];

/** 장르 검색 추천 칩 (한국 가능 큐레이션 풀 안에서만) */
export const SHOWCASE_BGM_GENRE_CHIPS = [
  { id: "study", label: "Study Beats", query: "study beats" },
  { id: "lofi", label: "로파이", query: "로파이" },
  { id: "cafe", label: "카페", query: "카페" },
  { id: "business", label: "비즈니스", query: "비즈니스" },
  { id: "ambient", label: "앰비언트", query: "앰비언트" },
  { id: "focus", label: "집중·포커스", query: "포커스" }
];

/**
 * @param {{ theme?: string, limit?: number, excludeIds?: Set<string>|string[] }} [opts]
 */
export function getWeeklyReelsBgmChart(opts = {}) {
  const limit = Math.min(20, Math.max(4, Number(opts.limit) || 12));
  const theme = String(opts.theme || "all");
  const exclude = opts.excludeIds instanceof Set ? opts.excludeIds : new Set(opts.excludeIds || []);
  const pool =
    theme === "all" ? REELS_BGM_CHART_POOL : REELS_BGM_CHART_POOL.filter((t) => t.theme === theme);
  const available = (pool.length ? pool : REELS_BGM_CHART_POOL).filter(
    (t) => !exclude.has(t.id) && !exclude.has(t.trackId) && !exclude.has(t.trackUrl)
  );
  const source = available.length ? available : REELS_BGM_CHART_POOL;
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

/**
 * 장르·키워드 검색 → 큐레이션 풀 추천 (한국 가능 곡만)
 * @param {string} query
 * @param {{ excludeIds?: Set<string>|string[], limit?: number }} [opts]
 */
export function searchShowcaseBgmByGenre(query, opts = {}) {
  const q = String(query || "")
    .trim()
    .toLowerCase();
  const limit = Math.min(12, Math.max(1, Number(opts.limit) || 8));
  const exclude = opts.excludeIds instanceof Set ? opts.excludeIds : new Set(opts.excludeIds || []);
  const pool = REELS_BGM_CHART_POOL.filter(
    (t) => !exclude.has(t.id) && !exclude.has(t.trackId) && !exclude.has(t.trackUrl)
  );
  if (!q) {
    return getWeeklyReelsBgmChart({ theme: "all", limit, excludeIds: exclude });
  }
  const scored = pool
    .map((t) => {
      const hay = [
        t.label,
        t.tag,
        t.theme,
        t.artist,
        ...(t.genreKeys || [])
      ]
        .join(" ")
        .toLowerCase();
      let score = 0;
      if (hay.includes(q)) score += 10;
      for (const part of q.split(/\s+/).filter(Boolean)) {
        if (hay.includes(part)) score += 4;
        if ((t.genreKeys || []).some((k) => k.toLowerCase() === part || k.toLowerCase().includes(part))) {
          score += 6;
        }
      }
      return { t, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  const list = (scored.length ? scored.map((x) => x.t) : pool).slice(0, limit);
  return list.map((t, i) => ({
    ...t,
    rank: i + 1,
    tag: `#${i + 1} ${t.tag}`
  }));
}

/** @param {ReelsChartTrack[]} list @param {string} currentId */
export function getNextAvailableBgmTrack(list, currentId, blocked = new Set()) {
  if (!list?.length) return null;
  const start = Math.max(0, list.findIndex((t) => t.id === currentId));
  for (let i = 1; i <= list.length; i += 1) {
    const t = list[(start + i) % list.length];
    if (!t || t.id === currentId) continue;
    if (blocked.has(t.id) || blocked.has(t.trackId) || blocked.has(t.trackUrl)) continue;
    return t;
  }
  return null;
}
