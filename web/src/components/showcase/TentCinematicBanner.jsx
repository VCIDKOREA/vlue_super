import { useCallback, useEffect, useRef, useState } from "react";

/**
 * 시네마틱 히어로 배경 — 풀블리드 이미지 + 스와이프
 */
export default function TentCinematicBanner({
  photos = [],
  locked = false,
  hero = false,
  fallbackUrl = "",
  emptyAtmosphere = true
}) {
  const [index, setIndex] = useState(0);
  const startX = useRef(0);

  const list = Array.isArray(photos) ? photos.filter((p) => p?.url) : [];
  const slides =
    list.length > 0
      ? list
      : fallbackUrl
        ? [{ id: "fallback", url: fallbackUrl }]
        : emptyAtmosphere
          ? [{ id: "atmosphere", url: "", atmosphere: true }]
          : [];
  const count = slides.length;

  useEffect(() => {
    setIndex(0);
  }, [count, fallbackUrl]);

  const go = useCallback(
    (dir) => {
      if (count <= 1) return;
      setIndex((i) => (i + dir + count) % count);
    },
    [count]
  );

  const onPointerDown = (e) => {
    startX.current = e.clientX;
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };

  const onPointerUp = (e) => {
    const dx = e.clientX - startX.current;
    if (Math.abs(dx) < 40) return;
    go(dx < 0 ? 1 : -1);
  };

  return (
    <div
      className={`tent-banner${hero ? " tent-banner--hero" : ""}${locked ? " tent-banner--locked" : ""}`}
      aria-roledescription="carousel"
    >
      <div className="tent-banner__viewport" onPointerDown={onPointerDown} onPointerUp={onPointerUp}>
        <div className="tent-banner__track" style={{ transform: `translateX(-${index * 100}%)` }}>
          {slides.map((p, i) => (
            <article key={p.id || `${i}-${String(p.url).slice(0, 24)}`} className="tent-banner__slide">
              {p.atmosphere || !p.url ? (
                <div className="tent-banner__atmosphere" aria-hidden />
              ) : (
                <img src={p.url} alt="" className="tent-banner__img" draggable={false} />
              )}
              <div className="tent-banner__veil" aria-hidden />
              {(p.overlayText || p.caption) && (
                <p className="tent-banner__caption">{p.overlayText || p.caption}</p>
              )}
            </article>
          ))}
        </div>
      </div>
      {count > 1 ? (
        <div className="tent-banner__dots" role="tablist" aria-label="배너 페이지">
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              className={`tent-banner__dot${i === index ? " is-active" : ""}`}
              aria-label={`${i + 1}번째 배너`}
              aria-selected={i === index}
              onClick={() => setIndex(i)}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
