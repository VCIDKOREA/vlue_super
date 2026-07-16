import { Hono } from "hono";
import { searchSoundCloudTracksPopular } from "../lib/soundcloudClient.js";
import {
  getSoundCloudGenreById,
  SOUNDCLOUD_CURATION_LIMIT,
  SOUNDCLOUD_GENRE_CURATIONS,
  SOUNDCLOUD_SEARCH_LIMIT
} from "../lib/soundcloudGenreMap.js";

/**
 * 쇼케이스 BGM
 * - GET /api/bgm/:n — SoundHelix MP3 프록시 (레거시)
 * - GET /api/bgm/soundcloud/genres
 * - GET /api/bgm/soundcloud/curation/:genreId — 장르별 고정 6곡 (인기순)
 * - GET /api/bgm/soundcloud/search?q= — 검색 (인기순, 기본 30곡)
 */
export const publicBgmRoutes = new Hono();

const HELIX_BASE = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-";

publicBgmRoutes.get("/", (c) =>
  c.json({
    ok: true,
    service: "vlue-bgm",
    songs: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => `/api/bgm/${n}`),
    soundcloud: {
      genres: "/api/bgm/soundcloud/genres",
      curation: "/api/bgm/soundcloud/curation/:genreId",
      search: "/api/bgm/soundcloud/search?q="
    }
  })
);

publicBgmRoutes.get("/soundcloud/genres", (c) =>
  c.json({
    ok: true,
    curationLimit: SOUNDCLOUD_CURATION_LIMIT,
    searchLimit: SOUNDCLOUD_SEARCH_LIMIT,
    genres: SOUNDCLOUD_GENRE_CURATIONS
  })
);

publicBgmRoutes.get("/soundcloud/curation/:genreId", async (c) => {
  const genreId = String(c.req.param("genreId") || "").trim();
  const genre = getSoundCloudGenreById(genreId);
  if (!genre) {
    return c.json({ ok: false, error: "unknown_genre", genres: SOUNDCLOUD_GENRE_CURATIONS }, 404);
  }
  try {
    const tracks = await searchSoundCloudTracksPopular(genre.query, {
      limit: SOUNDCLOUD_CURATION_LIMIT,
      fetchLimit: 40
    });
    return c.json({
      ok: true,
      genre,
      limit: SOUNDCLOUD_CURATION_LIMIT,
      sort: "popular",
      tracks: tracks.slice(0, SOUNDCLOUD_CURATION_LIMIT)
    });
  } catch (e) {
    const status = (e as { status?: number })?.status;
    return c.json(
      {
        ok: false,
        error: "soundcloud_curation_failed",
        message: e instanceof Error ? e.message : "search_failed",
        status
      },
      502
    );
  }
});

publicBgmRoutes.get("/soundcloud/search", async (c) => {
  const q = String(c.req.query("q") || "").trim();
  if (!q) {
    return c.json({ ok: false, error: "query_required" }, 400);
  }
  const limitRaw = Number.parseInt(String(c.req.query("limit") || SOUNDCLOUD_SEARCH_LIMIT), 10);
  const limit = Math.min(50, Math.max(20, Number.isFinite(limitRaw) ? limitRaw : SOUNDCLOUD_SEARCH_LIMIT));
  try {
    const tracks = await searchSoundCloudTracksPopular(q, {
      limit,
      fetchLimit: Math.min(50, Math.max(limit, 40))
    });
    return c.json({
      ok: true,
      q,
      sort: "popular",
      limit,
      count: tracks.length,
      tracks
    });
  } catch (e) {
    const status = (e as { status?: number })?.status;
    return c.json(
      {
        ok: false,
        error: "soundcloud_search_failed",
        message: e instanceof Error ? e.message : "search_failed",
        status
      },
      502
    );
  }
});

publicBgmRoutes.get("/:n", async (c) => {
  const n = Math.min(10, Math.max(1, Number.parseInt(String(c.req.param("n") || "1"), 10) || 1));
  const upstream = `${HELIX_BASE}${n}.mp3`;

  try {
    const range = c.req.header("range");
    const headers: Record<string, string> = {
      Accept: "audio/mpeg,audio/*,*/*",
      "User-Agent": "VLUE-BGM-Proxy/1.0"
    };
    if (range) headers.Range = range;

    const res = await fetch(upstream, { headers });
    if (!res.ok || !res.body) {
      return c.json({ ok: false, error: "bgm_upstream_failed", status: res.status }, 502);
    }

    const out = new Headers();
    out.set("Content-Type", res.headers.get("content-type") || "audio/mpeg");
    out.set("Cache-Control", "public, max-age=86400, stale-while-revalidate=604800");
    out.set("Access-Control-Allow-Origin", "*");
    out.set("Accept-Ranges", "bytes");
    const len = res.headers.get("content-length");
    if (len) out.set("Content-Length", len);
    const cr = res.headers.get("content-range");
    if (cr) out.set("Content-Range", cr);

    return new Response(res.body, {
      status: res.status,
      headers: out
    });
  } catch (e) {
    return c.json(
      { ok: false, error: "bgm_proxy_error", message: e instanceof Error ? e.message : "fetch_failed" },
      502
    );
  }
});
