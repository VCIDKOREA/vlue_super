import { useCallback, useEffect, useRef } from "react";
import ShowcasePhotoTextOverlay from "../showcase/ShowcasePhotoTextOverlay.jsx";

const DOUBLE_TAP_MS = 360;
const DOUBLE_TAP_DIST = 44;
const SWIPE_THRESHOLD = 48;
const FEED_MEDIA_ASPECT_DEFAULT = 16 / 9;

/** height/width — 세로 9:16 기본, 가로 16:9까지 프레임 허용 */
function clampFeedMediaAspect(hw) {
  const ratio = Number(hw);
  if (!Number.isFinite(ratio) || ratio <= 0) return FEED_MEDIA_ASPECT_DEFAULT;
  return Math.min(16 / 9, Math.max(9 / 16, ratio));
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
  const gestureRef = useRef({ x: 0, y: 0, locked: null });
  const swipeMovedRef = useRef(false);
  const tapArmedRef = useRef(false);
  const lastTapRef = useRef({ t: 0, x: 0, y: 0, pointerId: -1 });
  const pointerStartRef = useRef({ x: 0, y: 0 });
  const current = images[index] || images[0] || null;

  useEffect(() => {
    const url = String(current?.url || "").trim();
    if (!url) {
      onMediaAspectChange?.(FEED_MEDIA_ASPECT_DEFAULT);
      return undefined;
    }
    let cancelled = false;
    const probe = new Image();
    probe.onload = () => {
      if (cancelled) return;
      onMediaAspectChange?.(clampFeedMediaAspect(probe.naturalHeight / probe.naturalWidth));
    };
    probe.onerror = () => {
      if (!cancelled) onMediaAspectChange?.(FEED_MEDIA_ASPECT_DEFAULT);
    };
    probe.src = url;
    return () => {
      cancelled = true;
    };
  }, [current?.id, current?.url, onMediaAspectChange]);

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

  return (
    <div
      className="my-case-carousel"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onDoubleClick={fireDoubleTap}
    >
      <div
        className="my-case-carousel__track"
        style={{ transform: `translate3d(-${index * 100}%, 0, 0)` }}
      >
        {images.map((img) => (
          <div key={img.id} className="my-case-carousel__slide">
            <img className="my-case-carousel__photo" src={img.url} alt="" draggable={false} />
            <ShowcasePhotoTextOverlay photo={img} />
          </div>
        ))}
      </div>
      {images.length > 1 ? (
        <div className="my-case-carousel__dots" aria-hidden>
          {images.map((img, i) => (
            <span key={img.id} className={i === index ? "is-active" : ""} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
