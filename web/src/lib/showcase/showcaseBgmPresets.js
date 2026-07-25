/**
 * 쇼케이스 BGM — VLUE Signature / User Original / 퍼가기
 * SoundCloud·YouTube UI 경로 제거. 재생은 audioUrl(MP3 등) 직접 재생.
 */

export const BGM_VOLUME_LEVELS = [
  { id: "soft", label: "작게", gain: 0.35 },
  { id: "medium", label: "중간", gain: 0.7 },
  { id: "loud", label: "크게", gain: 1 }
];

export const BGM_PLAY_MODES = [
  { id: "single", label: "선택곡 단독" },
  { id: "order", label: "선택곡 순서재생" },
  { id: "shuffle_selected", label: "선택곡 셔플" }
];

export function createEmptyShowcaseBgm() {
  return {
    mode: "none",
    soundId: "",
    title: "",
    artistName: "",
    audioUrl: "",
    attributionLabel: "",
    linkBroken: false,
    ownerHandle: "",
    sharedOwnerHandle: "",
    createType: "",
    volumeLevel: "medium",
    playMode: "single",
    /** @type {Array<{soundId:string,title:string,audioUrl:string,mode:string,attributionLabel:string,ownerHandle?:string,sharedOwnerHandle?:string,createType?:string}>} */
    playlist: []
  };
}

export function normalizeBgmVolumeLevel(level) {
  const id = String(level || "medium").toLowerCase();
  if (id === "soft" || id === "loud" || id === "medium") return id;
  return "medium";
}

export function resolveBgmVolumeGain(styleConfig) {
  const level = normalizeBgmVolumeLevel(styleConfig?.bgm?.volumeLevel);
  return BGM_VOLUME_LEVELS.find((v) => v.id === level)?.gain ?? 0.7;
}

function readLocalHandle() {
  try {
    return String(localStorage.getItem("vlue_member_handle") || "")
      .replace(/^@/, "")
      .trim();
  } catch {
    return "";
  }
}

/**
 * 칩/시트용 흘러가는 문구 (🎵 제외)
 * - Original: (제목) : (@id) Original Sound · AI Generated
 * - Shared: (제목)(@sharedId) Original Sound · Shared Track
 */
export function resolveShowcaseBgmMarqueeText(styleConfig, visitSessionKey = "", trackIndex = 0) {
  const bgm = styleConfig?.bgm;
  if (!bgm || bgm.mode === "none") return "";
  if (bgm.linkBroken) return "연결이 끊긴 음원";

  const active = resolveActivePlaylistTrack(bgm, visitSessionKey, trackIndex) || bgm;
  const title = String(active.title || bgm.title || "").trim() || "제목 없음";
  const attr = String(active.attributionLabel || bgm.attributionLabel || "").trim();
  const mode = active.mode || bgm.mode;
  const own =
    String(active.ownerHandle || bgm.ownerHandle || "")
      .replace(/^@/, "")
      .trim() || readLocalHandle();
  const shared = String(active.sharedOwnerHandle || bgm.sharedOwnerHandle || "")
    .replace(/^@/, "")
    .trim();

  if (mode === "borrowed") {
    const who = shared ? `@${shared}` : "@user";
    return `${title}(${who}) Original Sound · Shared Track`;
  }
  if (mode === "signature") {
    return `${title} · VLUE Signature Sound${attr ? ` · ${attr}` : ""}`;
  }
  const id = own ? `@${own}` : "@user";
  const typeLabel = attr || "Original Sound";
  return `${title} : ${id} Original Sound · ${typeLabel}`;
}

/**
 * @param {import('./showcaseStyleStorage.js').ShowcaseStyleConfig | null | undefined} styleConfig
 * @param {string} [visitSessionKey] 쇼케이스 입장 세션 — 셔플 고정용
 * @param {number} [trackIndex]
 */
export function resolveShowcaseBgmUrl(styleConfig, visitSessionKey = "", trackIndex = 0) {
  const bgm = styleConfig?.bgm;
  if (!bgm || bgm.mode === "none" || bgm.linkBroken) return "";
  const active = resolveActivePlaylistTrack(bgm, visitSessionKey, trackIndex);
  const url = String(active?.audioUrl || bgm.audioUrl || "").trim();
  if (url) return url;
  return "";
}

/** 재생 URL이 없어도 soundId·메타가 있으면 BGM 슬롯 표시 (케이스함·피어 열람) */
export function hasShowcaseBgmConfigured(styleConfig) {
  const bgm = styleConfig?.bgm;
  if (!bgm || bgm.mode === "none" || bgm.linkBroken) return false;
  if (String(bgm.audioUrl || "").trim()) return true;
  if (String(bgm.soundId || "").trim()) return true;
  if (Array.isArray(bgm.playlist) && bgm.playlist.some((t) => t?.soundId || t?.audioUrl)) return true;
  if (String(bgm.title || "").trim()) return true;
  return false;
}

/** 실제로 재생 가능한 audioUrl 이 있는지 (제목만 있는 설정은 false) */
export function hasPlayableShowcaseBgm(styleConfig) {
  const bgm = styleConfig?.bgm;
  if (!bgm || bgm.mode === "none" || bgm.linkBroken) return false;
  if (String(bgm.audioUrl || "").trim()) return true;
  if (Array.isArray(bgm.playlist) && bgm.playlist.some((t) => String(t?.audioUrl || "").trim())) {
    return true;
  }
  return false;
}

/** @param {import('./showcaseStyleStorage.js').ShowcaseStyleConfig | null | undefined} styleConfig */
export function resolveShowcaseBgmLabel(styleConfig) {
  const line = resolveShowcaseBgmMarqueeText(styleConfig);
  if (line) return line;
  const bgm = styleConfig?.bgm;
  if (!bgm || bgm.mode === "none") return "";
  if (bgm.linkBroken) return "연결이 끊긴 음원";
  const title = String(bgm.title || "").trim();
  const artist = String(bgm.artistName || "").trim();
  if (title && artist) return `${title} · ${artist}`;
  return title || artist || "배경음악";
}

/**
 * 재생에 쓸 트랙 목록
 * - 재생목록 2곡 이상 → 항상 목록 큐 (단독 모드로 남아 있어도 스킵·연속재생 가능)
 * - order / shuffle_selected → 재생목록(없으면 주제곡)
 * - single + 목록 0~1곡 → 주제곡만
 */
export function resolvePlaylistTracks(bgm) {
  if (!bgm || bgm.mode === "none") return [];
  const mode = String(bgm.playMode || "single");
  const list = Array.isArray(bgm.playlist)
    ? bgm.playlist.filter((t) => t?.audioUrl && !t.linkBroken)
    : [];
  const themeTrack = () => {
    const url = String(bgm.audioUrl || "").trim();
    if (!url || bgm.linkBroken) return [];
    return [
      {
        soundId: bgm.soundId,
        title: bgm.title,
        audioUrl: url,
        mode: bgm.mode,
        attributionLabel: bgm.attributionLabel,
        ownerHandle: bgm.ownerHandle,
        sharedOwnerHandle: bgm.sharedOwnerHandle,
        createType: bgm.createType
      }
    ];
  };
  /* 선곡 2곡 이상이면 모드와 무관하게 재생목록 사용 — ◀▶ 활성 */
  if (list.length > 1) return list;
  if ((mode === "order" || mode === "shuffle_selected") && list.length) return list;
  return themeTrack();
}

export function resolveActivePlaylistTrack(bgm, sessionKey = "", trackIndex = 0) {
  if (!bgm || bgm.mode === "none") return null;
  const list = resolvePlaylistTracks(bgm);
  if (!list.length) return null;
  if (list.length <= 1) return list[0];
  /* 스킵·연속재생으로 갱신된 trackIndex 우선 */
  if (typeof trackIndex === "number" && trackIndex >= 0 && trackIndex < list.length) {
    return list[trackIndex];
  }
  const mode = String(bgm.playMode || "single");
  if (mode === "order" || mode === "single") return list[0];
  /* shuffle — trackIndex 없을 때만 세션 해시로 시작 곡 */
  const seed = String(sessionKey || Date.now());
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return list[hash % list.length];
}

/** 세션 시드 기반 인덱스 셔플 (Fisher–Yates) */
export function buildShuffledTrackOrder(length, sessionKey = "") {
  const n = Math.max(0, Number(length) || 0);
  const order = Array.from({ length: n }, (_, i) => i);
  if (n <= 1) return order;
  let h = 2166136261;
  const seed = String(sessionKey || "shuffle");
  for (let i = 0; i < seed.length; i += 1) {
    h = Math.imul(h ^ seed.charCodeAt(i), 16777619) >>> 0;
  }
  for (let i = n - 1; i > 0; i -= 1) {
    h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
    const j = h % (i + 1);
    const tmp = order[i];
    order[i] = order[j];
    order[j] = tmp;
  }
  return order;
}

export function initialPlaylistIndex(bgm, sessionKey = "") {
  const list = resolvePlaylistTracks(bgm);
  if (list.length <= 1) return 0;
  const mode = String(bgm?.playMode || "single");
  if (mode === "shuffle_selected") {
    const order = buildShuffledTrackOrder(list.length, sessionKey);
    return order[0] ?? 0;
  }
  return 0;
}

/**
 * 여러 곡을 이어서 재생하는 모드인지 (loop 끄고 ended 시 다음 곡)
 */
export function isPlaylistAdvanceMode(bgm) {
  const tracks = resolvePlaylistTracks(bgm);
  if (tracks.length <= 1) return false;
  const mode = String(bgm?.playMode || "single");
  /* 재생목록이 여러 곡이면 단독으로 남아 있어도 끝나면 다음 곡 */
  if (tracks.length > 1) return true;
  return mode === "order" || mode === "shuffle_selected";
}

export function isDirectAudioBgmMode(styleConfig) {
  const mode = styleConfig?.bgm?.mode;
  return mode === "signature" || mode === "user" || mode === "borrowed";
}

/** @deprecated SoundCloud 제거 */
export function isSoundCloudBgmMode() {
  return false;
}

/** @deprecated YouTube 피커 제거 */
export function isYoutubeBgmMode() {
  return false;
}

export function resolveShowcaseSoundCloudTrackUrl() {
  return "";
}

export function resolveShowcaseYoutubeVideoId() {
  return "";
}

export function getBgmPresetById() {
  return null;
}

export function resolveShowcasePresetBgmUrl() {
  return null;
}

export const SHOWCASE_BGM_PRESETS = [];
