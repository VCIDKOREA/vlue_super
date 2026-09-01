import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import ShowcasePhotoTextOverlay from "../showcase/ShowcasePhotoTextOverlay.jsx";

const DOUBLE_TAP_MS = 360;
const DOUBLE_TAP_DIST = 44;
const SWIPE_THRESHOLD = 48;
const FEED_MEDIA_ASPECT_DEFAULT = 9 / 16;
const FEED_MEDIA_ASPECT_MIN = 0.35;
const FEED_MEDIA_ASPECT_MAX = 16 / 9;

/** height/width — 세로는 크롭 없이, 가로는 와이드까지 허용 */
function clampFeedMediaAspect(hw) {
  const ratio = Number(hw);
  if (!Number.isFinite(ratio) || ratio <= 0) return FEED_MEDIA_ASPECT_DEFAULT;
  return Math.min(FEED_MEDIA_ASPECT_MAX, Math.max(FEED_MEDIA_ASPECT_MIN, ratio));
}

/**
 * 게시물 사진 — 좌우 스와이프 캐러셀 + 더블탭 좋아요 (인스타그램형)
 */
export default function MyCaseImageCarousel({
  images = [],
  index = 0,
  onIndexChange,
  onDoubleTap,
  onMediaAspectChange
}) {
  const [slideAspects, setSlideAspects] = useState({});
  const gestureRef = useRef({ x: 0, y: 0, locked: null });
  const swipeMovedRef = useRef(false);
  const tapArmedRef = useRef(false);
  const lastTapRef = useRef({ t: 0, x: 0, y: 0, pointerId: -1 });
  const pointerStartRef = useRef({ x: 0, y: 0 });
  const probedIdsRef = useRef(new Set());
  const current = images[index] || images[0] || null;

  /** 등록된 모든 사진 비율 선로드 — 세로/가로 혼합 시 슬라이드 전환 즉시 높이 맞춤 */
  useEffect(() => {
    probedIdsRef.current = new Set();
    setSlideAspects({});
    let cancelled = false;
    for (const img of images) {
      const url = String(img?.url || "").trim();
      const id = String(img?.id || url || "").trim();
      if (!url || !id || probedIdsRef.current.has(id)) continue;
      probedIdsRef.current.add(id);
      const probe = new Image();
      probe.onload = () => {
        if (cancelled) return;
        const aspect = clampFeedMediaAspect(probe.naturalHeight / probe.naturalWidth);
        setSlideAspects((prev) => {
          if (prev[id] === aspect) return prev;
          return { ...prev, [id]: aspect };
        });
      };
      probe.onerror = () => {
        if (cancelled) return;
        setSlideAspects((prev) => {
          if (prev[id]) return prev;
          return { ...prev, [id]: FEED_MEDIA_ASPECT_DEFAULT };
        });
      };
      probe.src = url;
    }
    return () => {
      cancelled = true;
    };
  }, [images]);

  useEffect(() => {
    const id = String(current?.id || "").trim();
    const cached = id ? slideAspects[id] : null;
    if (cached) {
      onMediaAspectChange?.(cached);
      return;
    }
    /* 이전 슬라이드(세로) 높이 유지 금지 — 프로브 전까지 중립 비율 */
    onMediaAspectChange?.(FEED_MEDIA_ASPECT_DEFAULT);
  }, [index, current?.id, slideAspects, onMediaAspectChange]);

  const go = useCallback(
    (delta) => {
      if (!images.length) return;
      const next = Math.max(0, Math.min(images.length - 1, index + delta));
      if (next !== index) onIndexChange?.(next);
    },
    [images.length, index, onIndexChange]
  );

  const fireDoubleTap = useCallback(
    (e) => {
      if (!onDoubleTap) return;
      e?.preventDefault?.();
      e?.stopPropagation?.();
      onDoubleTap();
    },
    [onDoubleTap]
  );

  const noteTap = useCallback(
    (clientX, clientY, pointerId = 0) => {
      if (!onDoubleTap) return;
      const now = Date.now();
      const prev = lastTapRef.current;
      const dt = now - prev.t;
      const dist = Math.hypot(clientX - prev.x, clientY - prev.y);
      if (dt > 0 && dt < DOUBLE_TAP_MS && dist < DOUBLE_TAP_DIST && prev.pointerId === pointerId) {
        lastTapRef.current = { t: 0, x: 0, y: 0, pointerId: -1 };
        fireDoubleTap();
        return;
      }
      lastTapRef.current = { t: now, x: clientX, y: clientY, pointerId };
    },
    [onDoubleTap, fireDoubleTap]
  );

  const onPointerDown = (e) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    if (e.target?.closest?.("button, a")) return;
    swipeMovedRef.current = false;
    tapArmedRef.current = true;
    pointerStartRef.current = { x: e.clientX, y: e.clientY };
    gestureRef.current = { x: e.clientX, y: e.clientY, locked: null };
  };

  const onPointerMove = (e) => {
    const dx = e.clientX - pointerStartRef.current.x;
    const dy = e.clientY - pointerStartRef.current.y;
    const start = gestureRef.current;
    if (!start) return;
    if (start.locked == null && (Math.abs(dx) > 10 || Math.abs(dy) > 10)) {
      gestureRef.current.locked = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
    }
    if (gestureRef.current.locked === "x" && Math.abs(dx) > 10) {
      swipeMovedRef.current = true;
      e.stopPropagation();
    }
  };

  const onPointerUp = (e) => {
    const start = gestureRef.current;
    if (!start) return;
    if (start.locked === "x") {
      const dx = e.clientX - start.x;
      if (dx < -SWIPE_THRESHOLD) go(1);
      else if (dx > SWIPE_THRESHOLD) go(-1);
    } else if (tapArmedRef.current && !swipeMovedRef.current) {
      noteTap(e.clientX, e.clientY, e.pointerId);
    }
    gestureRef.current = { x: 0, y: 0, locked: null };
    swipeMovedRef.current = false;
    tapArmedRef.current = false;
  };

  if (!images.length) return null;

  const canSwipe = images.length > 1;
  const safeIndex = Math.min(index, images.length - 1);

  return (
    <div
      className={`my-case-carousel${canSwipe ? " my-case-carousel--swipeable" : ""}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onDoubleClick={fireDoubleTap}
    >
      <div
        className="my-case-carousel__track"
        style={{ transform: `translate3d(-${safeIndex * 100}%, 0, 0)` }}
      >
        {images.map((img) => (
          <div key={img.id} className="my-case-carousel__slide">
            <img
              className="my-case-carousel__photo"
              src={img.url}
              alt=""
              draggable={false}
            />
            <ShowcasePhotoTextOverlay photo={img} />
          </div>
        ))}
      </div>
      {canSwipe ? (
        <>
          <button
            type="button"
            className="my-case-carousel__nav my-case-carousel__nav--prev"
            aria-label="이전 사진"
            disabled={safeIndex <= 0}
            onClick={(e) => {
              e.stopPropagation();
              go(-1);
            }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <ChevronLeft size={24} strokeWidth={2.4} aria-hidden />
          </button>
          <button
            type="button"
            className="my-case-carousel__nav my-case-carousel__nav--next"
            aria-label="다음 사진"
            disabled={safeIndex >= images.length - 1}
            onClick={(e) => {
              e.stopPropagation();
              go(1);
            }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <ChevronRight size={24} strokeWidth={2.4} aria-hidden />
          </button>
          <div className="my-case-carousel__dots" role="tablist" aria-label="사진">
            {images.map((img, i) => (
              <button
                key={img.id}
                type="button"
                className={`my-case-carousel__dot${i === safeIndex ? " is-active" : ""}`}
                aria-label={`사진 ${i + 1}`}
                aria-selected={i === safeIndex}
                onClick={(e) => {
                  e.stopPropagation();
                  if (i !== safeIndex) onIndexChange?.(i);
                }}
                onPointerDown={(e) => e.stopPropagation()}
              />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
