import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import ShowcasePhotoTextOverlay from "./ShowcasePhotoTextOverlay.jsx";

const FALLBACK_SPONSOR_VIDEO_URL =
  "https://videos.pexels.com/video-files/855828/855828-hd_1920_1080_30fps.mp4";

/**
 * 비디오 미디어의 실제 오디오 트랙 존재 여부 정밀 판별
 * 1. URL 패턴 (Pexels, MDN flower 등 무음 스톡 영상 사전 즉각 판별)
 * 2. 표준 audioTracks API (Safari 등)
 * 3. Firefox mozHasAudio
 * 4. captureStream / mozCaptureStream (Chromium, Android WebView)
 * 5. webkitAudioDecodedByteCount (Blink 재생 중 디코딩 바이트 수)
 */
function detectVideoAudioPresence(video, url = "") {
  const lowerUrl = String(url || video?.currentSrc || video?.src || "").toLowerCase();
  if (lowerUrl.includes("videos.pexels.com") || lowerUrl.includes("flower.mp4")) {
    return false;
  }

  if (!video) return null;

  // 1. 표준 audioTracks API
  if (video.audioTracks && typeof video.audioTracks.length === "number") {
    return video.audioTracks.length > 0;
  }

  // 2. Firefox mozHasAudio
  if (typeof video.mozHasAudio === "boolean") {
    return video.mozHasAudio;
  }

  // 3. captureStream / mozCaptureStream (Chromium / Android WebView)
  try {
    const streamFunc = video.captureStream || video.mozCaptureStream;
    if (typeof streamFunc === "function") {
      const stream = streamFunc.call(video);
      if (stream && typeof stream.getAudioTracks === "function") {
        const audioTracks = stream.getAudioTracks();
        if (Array.isArray(audioTracks)) {
          return audioTracks.length > 0;
        }
      }
    }
  } catch {
    /* ignore CORS or security limitations */
  }

  // 4. webkitAudioDecodedByteCount (재생 중 실제 디코딩 바이트 판별)
  if (typeof video.webkitAudioDecodedByteCount === "number") {
    if (video.webkitAudioDecodedByteCount > 0) {
      return true;
    }
    if (video.currentTime > 0.3 && video.webkitAudioDecodedByteCount === 0) {
      return false;
    }
  }

  return null;
}

/**
 * 스폰서 AD 전용 100% 동영상 오토플레이 플레이어
 * - 정지 이미지(poster/img) 절대 사용 금지
 * - 비디오 오토플레이 보장 및 상단 BGM 바와 1:1 사운드 상태 실시간 동기화
 * - 가로 비율(16:9 등) 영상도 세로 카드 틀 내부에서 object-contain 레터박스로 자연스럽게 스케일링
 * - 무음 영상 감지 시 '소리 없음' UI 즉시 연동 및 불필요한 사운드 제어 배제
 * - 유음 영상 시 [재생 중] / [음소거] 1:1 다이렉트 직결 및 잔상 겹침 방지
 */
function SponsorAdVideoPlayer({ src }) {
  const videoRef = useRef(null);
  const hasAudioRef = useRef(null);

  // 이전 오디오 잔상/겹침 방지: 앱 내 다른 audio/video 일시정지
  const resetOtherAudio = useCallback((currentEl) => {
    try {
      const allMedia = document.querySelectorAll("audio, video");
      allMedia.forEach((el) => {
        if (el !== currentEl && !el.paused) {
          try {
            el.pause();
          } catch {
            /* ignore */
          }
        }
      });
    } catch {
      /* ignore */
    }
    try {
      window.dispatchEvent(new CustomEvent("vlue-letter-bgm-pause"));
    } catch {
      /* ignore */
    }
  }, []);

  const reportStatus = useCallback((muted, hasAudio) => {
    window.dispatchEvent(
      new CustomEvent("vlue-admob-sound-status", {
        detail: {
          isMuted: Boolean(muted),
          hasAudio: hasAudio // boolean or null
        }
      })
    );
  }, []);

  const checkAndSyncAudio = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    const detected = detectVideoAudioPresence(v, src);
    if (detected !== null && detected !== hasAudioRef.current) {
      hasAudioRef.current = detected;
      if (detected === false) {
        v.muted = true;
      }
      reportStatus(v.muted, detected);
    }
  }, [src, reportStatus]);

  // 상단 바에서 음소거 토글 이벤트 수신 -> 실제 video DOM 1:1 직결
  useEffect(() => {
    const onToggle = (e) => {
      const nextMuted = Boolean(e?.detail?.muted);
      const v = videoRef.current;
      if (v) {
        if (hasAudioRef.current === false) {
          v.muted = true;
          reportStatus(true, false);
          return;
        }
        v.muted = nextMuted;
        if (!nextMuted) {
          resetOtherAudio(v);
          v.volume = 1.0;
          v.play().catch(() => {});
        }
        reportStatus(nextMuted, hasAudioRef.current ?? true);
      }
    };
    window.addEventListener("vlue-admob-toggle-mute", onToggle);
    return () => window.removeEventListener("vlue-admob-toggle-mute", onToggle);
  }, [reportStatus, resetOtherAudio]);

  // 비디오 마운트 및 소스 변경 시
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    // 초기 URL 기반 사전 판별
    const quickDetect = detectVideoAudioPresence(null, src);
    hasAudioRef.current = quickDetect;

    if (quickDetect === false) {
      v.muted = true;
      reportStatus(true, false);
      v.play().catch(() => {});
      return;
    }

    // 유음 가능 영상: 전역 오디오 리셋 후 재생 시도
    resetOtherAudio(v);
    v.volume = 1.0;
    v.muted = false;

    const playPromise = v.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          checkAndSyncAudio();
          reportStatus(v.muted, hasAudioRef.current ?? true);
        })
        .catch(() => {
          // 브라우저 오토플레이 정책으로 소리 포함 자동재생 차단 시 무음으로 즉시 100% 자동재생
          v.muted = true;
          checkAndSyncAudio();
          reportStatus(true, hasAudioRef.current ?? true);
          v.play().catch(() => {});
        });
    }

    return () => {
      if (v) {
        try {
          v.pause();
        } catch {
          /* ignore */
        }
      }
    };
  }, [src, reportStatus, resetOtherAudio, checkAndSyncAudio]);

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
      onLoadedMetadata={checkAndSyncAudio}
      onCanPlay={checkAndSyncAudio}
      onPlaying={() => {
        resetOtherAudio(videoRef.current);
        checkAndSyncAudio();
      }}
      onTimeUpdate={checkAndSyncAudio}
      className="showcase-media-page__img w-full h-full object-contain bg-black select-none pointer-events-auto"
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        objectFit: "contain",
        objectPosition: "center",
        backgroundColor: "#000000"
      }}
      draggable={false}
      onClick={(e) => {
        e.stopPropagation();
        const v = videoRef.current;
        if (!v) return;
        if (hasAudioRef.current === false) return;
        const nextMuted = !v.muted;
        v.muted = nextMuted;
        if (!nextMuted) {
          resetOtherAudio(v);
          v.volume = 1.0;
          v.play().catch(() => {});
        }
        reportStatus(nextMuted, true);
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
      <div className="showcase-media-page__frame bg-black flex items-center justify-center overflow-hidden">
        {current.isAdMobSponsor || current.videoUrl ? (
          <SponsorAdVideoPlayer
            src={
              current.videoUrl && !current.videoUrl.includes("commondatastorage.googleapis.com")
                ? current.videoUrl
                : (current.url && current.url.endsWith(".mp4") ? current.url : FALLBACK_SPONSOR_VIDEO_URL)
            }
          />
        ) : (
          <>
            <img
              key={current.id || current.url}
              src={current.url}
              alt=""
              className="showcase-media-page__img"
              draggable={false}
              onError={() => onImageError?.(current)}
            />
            <div className="showcase-media-page__veil" aria-hidden />
            <ShowcasePhotoTextOverlay key={`tx-${current.id || current.url}`} photo={current} />
          </>
        )}
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
