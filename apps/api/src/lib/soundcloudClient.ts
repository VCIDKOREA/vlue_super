/**
 * SoundCloud api-v2 클라이언트 (서버)
 * SOUNDCLOUD_CLIENT_ID 환경변수 우선, 없으면 공개 페이지에서 client_id 캐시 추출
 */

let cachedClientId = "";
let cachedAt = 0;
const CLIENT_ID_TTL_MS = 6 * 60 * 60 * 1000;

const CLIENT_ID_RE = /client_id["'\s:=]+([a-zA-Z0-9]{16,40})/i;

export function getSoundCloudClientIdFromEnv() {
  return String(process.env.SOUNDCLOUD_CLIENT_ID || "").trim();
}

async function extractClientIdFromSoundCloud(): Promise<string> {
  const res = await fetch("https://soundcloud.com", {
    headers: {
      Accept: "text/html",
      "User-Agent": "VLUE-SoundCloud-BGM/1.0"
    }
  });
  if (!res.ok) throw new Error(`soundcloud_home_${res.status}`);
  const html = await res.text();
  const inline = html.match(CLIENT_ID_RE);
  if (inline?.[1]) return inline[1];

  const scriptUrls = [...html.matchAll(/src="(https:\/\/[^"]+sndcdn\.com[^"]+\.js)"/g)].map((m) => m[1]);
  for (const url of scriptUrls.slice(0, 8)) {
    try {
      const jsRes = await fetch(url, {
        headers: { "User-Agent": "VLUE-SoundCloud-BGM/1.0" }
      });
      if (!jsRes.ok) continue;
      const js = await jsRes.text();
      const m = js.match(CLIENT_ID_RE);
      if (m?.[1]) return m[1];
    } catch {
      /* try next */
    }
  }
  throw new Error("soundcloud_client_id_not_found");
}

export async function resolveSoundCloudClientId(): Promise<string> {
  const fromEnv = getSoundCloudClientIdFromEnv();
  if (fromEnv) return fromEnv;
  if (cachedClientId && Date.now() - cachedAt < CLIENT_ID_TTL_MS) return cachedClientId;
  const id = await extractClientIdFromSoundCloud();
  cachedClientId = id;
  cachedAt = Date.now();
  return id;
}

export type SoundCloudTrackDto = {
  id: string;
  trackId: string;
  trackUrl: string;
  title: string;
  artist: string;
  artworkUrl: string;
  playbackCount: number;
  permalinkUrl: string;
};

function artwork500(url: string) {
  const u = String(url || "");
  if (!u) return "";
  return u.replace("-large", "-t500x500").replace("-badge", "-t500x500");
}

/** @param {any} raw */
export function normalizeSoundCloudTrack(raw: any): SoundCloudTrackDto | null {
  if (!raw || raw.kind === "playlist") return null;
  const id = String(raw.id || "").trim();
  if (!id) return null;
  const policy = String(raw.policy || "").toUpperCase();
  if (policy === "BLOCK" || policy === "SNIP") return null;
  if (raw.streamable === false) return null;
  const title = String(raw.title || "").trim();
  if (!title) return null;
  const artist = String(raw.user?.username || raw.user?.full_name || "").trim();
  const permalink =
    String(raw.permalink_url || "").trim() || `https://api.soundcloud.com/tracks/${id}`;
  return {
    id: `sc-${id}`,
    trackId: id,
    trackUrl: `https://api.soundcloud.com/tracks/${id}`,
    title,
    artist,
    artworkUrl: artwork500(raw.artwork_url || raw.user?.avatar_url || ""),
    playbackCount: Number(raw.playback_count) || 0,
    permalinkUrl: permalink
  };
}

/**
 * api-v2 검색 후 playback_count 인기순 정렬
 */
export async function searchSoundCloudTracksPopular(
  query: string,
  opts: { limit?: number; fetchLimit?: number } = {}
): Promise<SoundCloudTrackDto[]> {
  const q = String(query || "").trim();
  if (!q) return [];
  const limit = Math.min(50, Math.max(1, Number(opts.limit) || 30));
  const fetchLimit = Math.min(50, Math.max(limit, Number(opts.fetchLimit) || Math.max(limit, 40)));
  const clientId = await resolveSoundCloudClientId();
  const url = new URL("https://api-v2.soundcloud.com/search/tracks");
  url.searchParams.set("q", q);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("limit", String(fetchLimit));
  url.searchParams.set("offset", "0");
  url.searchParams.set("app_locale", "ko");

  const res = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
      "User-Agent": "VLUE-SoundCloud-BGM/1.0",
      Origin: "https://soundcloud.com",
      Referer: "https://soundcloud.com/"
    }
  });
  if (!res.ok) {
    const err = new Error(`soundcloud_search_${res.status}`);
    (err as Error & { status?: number }).status = res.status;
    throw err;
  }
  const data = (await res.json()) as { collection?: unknown[] };
  const collection = Array.isArray(data.collection) ? data.collection : [];
  const mapped = collection
    .map((row) => normalizeSoundCloudTrack(row))
    .filter((t): t is SoundCloudTrackDto => Boolean(t));

  mapped.sort((a, b) => b.playbackCount - a.playbackCount);
  /* 중복 제거 */
  const seen = new Set<string>();
  const unique: SoundCloudTrackDto[] = [];
  for (const t of mapped) {
    if (seen.has(t.trackId)) continue;
    seen.add(t.trackId);
    unique.push(t);
    if (unique.length >= limit) break;
  }
  return unique;
}
