import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { MYCASE_CATEGORY_FILTER_OPTIONS } from "../../lib/mycase/mycasePostPayload.js";
import "./my-case-category-sheet.css";

/**
 * 케이스함 카테고리 필터 — 아카이브 버튼으로 열기 (앱/웹 공통)
 */
export default function MyCaseCategorySheet({ open, onClose, value = "all", onChange }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="my-case-cat-sheet" role="presentation">
      <button type="button" className="my-case-cat-sheet__backdrop" onClick={onClose} aria-label="닫기" />
      <div className="my-case-cat-sheet__panel" role="dialog" aria-modal="true" aria-label="카테고리 선택">
        <header className="my-case-cat-sheet__head">
          <strong>아카이브 · 분류</strong>
          <button type="button" className="my-case-cat-sheet__close" onClick={onClose} aria-label="닫기">
            <X size={22} strokeWidth={2} />
          </button>
        </header>
        <ul className="my-case-cat-sheet__list">
          {MYCASE_CATEGORY_FILTER_OPTIONS.map((opt) => (
            <li key={opt.id}>
              <button
                type="button"
                className={`my-case-cat-sheet__opt${value === opt.id ? " is-active" : ""}`}
                onClick={() => onChange?.(opt.id)}
              >
                {opt.label}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>,
    document.body
  );
}
