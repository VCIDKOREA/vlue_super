import { useEffect, useRef } from "react";
import { buildYoutubeEmbedUrl } from "../../lib/showcase/showcaseYoutube.js";

/**
 * YouTube iframe BGM 플레이어 (공식 embed)
 * @param {{ videoId: string, muted: boolean, className?: string, onReady?: () => void }} props
 */
export default function ShowcaseYoutubePlayer({ videoId, muted = true, className = "", onReady }) {
  const iframeRef = useRef(null);
  const src = videoId ? buildYoutubeEmbedUrl(videoId, { muted, autoplay: true, loop: true }) : "";

  useEffect(() => {
    if (src && onReady) onReady();
  }, [src, onReady]);

  if (!src) return null;

  return (
    <iframe
      ref={iframeRef}
      title="Showcase BGM"
      className={`showcase-youtube-player ${className}`.trim()}
      src={src}
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      referrerPolicy="strict-origin-when-cross-origin"
      loading="lazy"
    />
  );
}
