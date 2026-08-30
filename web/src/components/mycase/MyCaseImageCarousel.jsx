import { useCallback, useRef } from "react";

/**
 * 게시물 사진 — 좌우 스와이프 캐러셀 (인스타그램형)
 */
export default function MyCaseImageCarousel({ images = [], index = 0, onIndexChange }) {
  const touchRef = useRef({ x: 0, y: 0, locked: null });

  const go = useCallback(
    (delta) => {
      if (!images.length) return;
      const next = Math.max(0, Math.min(images.length - 1, index + delta));
      if (next !== index) onIndexChange?.(next);
    },
    [images.length, index, onIndexChange]
  );

  const onTouchStart = (e) => {
    const t = e.touches[0];
    if (!t) return;
    touchRef.current = { x: t.clientX, y: t.clientY, locked: null };
  };

  const onTouchMove = (e) => {
    const t = e.touches[0];
    const start = touchRef.current;
    if (!t || !start) return;
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    if (start.locked == null && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
      touchRef.current.locked = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
    }
    if (touchRef.current.locked === "x") e.stopPropagation();
  };

  const onTouchEnd = (e) => {
    const t = e.changedTouches[0];
    const start = touchRef.current;
    if (!t || !start || start.locked !== "x") return;
    const dx = t.clientX - start.x;
    if (dx < -48) go(1);
    else if (dx > 48) go(-1);
    touchRef.current = { x: 0, y: 0, locked: null };
  };

  if (!images.length) return null;

  return (
    <div
      className="my-case-carousel"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchEnd}
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
