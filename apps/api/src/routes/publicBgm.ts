import { Hono } from "hono";

/**
 * 레거시 SoundHelix MP3 프록시만 유지.
 * SoundCloud 라이브 검색/큐레이션은 제거됨 → VLUE Signature / User Original (`/api/showcase-sounds`).
 */
export const publicBgmRoutes = new Hono();

const HELIX_BASE = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-";

publicBgmRoutes.get("/", (c) =>
  c.json({
    ok: true,
    service: "vlue-bgm-legacy",
    songs: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => `/api/bgm/${n}`),
    showcaseSounds: "/api/showcase-sounds"
  })
);

publicBgmRoutes.get("/:n", async (c) => {
  const n = Number.parseInt(String(c.req.param("n") || ""), 10);
  if (!Number.isFinite(n) || n < 1 || n > 16) {
    return c.json({ ok: false, error: "invalid song" }, 400);
  }
  const upstream = `${HELIX_BASE}${n}.mp3`;
  const range = c.req.header("range");
  const headers: HeadersInit = {};
  if (range) headers.Range = range;
  const res = await fetch(upstream, { headers });
  if (!res.ok && res.status !== 206) {
    return c.json({ ok: false, error: "upstream_failed" }, 502);
  }
  const out = new Headers();
  out.set("Content-Type", res.headers.get("content-type") || "audio/mpeg");
  out.set("Accept-Ranges", "bytes");
  out.set("Access-Control-Allow-Origin", "*");
  out.set("Cache-Control", "public, max-age=86400");
  const cl = res.headers.get("content-length");
  if (cl) out.set("Content-Length", cl);
  const cr = res.headers.get("content-range");
  if (cr) out.set("Content-Range", cr);
  return new Response(res.body, { status: res.status, headers: out });
});
