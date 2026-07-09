import { useEffect, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import CategoryMenuIcon from "./CategoryMenuIcon.jsx";

const PANEL_BOTTOM = "calc(4.25rem + env(safe-area-inset-bottom, 0px))";

/**
 * 검색창 왼쪽 카테고리(전체 ▾) 기준 쿠팡식 좌측 패널 — body 포털로 겹침
 */
export default function CategoryPickerOverlay({
  open,
  onClose,
  anchorRef,
  alignRef,
  value,
  onChange,
  options,
  theme,
  isDarkMode = false
}) {
  const [panelStyle, setPanelStyle] = useState(null);

  useLayoutEffect(() => {
    if (!open) {
      setPanelStyle(null);
      return undefined;
    }
    const measure = () => {
      const anchor = anchorRef?.current;
      const align = alignRef?.current || anchor;
      if (!anchor || !align) return;
      const a = anchor.getBoundingClientRect();
      const row = align.getBoundingClientRect();
      setPanelStyle({
        top: Math.round(a.bottom + 4),
        left: Math.round(row.left),
        width: Math.min(280, Math.max(240, row.width * 0.62))
      });
    };
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [open, anchorRef, alignRef]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (typeof document === "undefined" || !open) return null;

  const pos = panelStyle ?? { top: 120, left: 12, width: 260 };

  return createPortal(
    <div className="fixed inset-0 z-[110]" role="dialog" aria-modal="true" aria-label="카테고리 선택">
      <button type="button" className="absolute inset-0 bg-black/40" onClick={onClose} aria-label="카테고리 닫기" />
      <aside
        className={`absolute flex flex-col overflow-hidden rounded-br-xl border shadow-2xl ${theme.catDropdown}`}
        style={{
          top: pos.top,
          left: pos.left,
          width: pos.width,
          bottom: PANEL_BOTTOM,
          maxHeight: `calc(100dvh - ${pos.top}px - ${PANEL_BOTTOM})`
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <ul className="vlue-scroll-pad-bottom-nav min-h-0 flex-1 overflow-y-auto overscroll-y-contain py-1 [-webkit-overflow-scrolling:touch]">
          {options.map((name) => {
            const active = value === name;
            return (
              <li key={name}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(name);
                    onClose();
                  }}
                  className={`flex w-full items-center gap-3 border-b px-3 py-2.5 text-left text-[14px] font-medium leading-snug transition ${
                    isDarkMode ? "border-white/5" : "border-slate-100"
                  } ${
                    active
                      ? isDarkMode
                        ? "bg-blue-600/30 font-bold text-blue-200"
                        : "bg-blue-50 font-bold text-blue-700"
                      : theme.catDropdownItem
                  }`}
                >
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                      active
                        ? isDarkMode
                          ? "bg-blue-500/25 text-blue-200"
                          : "bg-blue-100 text-blue-600"
                        : isDarkMode
                          ? "bg-white/[0.06] text-slate-400"
                          : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    <CategoryMenuIcon categoryName={name} />
                  </span>
                  <span className="min-w-0 flex-1">{name}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </aside>
    </div>,
    document.body
  );
}