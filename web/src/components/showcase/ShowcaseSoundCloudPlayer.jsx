import { useEffect, useRef } from "react";
import {
  buildSoundCloudEmbedUrl,
  loadSoundCloudWidgetApi
} from "../../lib/showcase/showcaseSoundCloud.js";

/**
 * SoundCloud Widget BGM 플레이어
 * @param {{
 *   trackUrl: string,
 *   muted?: boolean,
 *   className?: string,
 *   visual?: boolean,
 *   hideUi?: boolean,
 *   onReady?: () => void,
 *   title?: string
 * }} props
 */
export default function ShowcaseSoundCloudPlayer({
  trackUrl,
  muted = false,
  className = "",
  visual = false,
  hideUi = true,
  onReady,
  title = "Showcase BGM"
}) {
  const iframeRef = useRef(null);
  const widgetRef = useRef(null);
  const src = trackUrl
    ? buildSoundCloudEmbedUrl(trackUrl, { autoPlay: !muted, visual, hideUi })
    : "";

  useEffect(() => {
    if (!src || !iframeRef.current) return undefined;
    let cancelled = false;
    let widget = null;

    (async () => {
      const SC = await loadSoundCloudWidgetApi();
      if (cancelled || !SC?.Widget || !iframeRef.current) return;
      widget = SC.Widget(iframeRef.current);
      widgetRef.current = widget;
      widget.bind(SC.Widget.Events.READY, () => {
        if (cancelled) return;
        try {
          widget.setVolume(muted ? 0 : 100);
          if (muted) widget.pause();
          else widget.play();
        } catch {
          /* ignore */
        }
        onReady?.();
      });
    })();

    return () => {
      cancelled = true;
      try {
        widget?.pause();
      } catch {
        /* ignore */
      }
      widgetRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);

  useEffect(() => {
    const widget = widgetRef.current;
    if (!widget) return;
    try {
      widget.setVolume(muted ? 0 : 100);
      if (muted) widget.pause();
      else widget.play();
    } catch {
      /* ignore */
    }
  }, [muted]);

  if (!src) return null;

  return (
    <iframe
      ref={iframeRef}
      title={title}
      className={`showcase-soundcloud-player ${className}`.trim()}
      src={src}
      allow="autoplay"
      loading="lazy"
    />
  );
}
