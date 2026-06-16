import HybridMediaPlayer from "./HybridMediaPlayer.jsx";
import { isEmbeddableVideoUrl, parseEmbedVideoUrl } from "../../lib/embedVideo.js";

/**
 * 상품 목록·상세 상단 — 숏폼/소개 영상 자동재생(음소거)
 */
export default function ProductVideoHero({ videoUrl, title = "상품 영상", className = "" }) {
  if (!videoUrl || !isEmbeddableVideoUrl(videoUrl)) return null;

  const embed = parseEmbedVideoUrl(videoUrl);
  const isNativeStream = embed?.kind === "stream" || embed?.kind === "hls";

  return (
    <div className={`overflow-hidden rounded-2xl bg-black ${className}`}>
      <HybridMediaPlayer
        videoUrl={videoUrl}
        title={title}
        autoplayMuted={isNativeStream}
        fill={false}
      />
    </div>
  );
}
