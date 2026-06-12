import HybridMediaPlayer from "./HybridMediaPlayer.jsx";
import { parseEmbedVideoUrl } from "../../lib/embedVideo.js";

/**
 * 비용 제로 — YouTube/Vimeo/TikTok iframe · mp4/mov/HLS HTML5 (CDN·외부 플랫폼 직접 스트리밍)
 */
export default function ExternalEmbedPlayer({ videoUrl, title = "상품 설명 영상", className = "", onAspectRatioChange }) {
  if (!parseEmbedVideoUrl(videoUrl)) return null;
  return (
    <HybridMediaPlayer
      videoUrl={videoUrl}
      title={title}
      className={`rounded-xl ${className}`}
      onAspectRatioChange={onAspectRatioChange}
    />
  );
}
