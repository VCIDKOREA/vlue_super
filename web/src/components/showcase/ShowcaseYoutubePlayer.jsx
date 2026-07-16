import { useEffect, useRef } from "react";
import { buildYoutubeEmbedUrl, postYoutubeCommand } from "../../lib/showcase/showcaseYoutube.js";

/**
 * YouTube iframe BGM 플레이어 (공식 embed)
 * 쇼케이스 송출 시에는 화면 밖/비가시 호스트에서 음향만 사용합니다.
 * @param {{ videoId: string, muted?: boolean, className?: string, onReady?: () => void, title?: string }} props
 */
export default function ShowcaseYoutubePlayer({
  videoId,
  muted = true,
  className = "",
  onReady,
  title = "Showcase BGM"
}) {
  const iframeRef = useRef(null);
  // autoplay 안정성: 항상 mute=1로 로드 후, unmuted 요청 시 JS API로 unMute
  const src = videoId
    ? buildYoutubeEmbedUrl(videoId, { muted: true, autoplay: true, loop: true })
    : "";

  useEffect(() => {
    if (src && onReady) onReady();
  }, [src, onReady]);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe || !src) return undefined;

    const applyMute = () => {
      if (muted) {
        postYoutubeCommand(iframe, "mute");
      } else {
        postYoutubeCommand(iframe, "playVideo");
        postYoutubeCommand(iframe, "unMute");
        postYoutubeCommand(iframe, "setVolume", [100]);
      }
    };

    applyMute();
    const t1 = window.setTimeout(applyMute, 400);
    const t2 = window.setTimeout(applyMute, 1200);
    const t3 = window.setTimeout(applyMute, 2500);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
    };
  }, [src, muted, videoId]);

  if (!src) return null;

  return (
    <iframe
      ref={iframeRef}
      title={title}
      className={`showcase-youtube-player ${className}`.trim()}
      src={src}
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
      referrerPolicy="strict-origin-when-cross-origin"
      onLoad={() => {
        const iframe = iframeRef.current;
        if (!iframe) return;
        postYoutubeCommand(iframe, "playVideo");
        if (!muted) {
          postYoutubeCommand(iframe, "unMute");
          postYoutubeCommand(iframe, "setVolume", [100]);
        }
      }}
    />
  );
}
