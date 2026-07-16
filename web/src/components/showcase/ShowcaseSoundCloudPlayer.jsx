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
 *   onPlay?: () => void,
 *   onError?: (reason?: string) => void,
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
  onPlay,
  onError,
  title = "Showcase BGM"
}) {
  const iframeRef = useRef(null);
  const widgetRef = useRef(null);
  const onErrorRef = useRef(onError);
  const onPlayRef = useRef(onPlay);
  const onReadyRef = useRef(onReady);
  onErrorRef.current = onError;
  onPlayRef.current = onPlay;
  onReadyRef.current = onReady;

  const src = trackUrl
    ? buildSoundCloudEmbedUrl(trackUrl, { autoPlay: !muted, visual, hideUi })
    : "";

  useEffect(() => {
    if (!src || !iframeRef.current) return undefined;
    let cancelled = false;
    let widget = null;
    let playWatch = 0;
    let gotPlay = false;

    (async () => {
      const SC = await loadSoundCloudWidgetApi();
      if (cancelled || !SC?.Widget || !iframeRef.current) return;
      widget = SC.Widget(iframeRef.current);
      widgetRef.current = widget;

      const fail = (reason) => {
        if (cancelled || gotPlay) return;
        onErrorRef.current?.(reason || "unavailable");
      };

      widget.bind(SC.Widget.Events.ERROR, () => fail("error"));
      widget.bind(SC.Widget.Events.PLAY, () => {
        gotPlay = true;
        window.clearTimeout(playWatch);
        onPlayRef.current?.();
      });
      widget.bind(SC.Widget.Events.PLAY_PROGRESS, () => {
        if (!gotPlay) {
          gotPlay = true;
          window.clearTimeout(playWatch);
          onPlayRef.current?.();
        }
      });

      widget.bind(SC.Widget.Events.READY, () => {
        if (cancelled) return;
        try {
          widget.setVolume(muted ? 0 : 100);
          if (muted) widget.pause();
          else widget.play();
        } catch {
          if (!muted) fail("ready_play_failed");
          return;
        }
        onReadyRef.current?.();

        /* 음소거 호스트는 재생 검증 생략 */
        if (muted) return;

        /* 지역 제한 등은 ERROR 또는 재생 진행 없음으로 감지 */
        playWatch = window.setTimeout(() => {
          if (cancelled || gotPlay) return;
          try {
            widget.getCurrentSound((sound) => {
              if (cancelled || gotPlay) return;
              if (!sound) fail("no_sound");
            });
          } catch {
            fail("no_sound");
          }
          window.setTimeout(() => {
            if (!cancelled && !gotPlay) fail("no_progress");
          }, 2500);
        }, 3500);
      });
    })();

    return () => {
      cancelled = true;
      window.clearTimeout(playWatch);
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
