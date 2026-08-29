import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { mycaseCategoryLabel, parseMycasePostPayload } from "../../lib/mycase/mycasePostPayload.js";
import "./my-case-search.css";

export default function MyCaseSearchModal({ open, items = [], onClose, onSelectItem }) {
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    const q = String(query || "").trim().toLowerCase();
    if (!q) return items.slice(0, 24);
    return items.filter((item) => {
      const parsed = parseMycasePostPayload(item?.payloadJson, item);
      const hay = [
        item?.title,
        parsed.caption,
        mycaseCategoryLabel(parsed.category)
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [items, query]);

  if (!open) return null;

  return (
    <div className="my-case-search" role="dialog" aria-modal="true" aria-label="케이스함 검색">
      <div className="my-case-search__backdrop" onClick={onClose} aria-hidden />
      <div className="my-case-search__panel">
        <header className="my-case-search__head">
          <Search size={20} strokeWidth={2} aria-hidden />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="게시물·카테고리 검색"
            aria-label="검색"
          />
          <button type="button" className="my-case-search__close" onClick={onClose} aria-label="닫기">
            <X size={22} />
          </button>
        </header>
        <ul className="my-case-search__results">
          {results.length === 0 ? (
            <li className="my-case-search__empty">검색 결과가 없습니다.</li>
          ) : (
            results.map((item) => {
              const parsed = parseMycasePostPayload(item?.payloadJson, item);
              const thumb = item?.thumbnailUrl || parsed.images[0]?.url || "";
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    className="my-case-search__row"
                    onClick={() => {
                      onSelectItem?.(item);
                      onClose?.();
                    }}
                  >
                    {thumb ? <img src={thumb} alt="" /> : <span className="my-case-search__ph" />}
                    <div>
                      <strong>{parsed.caption || item?.title || "게시물"}</strong>
                      <span>{mycaseCategoryLabel(parsed.category)}</span>
                    </div>
                  </button>
                </li>
              );
            })
          )}
        </ul>
      </div>
    </div>
  );
}
