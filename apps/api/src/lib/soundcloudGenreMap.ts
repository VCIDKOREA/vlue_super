/**
 * 쇼케이스 BGM 고정 장르 큐레이션 — SoundCloud 검색 키워드 맵
 * (프론트·서버 동일 기준)
 */

export type SoundCloudGenreDef = {
  id: string;
  label: string;
  /** SoundCloud API 고도화 검색 쿼리 */
  query: string;
};

export const SOUNDCLOUD_GENRE_CURATIONS: SoundCloudGenreDef[] = [
  {
    id: "kpop",
    label: "K-POP",
    query: "K-POP, Korean idol music, dance, trending hits, popular"
  },
  {
    id: "classical",
    label: "클래식",
    query: "Classical music, orchestral, chamber, opera, best popular"
  },
  {
    id: "jazz",
    label: "재즈",
    query: "Jazz music, swing, bebop, fusion jazz, relaxing"
  },
  {
    id: "pop",
    label: "팝",
    query: "Dance pop, synth pop, trending hits"
  },
  {
    id: "rock",
    label: "록",
    query: "Hard rock, punk rock, alternative rock"
  },
  {
    id: "hiphop",
    label: "힙합",
    query: "Hip hop, rap, trap, boom bap, trending"
  },
  {
    id: "edm",
    label: "EDM",
    query: "House, techno, trance, tropical house, energetic"
  },
  {
    id: "rnb",
    label: "R&B/소울",
    query: "R&B, Soul music, smooth"
  },
  {
    id: "roots",
    label: "블루스/레게/컨트리/포크",
    query: "Blues, Reggae, Country, Folk music"
  }
];

export const SOUNDCLOUD_CURATION_LIMIT = 6;
export const SOUNDCLOUD_SEARCH_LIMIT = 30;

export function getSoundCloudGenreById(id: string) {
  return SOUNDCLOUD_GENRE_CURATIONS.find((g) => g.id === id) || null;
}
