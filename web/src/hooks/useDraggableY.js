import { useCallback, useRef, useState } from "react";

/**
 * 세로 드래그 오프셋 (px) — 빅푸시 알림 이동용
 */
export function useDraggableY({ initialY = 0, minY = 0, maxY = 480 } = {}) {
  const [offsetY, setOffsetY] = useState(initialY);
  const dragRef = useRef({ active: false, startY: 0, startOffset: 0 });

  const onPointerMove = useCallback(
    (e) => {
      if (!dragRef.current.active) return;
      const delta = e.clientY - dragRef.current.startY;
      const next = Math.min(maxY, Math.max(minY, dragRef.current.startOffset + delta));
      setOffsetY(next);
    },
    [minY, maxY]
  );

  const endDrag = useCallback(() => {
    if (!dragRef.current.active) return;
    dragRef.current.active = false;
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", endDrag);
    window.removeEventListener("pointercancel", endDrag);
  }, [onPointerMove]);

  const onPointerDown = useCallback(
    (e) => {
      if (e.button !== 0) return;
      dragRef.current = { active: true, startY: e.clientY, startOffset: offsetY };
      window.addEventListener("pointermove", onPointerMove);
      window.addEventListener("pointerup", endDrag);
      window.addEventListener("pointercancel", endDrag);
      e.currentTarget.setPointerCapture(e.pointerId);
      e.preventDefault();
    },
    [offsetY, onPointerMove, endDrag]
  );

  const onPointerUp = useCallback(
    (e) => {
      endDrag();
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        /* noop */
      }
    },
    [endDrag]
  );

  const reset = useCallback(() => setOffsetY(initialY), [initialY]);

  return { offsetY, setOffsetY, reset, onPointerDown, onPointerMove, onPointerUp };
}
