import { Hono } from "hono";
import {
  getSoundCloudGenreById,
  SOUNDCLOUD_CURATION_LIMIT,
  SOUNDCLOUD_GENRE_CURATIONS,
  SOUNDCLOUD_SEARCH_LIMIT
} from "../lib/soundcloudGenreMap.js";

/**
 * 쇼케이스 BGM
 * - GET /api/bgm/:n — SoundHelix MP3 프록시 (레거시)
 * - SoundCloud 라이브 검색/큐레이션은 비활성 (로컬 카탈로그 전환 예정)
 */
export const publicBgmRoutes = new Hono();

const HELIX_BASE = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-";

const SOUNDCLOUD_DISABLED = {
  ok: false as const,
  error: "soundcloud_api_disabled",
  message: "SoundCloud live search is disabled. Use local BGM catalog."
};

publicBgmRoutes.get("/", (c) =>
  c.json({
    ok: true,
    service: "vlue-bgm",
    songs: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => `/api/bgm/${n}`),
    soundcloud: {
      enabled: false,
      genres: "/api/bgm/soundcloud/genres",
      curation: "/api/bgm/soundcloud/curation/:genreId",
      search: "/api/bgm/soundcloud/search?q="
    }
  })
);

publicBgmRoutes.get("/soundcloud/genres", (c) =>
  c.json({
    ok: true,
    enabled: false,
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
  return c.json(
    {
      ...SOUNDCLOUD_DISABLED,
      genre,
      tracks: []
    },
    503
  );
});

publicBgmRoutes.get("/soundcloud/search", async (c) => {
  const q = String(c.req.query("q") || "").trim();
  if (!q) {
    return c.json({ ok: false, error: "query_required" }, 400);
  }
  return c.json(
    {
      ...SOUNDCLOUD_DISABLED,
      q,
      tracks: []
    },
    503
  );
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
