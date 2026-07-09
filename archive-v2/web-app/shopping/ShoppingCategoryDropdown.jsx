import { useEffect, useRef, useState } from "react";
import CategoryMenuIcon from "./CategoryMenuIcon.jsx";

export default function ShoppingCategoryDropdown({
  value,
  options,
  onChange,
  className = "",
  label = "카테고리"
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const active = options.includes(value) ? value : options[0] || "전체";

  return (
    <div ref={rootRef} className={`mkt-store__category-dropdown ${className}`.trim()}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="mkt-store__category-trigger"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={`${label}: ${active}`}
      >
        <span className="mkt-store__category-trigger-icon" aria-hidden>
          <CategoryMenuIcon categoryName={active} className="h-4 w-4" />
        </span>
        <span className="mkt-store__category-trigger-label">{active}</span>
        <span className={`mkt-store__category-trigger-caret ${open ? "is-open" : ""}`} aria-hidden>
          ▼
        </span>
      </button>

      {open ? (
        <div className="mkt-store__category-menu" role="listbox" aria-label={label}>
          {options.map((name) => {
            const isActive = name === active;
            return (
              <button
                key={name}
                type="button"
                role="option"
                aria-selected={isActive}
                onClick={() => {
                  onChange(name);
                  setOpen(false);
                }}
                className={`mkt-store__category-option ${isActive ? "is-active" : ""}`}
              >
                <span className="mkt-store__category-option-icon" aria-hidden>
                  <CategoryMenuIcon categoryName={name} className="h-4 w-4" />
                </span>
                <span className="mkt-store__category-option-label">{name}</span>
                {isActive ? <span className="mkt-store__category-option-check">✓</span> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
