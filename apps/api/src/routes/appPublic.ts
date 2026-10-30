import { Hono } from "hono";
import {
  loadAndroidVersionConfig,
  toPublicAndroidVersionPayload
} from "../services/app/androidVersionConfig.js";
import {
  isAllowedSocialPhotoHost,
  normalizeSocialPhotoUrl
} from "../lib/socialPhotoUrl.js";

/** 공개 — 앱 시작 시 최신 버전 확인 */
export const appPublicRoutes = new Hono();

appPublicRoutes.get("/android-version", async (c) => {
  const cfg = await loadAndroidVersionConfig();
  return c.json(toPublicAndroidVersionPayload(cfg));
});

/**
 * 소셜 CDN 프로필 사진 프록시 — 카카오/네이버 핫링크·http 혼합 콘텐츠 우회
 * 허용 호스트만 fetch (SSRF 방지)
 */
appPublicRoutes.get("/social-avatar", async (c) => {
  const raw = String(c.req.query("u") || "").trim();
  const url = normalizeSocialPhotoUrl(raw);
  if (!url || url.startsWith("data:")) {
    return c.text("invalid", 400);
  }
  let host = "";
  try {
    host = new URL(url).hostname;
  } catch {
    return c.text("invalid", 400);
  }
  if (!isAllowedSocialPhotoHost(host)) {
    return c.text("host not allowed", 403);
  }

  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(8000),
      headers: {
        Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Referer: "https://www.vlue.kr/"
      }
    });
    if (!res.ok) {
      return c.text("upstream error", 502);
    }
    const ctype = String(res.headers.get("content-type") || "").toLowerCase();
    if (ctype && !ctype.startsWith("image/") && !ctype.includes("octet-stream")) {
      return c.text("not an image", 502);
    }
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 32 || buf.length > 8_000_000) {
      return c.text("bad size", 502);
    }
    c.header("Content-Type", ctype.startsWith("image/") ? ctype : "image/jpeg");
    c.header("Cache-Control", "public, max-age=86400, stale-while-revalidate=604800");
    c.header("Cross-Origin-Resource-Policy", "cross-origin");
    return c.body(buf);
  } catch {
    return c.text("fetch failed", 502);
  }
});
