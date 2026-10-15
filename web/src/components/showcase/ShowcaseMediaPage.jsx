import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import ShowcasePhotoTextOverlay from "./ShowcasePhotoTextOverlay.jsx";

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
      {current.isAdMobSponsor ? (
        <div className="showcase-ad-rich-frame relative flex h-full w-full flex-col justify-between overflow-hidden bg-[#0B101B]">
          {/* 1. 고화질 풀스크린 앰비언트 블러 배경 (영상 또는 이미지) */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {current.videoUrl ? (
              <video
                src={current.videoUrl}
                poster={current.url}
                autoPlay
                loop
                muted
                playsInline
                className="h-full w-full object-cover blur-2xl scale-125 opacity-35"
                aria-hidden="true"
              />
            ) : (
              <img
                src={current.url}
                alt=""
                className="h-full w-full object-cover blur-2xl scale-125 opacity-35"
                aria-hidden="true"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-b from-[#0B101B]/80 via-transparent to-[#0B101B]/95" />
          </div>

          {/* 2. 상단 헤더: BGM 바 영역과 안전한 간격을 확보하여 최상단 텍스트 짤림 100% 방지 */}
          <div className="relative z-10 px-5 pt-3.5 text-center">
            {current.badge ? (
              <span
                className="inline-block rounded-full px-2.5 py-0.5 text-[10px] font-black tracking-wider uppercase mb-1.5 shadow-sm"
                style={{
                  backgroundColor: `${current.accentColor || "#38bdf8"}22`,
                  color: current.accentColor || "#38bdf8",
                  border: `1px solid ${current.accentColor || "#38bdf8"}44`
                }}
              >
                {current.badge}
              </span>
            ) : null}

            <h3 className="text-[17px] font-black leading-snug tracking-tight text-white drop-shadow-md">
              {current.body || current.headline}
            </h3>

            {current.body && current.headline ? (
              <p className="mt-1 text-[12px] font-bold text-slate-300 tracking-tight">
                {current.headline}
              </p>
            ) : null}
          </div>

          {/* 3. 중앙 고화질 메인 비주얼 (영상 자동 재생 또는 이미지) */}
          <div className="relative z-10 mx-auto w-[92%] max-w-[340px] flex-1 min-h-0 flex items-center justify-center my-2">
            <div className="relative w-full max-h-[100%] overflow-hidden rounded-2xl border border-white/15 bg-black/60 shadow-2xl">
              {current.videoUrl ? (
                <video
                  key={current.videoUrl}
                  src={current.videoUrl}
                  poster={current.url}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="h-full w-full object-contain max-h-[260px] mx-auto select-none rounded-2xl"
                />
              ) : (
                <img
                  key={current.id || current.url}
                  src={current.url}
                  alt={current.headline || "스폰서 쇼케이스"}
                  className="h-full w-full object-contain max-h-[260px] mx-auto select-none"
                  draggable={false}
                  onError={() => onImageError?.(current)}
                />
              )}
            </div>
          </div>

          {/* 4. 디테일 스펙/하이라이트 칩 (글래스모피즘 배지) + 하단 소셜/프로필 안전 여백 */}
          <div className="relative z-10 px-4 pb-24 text-center">
            {current.specs && current.specs.length > 0 ? (
              <div className="flex flex-wrap items-center justify-center gap-1.5 max-w-[320px] mx-auto">
                {current.specs.map((spec, sIdx) => (
                  <span
                    key={sIdx}
                    className="flex items-center gap-1 rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-[10.5px] font-bold text-white/95 shadow-sm backdrop-blur-md"
                  >
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: current.accentColor || "#38bdf8" }}
                    />
                    {spec}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="showcase-media-page__frame">
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
        </div>
      )}

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
