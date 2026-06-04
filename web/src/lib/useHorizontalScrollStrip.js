import { useCallback, useEffect, useRef, useState } from "react";

/**
 * 가로 탭/칩 스트립 — 터치 스와이프 + 마우스 드래그 + 휠(세로→가로)
 */
export function useHorizontalScrollStrip(active = true) {
  const ref = useRef(null);
  const dragRef = useRef({ active: false, startX: 0, scrollLeft: 0, moved: false });
  const [isDragging, setIsDragging] = useState(false);

  const onMouseDown = useCallback((e) => {
    if (e.button !== 0) return;
    const el = ref.current;
    if (!el) return;
    dragRef.current = {
      active: true,
      startX: e.pageX,
      scrollLeft: el.scrollLeft,
      moved: false
    };
    setIsDragging(true);
  }, []);

  useEffect(() => {
    const onMove = (e) => {
      if (!dragRef.current.active || !ref.current) return;
      const dx = e.pageX - dragRef.current.startX;
      if (Math.abs(dx) > 4) dragRef.current.moved = true;
      ref.current.scrollLeft = dragRef.current.scrollLeft - dx;
    };
    const onUp = () => {
      if (!dragRef.current.active) return;
      dragRef.current.active = false;
      setIsDragging(false);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  useEffect(() => {
    if (!active) return undefined;
    let el = null;
    let onWheel = null;
    const frame = requestAnimationFrame(() => {
      el = ref.current;
      if (!el) return;
      onWheel = (e) => {
        if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
        const max = el.scrollWidth - el.clientWidth;
        if (max <= 0) return;
        el.scrollLeft = Math.max(0, Math.min(max, el.scrollLeft + e.deltaY));
        e.preventDefault();
      };
      el.addEventListener("wheel", onWheel, { passive: false });
    });
    return () => {
      cancelAnimationFrame(frame);
      if (el && onWheel) el.removeEventListener("wheel", onWheel);
    };
  }, [active]);

  const wrapClick = useCallback((handler) => {
    return (e) => {
      if (dragRef.current.moved) {
        e.preventDefault();
        e.stopPropagation();
        dragRef.current.moved = false;
        return;
      }
      handler?.(e);
    };
  }, []);

  const stripClassName = `cursor-grab select-none active:cursor-grabbing${isDragging ? " cursor-grabbing" : ""}`;

  return { ref, onMouseDown, wrapClick, stripClassName, isDragging };
}
