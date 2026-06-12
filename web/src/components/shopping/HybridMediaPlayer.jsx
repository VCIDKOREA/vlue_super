import { useEffect, useRef, useState } from "react";
import { parseEmbedVideoUrl } from "../../lib/embedVideo.js";
import { probeVideoAspectRatio } from "../../lib/videoAspectRatio.js";
import PlatformWatermark from "./PlatformWatermark.jsx";

const HLS_SCRIPT = "https://cdn.jsdelivr.net/npm/hls.js@1.5.15/dist/hls.min.js";

function loadHlsJs() {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("no window"));
      return;
    }
    if (window.Hls) {
      resolve(window.Hls);
      return;
    }
    const existing = document.querySelector(`script[src="${HLS_SCRIPT}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve(window.Hls));
      existing.addEventListener("error", () => reject(new Error("hls.js load failed")));
      return;
    }
    const s = document.createElement("script");
    s.src = HLS_SCRIPT;
    s.async = true;
    s.onload = () => resolve(window.Hls);
    s.onerror = () => reject(new Error("hls.js load failed"));
    document.head.appendChild(s);
  });
}

/**
 * 하이브리드 비디오 플레이어 — 외부 임베드 / CDN mp4 / HLS 라이브
 * 비용 0원: 미디어 바이트는 YouTube·TikTok·CDN만 소모, VLUE 서버 트래픽 없음
 */
export default function HybridMediaPlayer({
  videoUrl,
  title = "상품 영상",
  className = "",
  onAspectRatioChange,
  fill = false
}) {
  const embed = parseEmbedVideoUrl(videoUrl);
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const [aspectRatio, setAspectRatio] = useState(embed?.aspectHint || "16:9");

  useEffect(() => {
    if (!embed) return undefined;
    const hint = embed.aspectHint || "16:9";
    setAspectRatio(hint);
    onAspectRatioChange?.(hint);

    if (embed.kind === "stream" || embed.kind === "hls") {
      probeVideoAspectRatio(embed.embedUrl).then((ratio) => {
        setAspectRatio(ratio);
        onAspectRatioChange?.(ratio);
      });
    }
  }, [videoUrl, embed?.kind, embed?.embedUrl, embed?.aspectHint, onAspectRatioChange]);

  useEffect(() => {
    if (!embed || embed.kind !== "hls") return undefined;
    const video = videoRef.current;
    if (!video) return undefined;

    let cancelled = false;
    (async () => {
      try {
        const Hls = await loadHlsJs();
        if (cancelled) return;
        if (Hls.isSupported()) {
          const hls = new Hls({ enableWorker: true, lowLatencyMode: true });
          hlsRef.current = hls;
          hls.loadSource(embed.embedUrl);
          hls.attachMedia(video);
        } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
          video.src = embed.embedUrl;
        }
      } catch {
        if (video) video.src = embed.embedUrl;
      }
    })();

    return () => {
      cancelled = true;
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [embed?.kind, embed?.embedUrl]);

  if (!embed) return null;

  const isVertical = aspectRatio === "9:16";
  const shellCls = `relative w-full overflow-hidden bg-black ${className}`;
  const ratioStyle = fill
    ? { width: "100%", height: "100%" }
    : { aspectRatio: isVertical ? "9/16" : "16/9", maxHeight: isVertical ? "100dvh" : undefined };

  if (embed.kind === "stream" || embed.kind === "hls") {
    return (
      <div className={shellCls} style={ratioStyle}>
        <video
          ref={videoRef}
          src={embed.kind === "stream" ? embed.embedUrl : undefined}
          controls
          playsInline
          autoPlay={embed.isLive}
          muted={embed.isLive}
          preload="metadata"
          className="absolute inset-0 h-full w-full object-contain"
        />
        <PlatformWatermark platform={embed.platform} isLive={embed.isLive} />
      </div>
    );
  }

  if (embed.kind === "instagram" && !embed.embedUrl.includes("instagram.com/embed")) {
    return (
      <div className={shellCls} style={ratioStyle}>
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gradient-to-b from-purple-900/80 to-pink-900/80 p-6 text-center">
          <PlatformWatermark platform="instagram" isLive={embed.isLive} className="!static !bg-transparent" />
          <p className="text-[13px] font-bold text-white">Instagram 라이브는 앱 내 임베드로 재생됩니다</p>
          <a
            href={videoUrl}
            target="_blank"
            rel="noreferrer"
            className="rounded-xl bg-white/20 px-4 py-2 text-[12px] font-bold text-white backdrop-blur"
          >
            Instagram에서 보기
          </a>
        </div>
        <PlatformWatermark platform="instagram" isLive={embed.isLive} />
      </div>
    );
  }

  const allow =
    embed.kind === "tiktok"
      ? "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      : "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";

  return (
    <div className={shellCls} style={ratioStyle}>
      <iframe
        title={title}
        src={embed.embedUrl}
        className="absolute inset-0 h-full w-full border-0"
        allow={allow}
        allowFullScreen
        loading="lazy"
        referrerPolicy="strict-origin-when-cross-origin"
      />
      <PlatformWatermark platform={embed.platform} isLive={embed.isLive} />
    </div>
  );
}
