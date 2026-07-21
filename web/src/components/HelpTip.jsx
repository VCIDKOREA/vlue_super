import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { HelpCircle } from "lucide-react";
import "./help-tip.css";

/** 라벨 옆 (?) — 탭하면 상세 설명 */
export default function HelpTip({ text, isDarkMode = false }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const btnRef = useRef(null);
  const tip = String(text || "").trim();

  useEffect(() => {
    if (!open) {
      setPos(null);
      return undefined;
    }
    const place = () => {
      const el = btnRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const popW = Math.min(280, window.innerWidth - 24);
      let left = Math.max(12, Math.min(r.left, window.innerWidth - popW - 12));
      const spaceBelow = window.innerHeight - r.bottom;
      const openAbove = spaceBelow < 160;
      setPos({
        left,
        width: popW,
        top: openAbove ? undefined : r.bottom + 8,
        bottom: openAbove ? window.innerHeight - r.top + 8 : undefined
      });
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      if (btnRef.current?.contains(e.target)) return;
      if (e.target?.closest?.(".vlue-help-tip__pop")) return;
      setOpen(false);
    };
    document.addEventListener("pointerdown", onDoc);
    return () => document.removeEventListener("pointerdown", onDoc);
  }, [open]);

  if (!tip) return null;

  return (
    <span className="vlue-help-tip" data-theme={isDarkMode ? "dark" : "light"}>
      <span
        ref={btnRef}
        role="button"
        tabIndex={0}
        className="vlue-help-tip__btn"
        aria-label="도움말"
        aria-expanded={open}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            e.stopPropagation();
            setOpen((v) => !v);
          }
        }}
      >
        <HelpCircle size={14} strokeWidth={2.2} aria-hidden />
      </span>
      {open && pos
        ? createPortal(
            <span
              className="vlue-help-tip__pop"
              role="tooltip"
              style={{
                left: pos.left,
                width: pos.width,
                top: pos.top,
                bottom: pos.bottom
              }}
            >
              {tip}
            </span>,
            document.body
          )
        : null}
    </span>
  );
}
