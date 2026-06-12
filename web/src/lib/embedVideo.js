/** YouTube / Vimeo / TikTok / Live HLS / CDN mp4 — 서버 트래픽 0원 (외부 인프라만 사용) */

const VERTICAL_HINTS = /shorts|tiktok|reels|story|vertical|9x16|portrait/i;

export function detectVideoPlatform(raw) {
  const url = String(raw || "").trim();
  if (!url) return null;
  try {
    const host = new URL(url).hostname.replace(/^www\./, "").toLowerCase();
    if (host.includes("youtube") || host === "youtu.be" || host === "m.youtube.com") return "youtube";
    if (host.includes("instagram")) return "instagram";
    if (host.includes("tiktok")) return "tiktok";
    if (host.includes("vimeo")) return "vimeo";
    if (host.includes("facebook") || host.includes("fb.watch")) return "facebook";
    if (host.includes("supabase") || host.includes("r2.cloudflarestorage") || host.includes("cloudflare")) return "cdn";
    if (/\.m3u8|hls|live/i.test(url)) return "hls";
  } catch {
    return null;
  }
  if (/\.(mp4|mov|webm)(\?|$)/i.test(url)) return "cdn";
  return null;
}

/** URL 패턴 기반 가로/세로 힌트 (메타데이터 로드 전 초기 레이아웃) */
export function guessAspectRatioFromUrl(raw) {
  const url = String(raw || "");
  const platform = detectVideoPlatform(url);
  if (platform === "tiktok" || platform === "instagram") return "9:16";
  if (VERTICAL_HINTS.test(url)) return "9:16";
  if (/\/shorts\//i.test(url)) return "9:16";
  return "16:9";
}

export function parseEmbedVideoUrl(raw) {
  const url = String(raw || "").trim();
  if (!url) return null;

  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "").toLowerCase();
    const aspectHint = guessAspectRatioFromUrl(url);

    if (host === "youtu.be") {
      const id = parsed.pathname.replace(/^\//, "").split("/")[0];
      if (id) {
        return {
          kind: "youtube",
          id,
          platform: "youtube",
          aspectHint,
          isLive: false,
          embedUrl: `https://www.youtube.com/embed/${id}?rel=0&modestbranding=1&playsinline=1`
        };
      }
    }

    if (host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com") {
      const v = parsed.searchParams.get("v");
      if (v) {
        return {
          kind: "youtube",
          id: v,
          platform: "youtube",
          aspectHint,
          isLive: parsed.pathname.includes("/live"),
          embedUrl: `https://www.youtube.com/embed/${v}?rel=0&modestbranding=1&playsinline=1`
        };
      }
      const shortMatch = parsed.pathname.match(/\/shorts\/([^/?]+)/);
      if (shortMatch?.[1]) {
        return {
          kind: "youtube",
          id: shortMatch[1],
          platform: "youtube",
          aspectHint: "9:16",
          isLive: false,
          embedUrl: `https://www.youtube.com/embed/${shortMatch[1]}?rel=0&modestbranding=1&playsinline=1`
        };
      }
      const liveMatch = parsed.pathname.match(/\/live\/([^/?]+)/);
      if (liveMatch?.[1]) {
        return {
          kind: "youtube",
          id: liveMatch[1],
          platform: "youtube",
          aspectHint: "16:9",
          isLive: true,
          embedUrl: `https://www.youtube.com/embed/${liveMatch[1]}?rel=0&modestbranding=1&playsinline=1&autoplay=1`
        };
      }
      const embedMatch = parsed.pathname.match(/\/embed\/([^/?]+)/);
      if (embedMatch?.[1]) {
        return {
          kind: "youtube",
          id: embedMatch[1],
          platform: "youtube",
          aspectHint,
          isLive: false,
          embedUrl: `https://www.youtube.com/embed/${embedMatch[1]}?rel=0&modestbranding=1&playsinline=1`
        };
      }
    }

    if (host === "vimeo.com" || host === "player.vimeo.com") {
      const idMatch = parsed.pathname.match(/\/(?:video\/)?(\d+)/);
      if (idMatch?.[1]) {
        return {
          kind: "vimeo",
          id: idMatch[1],
          platform: "vimeo",
          aspectHint,
          isLive: false,
          embedUrl: `https://player.vimeo.com/video/${idMatch[1]}?title=0&byline=0&portrait=0`
        };
      }
    }

    if (host.includes("tiktok.com")) {
      const idMatch = parsed.pathname.match(/\/video\/(\d+)/);
      if (idMatch?.[1]) {
        return {
          kind: "tiktok",
          id: idMatch[1],
          platform: "tiktok",
          aspectHint: "9:16",
          isLive: parsed.pathname.includes("/live"),
          embedUrl: `https://www.tiktok.com/embed/v2/${idMatch[1]}`
        };
      }
      if (parsed.pathname.includes("/live")) {
        return {
          kind: "tiktok",
          id: url,
          platform: "tiktok",
          aspectHint: "9:16",
          isLive: true,
          embedUrl: url
        };
      }
    }

    if (host.includes("instagram.com")) {
      return {
        kind: "instagram",
        id: url,
        platform: "instagram",
        aspectHint: "9:16",
        isLive: /live|broadcast/i.test(url),
        embedUrl: url
      };
    }

    if (/\.m3u8(\?|$)/i.test(parsed.pathname + parsed.search) || host.includes("live")) {
      return {
        kind: "hls",
        id: url,
        platform: "hls",
        aspectHint,
        isLive: true,
        embedUrl: url
      };
    }

    if (
      /\.(mp4|webm|mov)(\?|$)/i.test(parsed.pathname) ||
      parsed.pathname.includes("/storage/v1/object/public/") ||
      host.includes("r2.dev") ||
      host.includes("cloudflare")
    ) {
      return {
        kind: "stream",
        id: url,
        platform: detectVideoPlatform(url) || "cdn",
        aspectHint,
        isLive: false,
        embedUrl: url
      };
    }
  } catch {
    return null;
  }

  return null;
}

export function isEmbeddableVideoUrl(raw) {
  return Boolean(parseEmbedVideoUrl(raw));
}

export function isLiveStreamUrl(raw) {
  const embed = parseEmbedVideoUrl(raw);
  return Boolean(embed?.isLive || embed?.kind === "hls");
}
