import { apiUrl } from "../apiBase.js";
import {
  SOUNDCLOUD_CURATION_LIMIT,
  SOUNDCLOUD_GENRE_CURATIONS,
  SOUNDCLOUD_SEARCH_LIMIT
} from "./showcaseBgmGenres.js";
import { isShowcaseBgmBlocked } from "./showcaseBgmBlocked.js";

/**
 * @typedef {{
 *   id: string,
 *   trackId: string,
 *   trackUrl: string,
 *   title: string,
 *   artist: string,
 *   artworkUrl: string,
 *   playbackCount?: number,
 *   label?: string,
 *   tag?: string,
 *   kind?: string
 * }} ShowcaseScTrack
 */

function filterBlocked(tracks) {
  return (tracks || []).filter(
    (t) =>
      t &&
      !isShowcaseBgmBlocked(t.trackId) &&
      !isShowcaseBgmBlocked(t.trackUrl) &&
      !isShowcaseBgmBlocked(t.id)
  );
}

function toPickerTrack(t, rank = 0) {
  return {
    id: t.id || `sc-${t.trackId}`,
    trackId: String(t.trackId || ""),
    trackUrl: t.trackUrl || `https://api.soundcloud.com/tracks/${t.trackId}`,
    label: t.title || t.label || "SoundCloud",
    title: t.title || t.label || "SoundCloud",
    artist: t.artist || "",
    artworkUrl: t.artworkUrl || "",
    playbackCount: Number(t.playbackCount) || 0,
    tag: t.tag || "",
    kind: "soundcloud",
    rank: rank || undefined
  };
}

/**
 * 장르별 고정 큐레이션 6곡 (서버: 매핑 쿼리 → 인기순)
 * @param {string} genreId
 */
export async function fetchSoundCloudCuration(genreId) {
  const res = await fetch(apiUrl(`/api/bgm/soundcloud/curation/${encodeURIComponent(genreId)}`), {
    headers: { Accept: "application/json" }
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.ok) {
    throw new Error(data?.message || data?.error || `curation_failed_${res.status}`);
  }
  const tracks = filterBlocked(data.tracks || [])
    .slice(0, SOUNDCLOUD_CURATION_LIMIT)
    .map((t, i) => toPickerTrack(t, i + 1));
  return {
    genre: data.genre || SOUNDCLOUD_GENRE_CURATIONS.find((g) => g.id === genreId) || null,
    tracks
  };
}

/**
 * 자유 검색 — 인기순, 기본 30곡
 * @param {string} query
 * @param {{ limit?: number }} [opts]
 */
export async function fetchSoundCloudSearchPopular(query, opts = {}) {
  const q = String(query || "").trim();
  if (!q) return { tracks: [], q: "" };
  const limit = Math.min(50, Math.max(20, Number(opts.limit) || SOUNDCLOUD_SEARCH_LIMIT));
  const url = apiUrl(
    `/api/bgm/soundcloud/search?q=${encodeURIComponent(q)}&limit=${limit}`
  );
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.ok) {
    throw new Error(data?.message || data?.error || `search_failed_${res.status}`);
  }
  const tracks = filterBlocked(data.tracks || []).map((t, i) => toPickerTrack(t, i + 1));
  return { q: data.q || q, tracks, sort: "popular" };
}

export { SOUNDCLOUD_GENRE_CURATIONS, SOUNDCLOUD_CURATION_LIMIT, SOUNDCLOUD_SEARCH_LIMIT };
