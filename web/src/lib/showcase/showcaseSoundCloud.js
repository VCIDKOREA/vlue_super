/**
 * SoundCloud Widget embed + oEmbed (쇼케이스 BGM)
 */

const TRACK_ID_RE = /^\d{3,12}$/;
const API_TRACK_RE = /api\.soundcloud\.com\/tracks\/(\d+)/i;
const PERMALINK_HOST = /soundcloud\.com/i;

/** @param {string} raw */
export function extractSoundCloudTrackUrl(raw) {
  const s = String(raw || "").trim();
  if (!s) return "";
  if (TRACK_ID_RE.test(s)) return `https://api.soundcloud.com/tracks/${s}`;
  try {
    const u = new URL(s.startsWith("http") ? s : `https://${s}`);
    if (API_TRACK_RE.test(u.href)) {
      const m = u.href.match(API_TRACK_RE);
      return m ? `https://api.soundcloud.com/tracks/${m[1]}` : "";
    }
    if (PERMALINK_HOST.test(u.hostname) && u.pathname.length > 1) {
      return `https://soundcloud.com${u.pathname.replace(/\/$/, "")}`;
    }
  } catch {
    /* ignore */
  }
  return "";
}

/** @param {string} trackUrlOrId */
export function extractSoundCloudTrackId(trackUrlOrId) {
  const s = String(trackUrlOrId || "").trim();
  if (TRACK_ID_RE.test(s)) return s;
  const m = s.match(API_TRACK_RE);
  if (m) return m[1];
  return "";
}

/**
 * @param {string} trackUrl
 * @param {{ autoPlay?: boolean, visual?: boolean, hideUi?: boolean }} [opts]
 */
export function buildSoundCloudEmbedUrl(trackUrl, opts = {}) {
  const url = extractSoundCloudTrackUrl(trackUrl) || trackUrl;
  if (!url) return "";
  const params = new URLSearchParams({
    url,
    color: "#2b6ff0",
    auto_play: opts.autoPlay === false ? "false" : "true",
    hide_related: "true",
    show_comments: "false",
    show_user: opts.hideUi ? "false" : "true",
    show_reposts: "false",
    show_teaser: "false",
    visual: opts.visual === false ? "false" : "true",
    buying: "false",
    sharing: "false",
    download: "false",
    liking: "false",
    show_playcount: "false",
    show_artwork: opts.hideUi ? "false" : "true"
  });
  return `https://w.soundcloud.com/player/?${params.toString()}`;
}

/** @returns {Promise<typeof window.SC | null>} */
export function loadSoundCloudWidgetApi() {
  if (typeof window === "undefined") return Promise.resolve(null);
  if (window.SC?.Widget) return Promise.resolve(window.SC);
  return new Promise((resolve) => {
    const existing = document.querySelector('script[data-vlue-sc-api="1"]');
    if (existing) {
      existing.addEventListener("load", () => resolve(window.SC || null), { once: true });
      existing.addEventListener("error", () => resolve(null), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = "https://w.soundcloud.com/player/api.js";
    script.async = true;
    script.dataset.vlueScApi = "1";
    script.onload = () => resolve(window.SC || null);
    script.onerror = () => resolve(null);
    document.head.appendChild(script);
  });
}

/**
 * @param {string} trackUrlOrId
 * @returns {Promise<{ trackUrl: string, trackId: string, title: string, artist: string, artworkUrl: string } | null>}
 */
export async function fetchSoundCloudMeta(trackUrlOrId) {
  const trackUrl = extractSoundCloudTrackUrl(trackUrlOrId);
  if (!trackUrl) return null;
  const trackId = extractSoundCloudTrackId(trackUrl);
  try {
    const res = await fetch(
      `https://soundcloud.com/oembed?format=json&url=${encodeURIComponent(trackUrl)}`
    );
    if (!res.ok) {
      return {
        trackUrl,
        trackId,
        title: "SoundCloud BGM",
        artist: "",
        artworkUrl: ""
      };
    }
    const data = await res.json();
    const artworkUrl = String(data.thumbnail_url || "");
    const placeholder = artworkUrl.includes("fb_placeholder");
    return {
      trackUrl,
      trackId,
      title: String(data.title || "SoundCloud BGM").replace(/\s+by\s+.+$/i, "").trim() || "SoundCloud BGM",
      artist: String(data.author_name || ""),
      artworkUrl: placeholder ? "" : artworkUrl
    };
  } catch {
    return { trackUrl, trackId, title: "SoundCloud BGM", artist: "", artworkUrl: "" };
  }
}
