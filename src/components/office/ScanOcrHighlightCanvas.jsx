import { useCallback, useRef, useState } from "react";
import { extractBlocksInRect, normalizeRect, pointerToPercent, rectLargeEnough } from "../../lib/scanOcrRegion.js";
import { getFocusedMatch } from "../../lib/scanOcrSearch.js";

/**
 * 스캔 이미지 위 OCR 하이라이트 + 드래그 영역 선택 레이어
 */
export default function ScanOcrHighlightCanvas({
  imageUrl,
  blocks = [],
  searchResult,
  onRegionSelect,
  dragEnabled = true
}) {
  const containerRef = useRef(null);
  const dragStartRef = useRef(null);
  const [dragRect, setDragRect] = useState(null);

  const focused = getFocusedMatch(searchResult);
  const allMatches = searchResult?.matches || [];

  const onPointerDown = useCallback(
    (e) => {
      if (!dragEnabled || !containerRef.current) return;
      e.preventDefault();
      const pt = pointerToPercent(containerRef.current, e.clientX, e.clientY);
      dragStartRef.current = pt;
      setDragRect({ x1: pt.x, y1: pt.y, x2: pt.x, y2: pt.y });
    },
    [dragEnabled]
  );

  const onPointerMove = useCallback((e) => {
    const start = dragStartRef.current;
    if (!start || !containerRef.current) return;
    const pt = pointerToPercent(containerRef.current, e.clientX, e.clientY);
    setDragRect(normalizeRect(start, pt));
  }, []);

  const onPointerUp = useCallback(() => {
    const rect = dragRect;
    dragStartRef.current = null;
    setDragRect(null);
    if (!rect || !rectLargeEnough(rect)) return;
    const text = extractBlocksInRect(blocks, rect);
    if (text) onRegionSelect?.({ rect, text });
  }, [blocks, dragRect, onRegionSelect]);

  return (
    <div
      ref={containerRef}
      className="relative mx-auto w-full max-w-lg overflow-hidden rounded-lg bg-slate-900"
      style={{ touchAction: dragEnabled ? "none" : "auto" }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
    >
      <img src={imageUrl} alt="스캔 페이지" className="block h-auto w-full select-none" draggable={false} />
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden
      >
        {allMatches.map((m, i) => {
          const active = focused?.id === m.id;
          return (
            <rect
              key={m.id}
              x={m.box.x}
              y={m.box.y}
              width={m.box.w}
              height={m.box.h}
              fill={active ? "rgba(250,204,21,0.72)" : "rgba(253,224,71,0.42)"}
              stroke={active ? "#ca8a04" : "transparent"}
              strokeWidth={active ? 0.25 : 0}
              rx={0.2}
            />
          );
        })}
        {dragRect ? (
          <rect
            x={dragRect.x1}
            y={dragRect.y1}
            width={Math.abs(dragRect.x2 - dragRect.x1)}
            height={Math.abs(dragRect.y2 - dragRect.y1)}
            fill="rgba(59,130,246,0.18)"
            stroke="#3b82f6"
            strokeWidth={0.35}
            strokeDasharray="1.2 0.8"
          />
        ) : null}
      </svg>
      {dragEnabled ? (
        <p className="pointer-events-none absolute bottom-2 left-0 right-0 text-center text-[10px] font-medium text-white/80 drop-shadow">
          드래그로 영역을 선택하면 부분 번역됩니다
        </p>
      ) : null}
    </div>
  );
}
