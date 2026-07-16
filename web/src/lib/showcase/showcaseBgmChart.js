/**
 * 릴스·숏츠 감성 BGM (SoundCloud)
 * 대한민국에서 재생이 확인된 Creative Commons / 공개 임베드 트랙만 수록.
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
 *   genreKeys: string[],
 *   krVerified: true
 * }} ReelsChartTrack
 */

/**
 * KR 재생 확인 큐레이션 풀
 * — SoundCloud 공식 데모·CC 계열(Forss 등). 지역 제한 상업곡 제외.
 * @type {ReelsChartTrack[]}
 */
export const REELS_BGM_CHART_POOL = [
  {
    id: "sc-journeyman",
    label: "Journeyman",
    tag: "카페감성",
    theme: "cafe",
    trackId: "295",
    trackUrl: "https://api.soundcloud.com/tracks/295",
    artworkUrl: "https://i1.sndcdn.com/artworks-000067273337-nrnhok-t500x500.jpg",
    artist: "Forss",
    genreKeys: ["카페", "카페감성", "cafe", "브런치", "커피", "coffee", "감성", "acoustic"],
    krVerified: true
  },
  {
    id: "sc-splashes",
    label: "Using Splashes",
    tag: "로파이",
    theme: "lofi",
    trackId: "294",
    trackUrl: "https://api.soundcloud.com/tracks/294",
    artworkUrl: "https://i1.sndcdn.com/artworks-000067273321-fasi2k-t500x500.jpg",
    artist: "Forss",
    genreKeys: ["로파이", "lofi", "칠", "chill", "숏폼", "study", "스터디", "beats"],
    krVerified: true
  },
  {
    id: "sc-atomised",
    label: "Atomised",
    tag: "Study Beats",
    theme: "lofi",
    trackId: "296",
    trackUrl: "https://api.soundcloud.com/tracks/296",
    artworkUrl: "https://i1.sndcdn.com/artworks-000067273344-qyp37r-t500x500.jpg",
    artist: "Forss",
    genreKeys: ["study beats", "스터디", "로파이", "lofi", "집중", "focus", "공부", "beats"],
    krVerified: true
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
    genreKeys: ["감성", "로파이", "lofi", "study", "스터디", "mood", "indie"],
    krVerified: true
  },
  {
    id: "sc-funk-nerds",
    label: "Funk for Nerds",
    tag: "비즈니스",
    theme: "business",
    trackId: "292",
    trackUrl: "https://api.soundcloud.com/tracks/292",
    artworkUrl: "https://i1.sndcdn.com/artworks-000067273305-sndpvm-t500x500.jpg",
    artist: "Forss",
    genreKeys: ["비즈니스", "business", "업비트", "funk", "에너지", "work", "오피스", "groovy"],
    krVerified: true
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
    genreKeys: ["비즈니스", "business", "corporate", "오피스", "work", "미팅"],
    krVerified: true
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
    genreKeys: ["포커스", "focus", "집중", "비즈니스", "productivity", "work"],
    krVerified: true
  },
  {
    id: "sc-flickermood",
    label: "Flickermood",
    tag: "앰비언트",
    theme: "ambient",
    trackId: "293",
    trackUrl: "https://api.soundcloud.com/tracks/293",
    artworkUrl: "https://i1.sndcdn.com/artworks-000067273316-smsiqx-t500x500.jpg",
    artist: "Forss",
    genreKeys: ["앰비언트", "ambient", "힐링", "calm", "relax", "명상", "sleep"],
    krVerified: true
  },
  {
    id: "sc-inversion",
    label: "Lost Through Inversion",
    tag: "앰비언트",
    theme: "ambient",
    trackId: "298",
    trackUrl: "https://api.soundcloud.com/tracks/298",
    artworkUrl: "https://i1.sndcdn.com/artworks-000067273355-i8z5ni-t500x500.jpg",
    artist: "Forss",
    genreKeys: ["앰비언트", "ambient", "딥", "명상", "calm", "drone"],
    krVerified: true
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
    genreKeys: ["힐링", "앰비언트", "ambient", "relax", "calm", "명상", "nature"],
    krVerified: true
  }
];

/** 상단 태그 큐레이션 (#카페감성 등) — KR 확인 풀만 연결 */
export const SHOWCASE_BGM_TAG_CURATIONS = [
  { id: "all", label: "#전체", theme: "all" },
  { id: "cafe", label: "#카페감성", theme: "cafe" },
  { id: "lofi", label: "#로파이", theme: "lofi" },
  { id: "business", label: "#비즈니스", theme: "business" },
  { id: "ambient", label: "#앰비언트", theme: "ambient" },
  { id: "study", label: "#StudyBeats", theme: "lofi", genreBoost: "study beats" }
];

/** @deprecated use SHOWCASE_BGM_TAG_CURATIONS */
export const SHOWCASE_BGM_GENRE_CHIPS = SHOWCASE_BGM_TAG_CURATIONS.map((t) => ({
  id: t.id,
  label: t.label.replace(/^#/, ""),
  query: t.genreBoost || t.theme
}));

/**
 * @param {{ theme?: string, limit?: number, genreBoost?: string }} [opts]
 */
export function getWeeklyReelsBgmChart(opts = {}) {
  const limit = Math.min(20, Math.max(4, Number(opts.limit) || 12));
  const theme = String(opts.theme || "all");
  const boost = String(opts.genreBoost || "")
    .trim()
    .toLowerCase();

  let pool =
    theme === "all"
      ? [...REELS_BGM_CHART_POOL]
      : REELS_BGM_CHART_POOL.filter((t) => t.theme === theme && t.krVerified);

  if (boost) {
    const boosted = pool.filter((t) =>
      (t.genreKeys || []).some((k) => k.toLowerCase().includes(boost) || boost.includes(k.toLowerCase()))
    );
    if (boosted.length) pool = boosted;
  }

  const source = pool.length ? pool : REELS_BGM_CHART_POOL.filter((t) => t.krVerified);
  const week = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000));
  const start = source.length ? ((week % source.length) + source.length) % source.length : 0;
  const rotated = source.length ? [...source.slice(start), ...source.slice(0, start)] : [];
  return rotated.slice(0, limit).map((t, i) => ({
    ...t,
    rank: i + 1,
    tag: `#${t.tag}`
  }));
}

export function getReelsChartTrackById(id) {
  return REELS_BGM_CHART_POOL.find((t) => t.id === id && t.krVerified) || null;
}

/**
 * 장르 자유 검색 — 제공 태그 외 키워드도 KR 확인 풀 안에서만 매칭
 * @param {string} query
 * @param {{ limit?: number }} [opts]
 */
export function searchShowcaseBgmByGenre(query, opts = {}) {
  const q = String(query || "")
    .trim()
    .toLowerCase()
    .replace(/^#/, "");
  const limit = Math.min(12, Math.max(1, Number(opts.limit) || 8));
  const pool = REELS_BGM_CHART_POOL.filter((t) => t.krVerified);

  if (!q) {
    return getWeeklyReelsBgmChart({ theme: "all", limit });
  }

  const scored = pool
    .map((t) => {
      const hay = [t.label, t.tag, t.theme, t.artist, ...(t.genreKeys || [])].join(" ").toLowerCase();
      let score = 0;
      if (hay.includes(q)) score += 12;
      for (const part of q.split(/[\s,/]+/).filter(Boolean)) {
        if (hay.includes(part)) score += 5;
        if ((t.genreKeys || []).some((k) => {
          const kk = k.toLowerCase();
          return kk === part || kk.includes(part) || part.includes(kk);
        })) {
          score += 8;
        }
      }
      return { t, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  const list = scored.map((x) => x.t).slice(0, limit);
  return list.map((t, i) => ({
    ...t,
    rank: i + 1,
    tag: `#${t.tag}`
  }));
}

/** @param {ReelsChartTrack[]} list @param {string} currentId */
export function getNextAvailableBgmTrack(list, currentId) {
  if (!list?.length) return null;
  const start = Math.max(0, list.findIndex((t) => t.id === currentId));
  for (let i = 1; i <= list.length; i += 1) {
    const t = list[(start + i) % list.length];
    if (t && t.id !== currentId) return t;
  }
  return null;
}
