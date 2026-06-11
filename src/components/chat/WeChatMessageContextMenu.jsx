import { useEffect, useLayoutEffect, useRef, useState } from "react";

const MENU_ITEMS = [
  { id: "reply", label: "답장" },
  { id: "translate", label: "번역" },
  { id: "translate-enhanced", label: "고도화 번역" },
  { id: "copy", label: "복사" },
  { id: "forward", label: "전달" },
  { id: "delete", label: "삭제", danger: true },
  { id: "favorite", label: "즐겨찾기" },
  { id: "more", label: "더보기" }
];

export default function WeChatMessageContextMenu({ open, anchor, message, isDarkMode = false, onAction, onClose }) {
  const ref = useRef(null);
  const [pos, setPos] = useState({ top: 0, left: 0, flip: false });

  useLayoutEffect(() => {
    if (!open || !anchor) return;
    const menuH = 220;
    const menuW = 168;
    const margin = 12;
    const vh = typeof window !== "undefined" ? window.innerHeight : 800;
    const vw = typeof window !== "undefined" ? window.innerWidth : 400;
    const flip = anchor.y > vh * 0.52;
    let top = flip ? anchor.y - menuH - margin : anchor.y + margin;
    let left = Math.min(Math.max(margin, anchor.x - menuW / 2), vw - menuW - margin);
    top = Math.min(Math.max(margin, top), vh - menuH - margin);
    setPos({ top, left, flip });
  }, [open, anchor]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !message) return null;

  const shell = isDarkMode
    ? "border-white/15 bg-[#1a2233] text-gray-100 shadow-2xl"
    : "border-gray-200 bg-white text-gray-800 shadow-xl";

  return (
    <>
      <button type="button" className="fixed inset-0 z-[9998] bg-transparent" aria-label="닫기" onClick={onClose} />
      <div
        ref={ref}
        className={`fixed z-[9999] min-w-[156px] overflow-hidden rounded-xl border py-1 ${shell}`}
        style={{ top: pos.top, left: pos.left }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {MENU_ITEMS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onAction?.(item.id, message)}
            className={`w-full px-4 py-2.5 text-left text-[14px] ${
              item.danger
                ? isDarkMode
                  ? "text-rose-400 hover:bg-rose-950/40"
                  : "text-red-500 hover:bg-red-50"
                : isDarkMode
                  ? "hover:bg-white/10"
                  : "hover:bg-gray-50"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
    </>
  );
}
