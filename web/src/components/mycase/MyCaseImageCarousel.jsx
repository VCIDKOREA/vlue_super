import { useCallback, useRef } from "react";

/**
 * 게시물 사진 — 좌우 스와이프 캐러셀 + 더블탭 좋아요 (인스타그램형)
 */
export default function MyCaseImageCarousel({
  images = [],
  index = 0,
  onIndexChange,
  onDoubleTap
}) {
  const touchRef = useRef({ x: 0, y: 0, locked: null });
  const movedRef = useRef(false);
  const tapArmedRef = useRef(false);
  const lastTapRef = useRef({ t: 0, x: 0, y: 0 });
  const pointerStartRef = useRef({ x: 0, y: 0 });

  const go = useCallback(
    (delta) => {
      if (!images.length) return;
      const next = Math.max(0, Math.min(images.length - 1, index + delta));
      if (next !== index) onIndexChange?.(next);
    },
    [images.length, index, onIndexChange]
  );

  const noteTap = useCallback(
    (clientX, clientY, moved) => {
      if (!onDoubleTap || moved) return;
      const now = Date.now();
      const prev = lastTapRef.current;
      const dt = now - prev.t;
      const dist = Math.hypot(clientX - prev.x, clientY - prev.y);
      if (dt > 0 && dt < 320 && dist < 36) {
        lastTapRef.current = { t: 0, x: 0, y: 0 };
        onDoubleTap();
        return;
      }
      lastTapRef.current = { t: now, x: clientX, y: clientY };
    },
    [onDoubleTap]
  );

  const onTouchStart = (e) => {
    const t = e.touches[0];
    if (!t) return;
    movedRef.current = false;
    touchRef.current = { x: t.clientX, y: t.clientY, locked: null };
  };

  const onTouchMove = (e) => {
    const t = e.touches[0];
    const start = touchRef.current;
    if (!t || !start) return;
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    if (Math.abs(dx) > 8 || Math.abs(dy) > 8) movedRef.current = true;
    if (start.locked == null && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
      touchRef.current.locked = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
    }
    if (touchRef.current.locked === "x") e.stopPropagation();
  };

  const onTouchEnd = (e) => {
    const t = e.changedTouches[0];
    const start = touchRef.current;
    if (!t || !start) return;
    if (start.locked === "x") {
      const dx = t.clientX - start.x;
      if (dx < -48) go(1);
      else if (dx > 48) go(-1);
    } else {
      noteTap(t.clientX, t.clientY, movedRef.current);
    }
    touchRef.current = { x: 0, y: 0, locked: null };
    movedRef.current = false;
  };

  const onPointerDown = (e) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    if (e.target?.closest?.("button, a")) return;
    movedRef.current = false;
    tapArmedRef.current = true;
    pointerStartRef.current = { x: e.clientX, y: e.clientY };
    touchRef.current = { x: e.clientX, y: e.clientY, locked: null };
  };

  const onPointerMove = (e) => {
    const dx = e.clientX - pointerStartRef.current.x;
    const dy = e.clientY - pointerStartRef.current.y;
    if (Math.abs(dx) > 8 || Math.abs(dy) > 8) movedRef.current = true;
    const start = touchRef.current;
    if (!start) return;
    if (start.locked == null && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
      touchRef.current.locked = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
    }
    if (touchRef.current.locked === "x") e.stopPropagation();
  };

  const onPointerUp = (e) => {
    const start = touchRef.current;
    if (!start) return;
    const moved = movedRef.current || start.locked === "x";
    if (start.locked === "x") {
      const dx = e.clientX - start.x;
      if (dx < -48) go(1);
      else if (dx > 48) go(-1);
    } else if (tapArmedRef.current) {
      noteTap(e.clientX, e.clientY, moved);
    }
    touchRef.current = { x: 0, y: 0, locked: null };
    movedRef.current = false;
    tapArmedRef.current = false;
  };

  if (!images.length) return null;

  return (
    <div
      className="my-case-carousel"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchEnd}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <div
        className="my-case-carousel__track"
        style={{ transform: `translate3d(-${index * 100}%, 0, 0)` }}
      >
        {images.map((img) => (
          <div key={img.id} className="my-case-carousel__slide">
            <img className="my-case-carousel__photo" src={img.url} alt="" draggable={false} />
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
