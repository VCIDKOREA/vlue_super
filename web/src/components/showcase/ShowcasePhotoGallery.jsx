import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

function useAutoSlide(enabled, onTick) {
  const onTickRef = useRef(onTick);
  onTickRef.current = onTick;
  useEffect(() => {
    if (!enabled) return undefined;
    const t = window.setInterval(() => onTickRef.current(), 4000);
    return () => window.clearInterval(t);
  }, [enabled]);
}

/** 쇼케이스 사진 슬라이더 — 최대 10장 */
export default function ShowcasePhotoGallery({
  photos = [],
  fallbackUrl = "",
  autoPlay = true,
  className = ""
}) {
  const items = photos.length > 0 ? photos : fallbackUrl ? [{ id: "fallback", url: fallbackUrl }] : [];
  const [idx, setIdx] = useState(0);

  const go = useCallback(
    (delta) => {
      if (items.length <= 1) return;
      setIdx((i) => (i + delta + items.length) % items.length);
    },
    [items.length]
  );

  useAutoSlide(autoPlay && items.length > 1, () => go(1));

  if (!items.length) {
    return <div className={`showcase-photo-gallery showcase-photo-gallery--empty ${className}`.trim()} />;
  }

  const current = items[idx] || items[0];

  return (
    <div className={`showcase-photo-gallery ${className}`.trim()}>
      <div className="showcase-photo-gallery__frame">
        <img src={current.url} alt={current.caption || ""} className="showcase-photo-gallery__img" />
        {current.overlayText ? (
          <p
            className="showcase-photo-gallery__overlay-text"
            style={{ fontFamily: current.overlayFont || "inherit" }}
          >
            {current.overlayText}
          </p>
        ) : null}
        {(current.emojiStickers || []).map((s) => (
          <span
            key={s.id}
            className="showcase-photo-gallery__sticker"
            style={{ left: `${s.x}%`, top: `${s.y}%` }}
          >
            {s.emoji}
          </span>
        ))}
      </div>
      {items.length > 1 ? (
        <>
          <button type="button" className="showcase-photo-gallery__nav showcase-photo-gallery__nav--prev" onClick={() => go(-1)} aria-label="이전 사진">
            <ChevronLeft size={18} />
          </button>
          <button type="button" className="showcase-photo-gallery__nav showcase-photo-gallery__nav--next" onClick={() => go(1)} aria-label="다음 사진">
            <ChevronRight size={18} />
          </button>
          <div className="showcase-photo-gallery__dots">
            {items.map((p, i) => (
              <span key={p.id} className={i === idx ? "active" : ""} />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
