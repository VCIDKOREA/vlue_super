import { useCallback, useRef } from "react";

const DRAG_CLICK_THRESHOLD_PX = 8;

/** 가로 스크롤 — 터치 스와이프 + PC 드래그 (짧은 탭은 클릭으로 통과) */
export function useHorizontalDragScroll() {
  const scrollerRef = useRef(null);
  const dragRef = useRef({
    active: false,
    dragging: false,
    startX: 0,
    scrollLeft: 0,
    moved: false,
    pointerId: null
  });

  const endDrag = useCallback(() => {
    const el = scrollerRef.current;
    const d = dragRef.current;
    if (!d.active) return;
    const wasDragging = d.dragging;
    d.active = false;
    d.dragging = false;
    if (el && d.pointerId != null && el.releasePointerCapture) {
      try {
        el.releasePointerCapture(d.pointerId);
      } catch {
        /* ignore */
      }
    }
    d.pointerId = null;
    if (el) el.classList.remove("cursor-grabbing");
    if (!wasDragging) {
      d.moved = false;
      return;
    }
    window.setTimeout(() => {
      d.moved = false;
    }, 80);
  }, []);

  const onPointerDown = useCallback((e) => {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    const el = scrollerRef.current;
    if (!el) return;
    const d = dragRef.current;
    d.active = true;
    d.dragging = false;
    d.moved = false;
    d.startX = e.clientX;
    d.scrollLeft = el.scrollLeft;
    d.pointerId = e.pointerId;
  }, []);

  const onPointerMove = useCallback((e) => {
    const el = scrollerRef.current;
    const d = dragRef.current;
    if (!d.active || !el) return;
    const delta = e.clientX - d.startX;
    if (!d.dragging) {
      if (Math.abs(delta) < DRAG_CLICK_THRESHOLD_PX) return;
      d.dragging = true;
      d.moved = true;
      el.classList.add("cursor-grabbing");
      try {
        el.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    }
    el.scrollLeft = d.scrollLeft - delta;
  }, []);

  const guardClick = useCallback((fn) => {
    return (e) => {
      if (dragRef.current.moved) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      fn?.(e);
    };
  }, []);

  const scrollerProps = {
    onPointerDown,
    onPointerMove,
    onPointerUp: endDrag,
    onPointerCancel: endDrag,
    onLostPointerCapture: endDrag
  };

  return { scrollerRef, scrollerProps, guardClick };
}
