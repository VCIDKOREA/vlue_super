import { Hono } from "hono";

/**
 * 쇼케이스 BGM — SoundHelix 공개 MP3 프록시
 * mount: apiRoutes.route("/bgm", publicBgmRoutes)
 * → GET /api/bgm/:n  (n = 1..10)
 */
export const publicBgmRoutes = new Hono();

const HELIX_BASE = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-";

publicBgmRoutes.get("/", (c) =>
  c.json({
    ok: true,
    service: "vlue-bgm",
    songs: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => `/api/bgm/${n}`)
  })
);

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
