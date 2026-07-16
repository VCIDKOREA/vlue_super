/**
 * YouTube iframe Embed — 쇼케이스 BGM (공식 embed, 사용자 지정)
 */
import { getBgmPresetById } from "./showcaseBgmPresets.js";

const YT_ID_RE = /^[a-zA-Z0-9_-]{11}$/;

/** @param {string} raw */
export function extractYoutubeVideoId(raw) {
  const s = String(raw || "").trim();
  if (!s) return "";
  if (YT_ID_RE.test(s)) return s;
  try {
    const u = new URL(s.startsWith("http") ? s : `https://${s}`);
    if (u.hostname.includes("youtu.be")) return u.pathname.slice(1).split("/")[0] || "";
    if (u.hostname.includes("youtube.com")) {
      const v = u.searchParams.get("v");
      if (v) return v;
      const embed = u.pathname.match(/\/embed\/([^/?#]+)/);
      if (embed) return embed[1];
      const shorts = u.pathname.match(/\/shorts\/([^/?#]+)/);
      if (shorts) return shorts[1];
    }
  } catch {
    /* ignore */
  }
  return "";
}

/** 키워드 → 큐레이션 매칭 (YouTube Audio Library 스타일 무료곡 ID) */
const YOUTUBE_KEYWORD_CURATED = [
  { keys: ["카페", "kpop", "피아노", "감성"], videoId: "M7lc1UVf-VE", title: "Ambient Piano Cover", artist: "YouTube Audio Library" },
  { keys: ["비즈니스", "신뢰", "corporate", "업무"], videoId: "htXuwXA5mxk", title: "Corporate Trust", artist: "YouTube Audio Library" },
  { keys: ["로파이", "lofi", "공부", "집중"], videoId: "5qap5aO4i9A", title: "Lofi Beats", artist: "YouTube Audio Library" },
  { keys: ["잔잔", "힐링", "명상", "calm"], videoId: "n61ULEU7CO0", title: "Calm Ambient", artist: "YouTube Audio Library" },
  { keys: ["재즈", "jazz", "브런치"], videoId: "Dx5iJTaoZuw", title: "Soft Jazz", artist: "YouTube Audio Library" }
];

/** @param {string} query */
export function matchYoutubeByKeyword(query) {
  const q = String(query || "").trim().toLowerCase();
  if (!q) return null;
  for (const row of YOUTUBE_KEYWORD_CURATED) {
    if (row.keys.some((k) => q.includes(k.toLowerCase()))) return row;
  }
  return null;
}

/**
 * @param {string} videoId
 * @param {{ muted?: boolean, autoplay?: boolean, loop?: boolean }} opts
 */
export function buildYoutubeEmbedUrl(videoId, opts = {}) {
  const id = extractYoutubeVideoId(videoId) || videoId;
  if (!id) return "";
  const params = new URLSearchParams({
    autoplay: opts.autoplay === false ? "0" : "1",
    mute: opts.muted ? "1" : "0",
    controls: "0",
    modestbranding: "1",
    rel: "0",
    playsinline: "1",
    loop: opts.loop === false ? "0" : "1",
    playlist: opts.loop !== false ? id : "",
    enablejsapi: "1",
    origin: typeof window !== "undefined" ? window.location.origin : "https://www.vlue.kr"
  });
  return `https://www.youtube-nocookie.com/embed/${id}?${params}`;
}

/**
 * YouTube IFrame API postMessage (enablejsapi=1 필요)
 * @param {HTMLIFrameElement | null} iframe
 * @param {string} func
 * @param {unknown[]} [args]
 */
export function postYoutubeCommand(iframe, func, args = []) {
  if (!iframe?.contentWindow) return;
  try {
    iframe.contentWindow.postMessage(
      JSON.stringify({ event: "command", func, args }),
      "*"
    );
  } catch {
    /* ignore */
  }
}

/** @param {string} videoIdOrUrl */
export async function fetchYoutubeMeta(videoIdOrUrl) {
  const id = extractYoutubeVideoId(videoIdOrUrl) || videoIdOrUrl;
  if (!id) return null;
  const watchUrl = `https://www.youtube.com/watch?v=${id}`;
  try {
    const res = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(watchUrl)}&format=json`);
    if (!res.ok) return { videoId: id, title: "YouTube BGM", artist: "" };
    const data = await res.json();
    const title = String(data.title || "YouTube BGM");
    const artist = String(data.author_name || "");
    return { videoId: id, title, artist };
  } catch {
    return { videoId: id, title: "YouTube BGM", artist: "" };
  }
}

/** @param {import('./showcaseStyleStorage.js').ShowcaseStyleConfig} styleConfig */
export function resolveShowcaseBgmLabel(styleConfig) {
  const bgm = styleConfig?.bgm;
  if (!bgm) return "";
  if (bgm.mode === "soundcloud" && (bgm.soundcloud?.trackUrl || bgm.soundcloud?.title)) {
    const t = bgm.soundcloud.title || "SoundCloud BGM";
    const a = bgm.soundcloud.artist || "";
    return a ? `${t} — ${a}` : t;
  }
  if (bgm.mode === "preset") {
    const p = getBgmPresetById(bgm.presetId);
    if (!p) return "";
    if (p.kind === "soundcloud" || p.kind === "youtube") {
      return p.artist ? `${p.label} — ${p.artist}` : `${p.label} · ${p.tag}`;
    }
    return `${p.label} · ${p.tag}`;
  }
  if (bgm.mode === "youtube" && bgm.youtube?.videoId) {
    const t = bgm.youtube.title || "YouTube BGM";
    const a = bgm.youtube.artist || "";
    return a ? `${t} - ${a}` : t;
  }
  return "";
}
