import { useCallback, useEffect, useRef, useState } from "react";
import { StickyNote, X } from "lucide-react";

const MEMO_KEY_PREFIX = "vlue_call_line_memo_v1:";

/**
 * 유선상 메모 — 드래그 가능 플로팅 볼 + 입력 패널
 */
export default function TentFloatingMemo({ callId = "default", peerPhone = "", visible = true }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [pos, setPos] = useState({ x: 16, y: 120 });
  const drag = useRef({ active: false, ox: 0, oy: 0, moved: false });
  const storageKey = `${MEMO_KEY_PREFIX}${peerPhone || callId}`;

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) setText(raw);
    } catch {
      /* ignore */
    }
  }, [storageKey]);

  const persist = useCallback(
    (value) => {
      setText(value);
      try {
        localStorage.setItem(storageKey, value);
      } catch {
        /* ignore */
      }
    },
    [storageKey]
  );

  const onPointerDown = (e) => {
    drag.current = { active: true, ox: e.clientX - pos.x, oy: e.clientY - pos.y, moved: false };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e) => {
    if (!drag.current.active) return;
    const nx = e.clientX - drag.current.ox;
    const ny = e.clientY - drag.current.oy;
    if (Math.abs(nx - pos.x) > 4 || Math.abs(ny - pos.y) > 4) drag.current.moved = true;
    setPos({
      x: Math.max(8, Math.min(window.innerWidth - 64, nx)),
      y: Math.max(8, Math.min(window.innerHeight - 64, ny))
    });
  };

  const onPointerUp = () => {
    const wasDrag = drag.current.moved;
    drag.current.active = false;
    if (!wasDrag) setOpen((v) => !v);
  };

  if (!visible) return null;

  return (
    <div className="tent-memo" style={{ left: pos.x, top: pos.y }}>
      <button
        type="button"
        className="tent-memo__ball"
        aria-label="유선상 메모"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          drag.current.active = false;
        }}
      >
        <StickyNote size={20} aria-hidden />
      </button>
      {open ? (
        <div className="tent-memo__panel">
          <div className="tent-memo__head">
            <span>유선상 메모</span>
            <button type="button" aria-label="닫기" onClick={() => setOpen(false)}>
              <X size={16} />
            </button>
          </div>
          <textarea
            className="tent-memo__input"
            rows={4}
            placeholder="통화 중 메모를 남기세요…"
            value={text}
            onChange={(e) => persist(e.target.value)}
          />
        </div>
      ) : null}
    </div>
  );
}
