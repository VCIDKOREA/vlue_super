/**
 * 쇼케이스 BGM 재생 — 잠금화면·알림 미디어 컨트롤 (Media Session API)
 * 앨범 아rt = 해당 쇼케이스 유저 프로필 사진
 */
import { apiUrl } from "../apiBase.js";
import { formatLetteringPhoneDisplay } from "../letteringPhoneMatch.js";
import { resolveActivePlaylistTrack } from "./showcaseBgmPresets.js";

function absMediaArtUrl(raw) {
  const u = String(raw || "").trim();
  if (!u) return "";
  if (/^(https?:|blob:|data:)/i.test(u)) return u;
  if (u.startsWith("//")) {
    const proto = typeof window !== "undefined" ? window.location.protocol : "https:";
    return `${proto}${u}`;
  }
  if (typeof window !== "undefined" && u.startsWith("/")) {
    return `${window.location.origin}${u}`;
  }
  return apiUrl(u.startsWith("api/") ? `/${u}` : u);
}

/**
 * @param {{
 *   peer?: { name?: string, phone?: string, photoUrl?: string, avatarUrl?: string, handle?: string, publicHandle?: string } | null,
 *   styleConfig?: object | null,
 *   trackIndex?: number,
 *   visitSessionKey?: string,
 *   playing?: boolean
 * }} input
 */
export function syncShowcaseBgmMediaSession(input = {}) {
  if (typeof navigator === "undefined" || !navigator.mediaSession?.MediaMetadata) return;
  if (!input.playing) {
    clearShowcaseBgmMediaSession();
    return;
  }

  const peer = input.peer || {};
  const styleConfig = input.styleConfig || null;
  const bgm = styleConfig?.bgm;
  const active =
    resolveActivePlaylistTrack(bgm, input.visitSessionKey || "", input.trackIndex ?? 0) || bgm || {};

  const name = String(peer.name || peer.displayName || "").trim();
  const phone =
    formatLetteringPhoneDisplay(peer.phone || "") || String(peer.phone || "").trim();
  const handle = String(peer.handle || peer.publicHandle || "")
    .replace(/^@+/, "")
    .trim();

  const title = name || (handle ? `@${handle}` : "") || "VLUE Showcase";
  const trackTitle = String(active.title || bgm?.title || "").trim();
  const artist = trackTitle || phone || "VLUE Showcase BGM";
  const photo = absMediaArtUrl(peer.photoUrl || peer.avatarUrl);

  /** @type {MediaMetadataInit} */
  const meta = {
    title,
    artist,
    album: phone ? `VLUE Showcase · ${phone}` : "VLUE Showcase"
  };

  if (photo) {
    meta.artwork = [
      { src: photo, sizes: "96x96", type: "image/jpeg" },
      { src: photo, sizes: "256x256", type: "image/jpeg" },
      { src: photo, sizes: "512x512", type: "image/jpeg" }
    ];
  }

  try {
    navigator.mediaSession.metadata = new MediaMetadata(meta);
  } catch {
    /* WebView 구버전 등 */
  }
}

export function clearShowcaseBgmMediaSession() {
  if (typeof navigator === "undefined" || !navigator.mediaSession) return;
  try {
    navigator.mediaSession.metadata = null;
  } catch {
    /* ignore */
  }
}
