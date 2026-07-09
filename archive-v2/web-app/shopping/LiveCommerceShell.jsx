import { useState } from "react";
import HybridMediaPlayer from "./HybridMediaPlayer.jsx";
import { isEmbeddableVideoUrl } from "../../lib/embedVideo.js";
import { youtubeEmbedUrl } from "../../lib/mediaCommerceCatalog.js";

/**
 * Auto-Aspect Ratio 라이브 커머스 레이아웃
 * - 16:9 가로형: 영상 좌측 + 채팅/결제 우측
 * - 9:16 세로형: 풀스크린 영상 + 플로팅 오버레이
 */
export default function LiveCommerceShell({
  videoUrl,
  youtubeVideoId,
  title = "상품 영상",
  isLive = false,
  commerceRail = null,
  chatPanel = null,
  className = ""
}) {
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const isVertical = aspectRatio === "9:16";
  const hasEmbed = isEmbeddableVideoUrl(videoUrl);

  const player = hasEmbed ? (
    <HybridMediaPlayer
      videoUrl={videoUrl}
      title={title}
      onAspectRatioChange={setAspectRatio}
      fill={isVertical}
      className={isVertical ? "h-full" : ""}
    />
  ) : youtubeVideoId ? (
    <div className="relative w-full" style={{ aspectRatio: isVertical ? "9/16" : "16/9" }}>
      <iframe
        title={title}
        src={youtubeEmbedUrl(youtubeVideoId, isLive)}
        className="absolute inset-0 h-full w-full border-0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  ) : (
    <div className="flex aspect-video items-center justify-center text-[12px] text-white/70">미디어 없음</div>
  );

  if (isVertical) {
    return (
      <div className={`relative w-full bg-black ${isVertical ? "min-h-[55dvh] max-h-[85dvh]" : ""} ${className}`}>
        <div className="relative h-full min-h-[55dvh] w-full">{player}</div>
        {isLive ? (
          <span className="absolute right-3 top-3 z-30 rounded-full bg-red-600 px-2.5 py-0.5 text-[11px] font-black text-white animate-pulse">
            LIVE
          </span>
        ) : null}
        {commerceRail ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex justify-end p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <div className="pointer-events-auto max-w-[min(92vw,320px)]">{commerceRail}</div>
          </div>
        ) : null}
        {chatPanel ? (
          <div className="pointer-events-none absolute left-3 right-3 top-14 z-20 max-h-[28vh]">
            <div className="pointer-events-auto">{chatPanel}</div>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className={`flex w-full flex-col gap-0 bg-black md:flex-row ${className}`}>
      <div className="relative min-w-0 flex-1">
        {player}
        {isLive ? (
          <span className="absolute right-3 top-3 z-30 rounded-full bg-red-600 px-2.5 py-0.5 text-[11px] font-black text-white animate-pulse">
            LIVE
          </span>
        ) : null}
      </div>
      {(commerceRail || chatPanel) && (
        <aside className="flex w-full shrink-0 flex-col gap-2 border-t border-white/10 bg-black/80 p-3 md:w-[min(36vw,320px)] md:border-l md:border-t-0">
          {chatPanel}
          {commerceRail}
        </aside>
      )}
    </div>
  );
}
