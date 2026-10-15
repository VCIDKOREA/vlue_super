import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import ShowcasePhotoTextOverlay from "./ShowcasePhotoTextOverlay.jsx";

const FALLBACK_SPONSOR_VIDEO_URL =
  "https://videos.pexels.com/video-files/855828/855828-hd_1920_1080_30fps.mp4";

/**
 * 스폰서 AD 전용 100% 동영상 오토플레이 플레이어
 * - 정지 이미지(poster/img) 절대 사용 금지
 * - 비디오 오토플레이 보장 및 상단 BGM 바와 1:1 사운드 상태 실시간 동기화
 * - 가로 비율(16:9 등) 영상도 세로 카드 틀 내부에서 object-contain 레터박스로 자연스럽게 스케일링
 */
function SponsorAdVideoPlayer({ src }) {
  const videoRef = useRef(null);

  useEffect(() => {
    const onToggle = (e) => {
      const nextMuted = Boolean(e?.detail?.muted);
      if (videoRef.current) {
        videoRef.current.muted = nextMuted;
        if (!nextMuted) {
          videoRef.current.play().catch(() => {});
        }
      }
    };
    window.addEventListener("vlue-admob-toggle-mute", onToggle);
    return () => window.removeEventListener("vlue-admob-toggle-mute", onToggle);
  }, []);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = false;
    const playPromise = v.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        // 브라우저 오토플레이 정책으로 소리 포함 자동재생 차단 시 무음으로 즉시 100% 자동재생 보장
        v.muted = true;
        window.dispatchEvent(
          new CustomEvent("vlue-admob-sound-status", { detail: { isMuted: true } })
        );
        v.play().catch(() => {});
      });
    }
  }, [src]);

  return (
    <video
      ref={videoRef}
      key={src}
      src={src}
      autoPlay
      loop
      muted={false}
      playsInline
      webkit-playsinline="true"
      className="showcase-media-page__img w-full h-full object-contain bg-black select-none pointer-events-auto"
      draggable={false}
      onClick={(e) => {
        e.stopPropagation();
        if (!videoRef.current) return;
        const nextMuted = !videoRef.current.muted;
        videoRef.current.muted = nextMuted;
        window.dispatchEvent(
          new CustomEvent("vlue-admob-sound-status", { detail: { isMuted: nextMuted } })
        );
      }}
    />
  );
}

/**
 * 쇼케이스 한 페이지 — 최대 20장 사진을 VLUÉ 카드로 표시 (공식 Instagram 임베드 없음)
 * media_url 은 API/메타데이터 URL을 그대로 img src 에 사용 (파일 저장 없음)
 * 좌우 스와이프·화살표로 사진 전환 · 사진 위 텍스트 오버레이
 */
export default function ShowcaseMediaPage({
  photos = [],
  caption = "",
  onImageError,
  onDoubleTap
}) {
  const list = (Array.isArray(photos) ? photos : [])
    .map((p) => ({
      id: String(p?.id || p?.url || "").trim(),
      url: String(p?.url || p?.mediaUrl || p?.thumbnailUrl || "").trim(),
      overlayText: p?.overlayText,
      overlayFont: p?.overlayFont,
      overlayFontSize: p?.overlayFontSize,
      overlayColor: p?.overlayColor,
      overlayX: p?.overlayX,
      overlayY: p?.overlayY,
      overlayAnim: p?.overlayAnim,
      overlayBorder: p?.overlayBorder,
      textOverlays: Array.isArray(p?.textOverlays) ? p.textOverlays : undefined,
      isAdMobSponsor: Boolean(p?.isAdMobSponsor),
      headline: p?.headline,
      body: p?.body,
      advertiser: p?.advertiser,
      badge: p?.badge,
      category: p?.category,
      accentColor: p?.accentColor,
      specs: Array.isArray(p?.specs) ? p.specs : [],
      videoUrl: p?.videoUrl || "",
      hasVideoContent: Boolean(p?.videoUrl || p?.hasVideoContent)
    }))
    .filter((p) => p.url || p.videoUrl)
    .slice(0, 20);

  const [index, setIndex] = useState(0);
  const startX = useRef(0);
  const startY = useRef(0);
  const dragging = useRef(false);
  const axis = useRef(null);
  const movedRef = useRef(false);
  const tapArmedRef = useRef(false);
  const lastTapRef = useRef({ t: 0, x: 0, y: 0 });
  const canSwipe = list.length > 1;

  useEffect(() => {
    setIndex(0);
  }, [list.map((p) => p.id).join("|")]);

  const noteTap = useCallback(
    (clientX, clientY, moved) => {
      if (moved) return;
      const now = Date.now();
      const prev = lastTapRef.current;
      const dt = now - prev.t;
      const dist = Math.hypot(clientX - prev.x, clientY - prev.y);
      if (dt > 0 && dt < 320 && dist < 36) {
        lastTapRef.current = { t: 0, x: 0, y: 0 };
        onDoubleTap?.();
        return;
      }
      lastTapRef.current = { t: now, x: clientX, y: clientY };
    },
    [onDoubleTap]
  );

  const go = useCallback(
    (dir) => {
      if (!canSwipe) return;
      setIndex((i) => Math.max(0, Math.min(list.length - 1, i + dir)));
    },
    [canSwipe, list.length]
  );

  const finishSwipe = useCallback(
    (clientX, clientY) => {
      if (!dragging.current) return;
      dragging.current = false;
      const dx = clientX - startX.current;
      const dy = clientY - startY.current;
      const locked = axis.current;
      axis.current = null;
      if (locked === "y") return;
      if (Math.abs(dx) < 40) return;
      if (Math.abs(dx) < Math.abs(dy)) return;
      go(dx < 0 ? 1 : -1);
    },
    [go]
  );

  const onPointerDown = (e) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    if (e.target?.closest?.("button, a")) return;
    movedRef.current = false;
    tapArmedRef.current = true;
    startX.current = e.clientX;
    startY.current = e.clientY;
    if (!canSwipe) return;
    dragging.current = true;
    axis.current = null;
  };

  const onPointerMove = (e) => {
    const dx = e.clientX - startX.current;
    const dy = e.clientY - startY.current;
    if (Math.abs(dx) > 12 || Math.abs(dy) > 12) movedRef.current = true;
    if (!dragging.current || !canSwipe) return;
    if (axis.current == null && (Math.abs(dx) > 12 || Math.abs(dy) > 12)) {
      axis.current = Math.abs(dx) >= Math.abs(dy) ? "x" : "y";
      if (axis.current === "x") {
        e.stopPropagation();
        try {
          e.currentTarget.setPointerCapture?.(e.pointerId);
        } catch {
          /* ignore */
        }
      } else {
        dragging.current = false;
      }
    } else if (axis.current === "x") {
      e.stopPropagation();
      e.preventDefault();
    }
  };

  const onPointerUp = (e) => {
    try {
      e.currentTarget.releasePointerCapture?.(e.pointerId);
    } catch {
      /* ignore */
    }
    const moved = movedRef.current || axis.current === "x";
    if (axis.current === "x") e.stopPropagation();
    finishSwipe(e.clientX, e.clientY);
    if (tapArmedRef.current) noteTap(e.clientX, e.clientY, moved);
    tapArmedRef.current = false;
  };

  const onTouchStart = (e) => {
    if (!canSwipe) return;
    if (e.target?.closest?.("button, a")) return;
    const t = e.touches?.[0];
    if (!t) return;
    dragging.current = true;
    axis.current = null;
    startX.current = t.clientX;
    startY.current = t.clientY;
  };

  const onTouchMove = (e) => {
    if (!dragging.current || !canSwipe) return;
    const t = e.touches?.[0];
    if (!t) return;
    const dx = t.clientX - startX.current;
    const dy = t.clientY - startY.current;
    if (axis.current == null && (Math.abs(dx) > 12 || Math.abs(dy) > 12)) {
      axis.current = Math.abs(dx) >= Math.abs(dy) ? "x" : "y";
      if (axis.current === "y") dragging.current = false;
    }
    if (axis.current === "x") {
      e.stopPropagation();
      if (e.cancelable) e.preventDefault();
    }
  };

  const onTouchEnd = (e) => {
    if (!dragging.current && axis.current == null) return;
    const t = e.changedTouches?.[0];
    if (axis.current === "x") e.stopPropagation();
    finishSwipe(t?.clientX ?? startX.current, t?.clientY ?? startY.current);
  };

  if (!list.length) {
    return (
      <div className="showcase-media-page showcase-media-page--empty">
        <p>표시할 사진이 없습니다.</p>
      </div>
    );
  }

  const safeIndex = Math.min(index, list.length - 1);
  const current = list[safeIndex];
  const atStart = safeIndex <= 0;
  const atEnd = safeIndex >= list.length - 1;

  return (
    <div
      className={`showcase-media-page${canSwipe ? " showcase-media-page--swipeable" : ""}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={() => {
        dragging.current = false;
        axis.current = null;
      }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={() => {
        dragging.current = false;
        axis.current = null;
      }}
    >
      <div className="showcase-media-page__frame bg-black flex items-center justify-center">
        {current.isAdMobSponsor || current.videoUrl ? (
          <SponsorAdVideoPlayer
            src={
              current.videoUrl && !current.videoUrl.includes("commondatastorage.googleapis.com")
                ? current.videoUrl
                : (current.url && current.url.endsWith(".mp4") ? current.url : FALLBACK_SPONSOR_VIDEO_URL)
            }
          />
        ) : (
          <img
            key={current.id || current.url}
            src={current.url}
            alt=""
            className="showcase-media-page__img"
            draggable={false}
            onError={() => onImageError?.(current)}
          />
        )}
        <div className="showcase-media-page__veil" aria-hidden />
        {!current.isAdMobSponsor ? (
          <ShowcasePhotoTextOverlay key={`tx-${current.id || current.url}`} photo={current} />
        ) : null}
      </div>

      {canSwipe ? (
        <>
          <button
            type="button"
            className="showcase-media-page__nav showcase-media-page__nav--prev"
            aria-label="이전 사진"
            disabled={atStart}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              go(-1);
            }}
            onPointerDown={(e) => e.stopPropagation()}
            onPointerUp={(e) => e.stopPropagation()}
          >
            <ChevronLeft className="h-5 w-5" strokeWidth={2.4} aria-hidden />
          </button>
          <button
            type="button"
            className="showcase-media-page__nav showcase-media-page__nav--next"
            aria-label="다음 사진"
            disabled={atEnd}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              go(1);
            }}
            onPointerDown={(e) => e.stopPropagation()}
            onPointerUp={(e) => e.stopPropagation()}
          >
            <ChevronRight className="h-5 w-5" strokeWidth={2.4} aria-hidden />
          </button>
        </>
      ) : null}

      {canSwipe ? (
        <div className="showcase-media-page__dots" role="tablist" aria-label="페이지 내 사진">
          {list.map((p, i) => (
            <button
              key={p.id || i}
              type="button"
              className={`showcase-media-page__dot${i === safeIndex ? " is-active" : ""}`}
              aria-label={`사진 ${i + 1}`}
              aria-selected={i === safeIndex}
              onClick={(e) => {
                e.stopPropagation();
                setIndex(i);
              }}
              onPointerDown={(e) => e.stopPropagation()}
            />
          ))}
        </div>
      ) : null}
      {caption ? <p className="showcase-media-page__caption">{caption}</p> : null}
    </div>
  );
}
