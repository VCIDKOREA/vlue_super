import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { searchShowcaseByTag } from "../../lib/showcase/showcaseTagsApi.js";
import { mapHashtagSearchHits } from "../../lib/followShowcaseEntries.js";
import { normalizeCommentHashtag } from "../../lib/showcase/commentRichText.js";

/**
 * 댓글 #해시태그 탭 → 반투명 인앱 검색 결과 팝업
 */
export default function HashtagSearchPopup({ tag = "", open = false, onClose, onSelectResult }) {
  const bare = normalizeCommentHashtag(tag);
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open || !bare) {
      setRows([]);
      setError("");
      setLoading(false);
      return undefined;
    }
    let cancelled = false;
    setLoading(true);
    setError("");
    setRows([]);
    searchShowcaseByTag(`#${bare}`, { mode: "hashtag" })
      .then((res) => {
        if (cancelled) return;
        setLoading(false);
        if (!res.ok) {
          setRows([]);
          setError(res.error || "검색에 실패했습니다.");
          return;
        }
        setRows(mapHashtagSearchHits(res.items || []));
      })
      .catch(() => {
        if (cancelled) return;
        setLoading(false);
        setRows([]);
        setError("검색에 실패했습니다.");
      });
    return () => {
      cancelled = true;
    };
  }, [open, bare]);

  if (!open || typeof document === "undefined") return null;

  const empty = !loading && !error && rows.length === 0;

  return createPortal(
    <div className="hashtag-search-popup-root" role="dialog" aria-modal="true" aria-label={`#${bare} 검색`}>
      <button type="button" className="hashtag-search-popup-backdrop" aria-label="닫기" onClick={onClose} />
      <div className="hashtag-search-popup">
        <header className="hashtag-search-popup__head">
          <div className="hashtag-search-popup__title-wrap">
            <p className="hashtag-search-popup__kicker">앱 내 검색</p>
            <h2 className="hashtag-search-popup__title">#{bare}</h2>
          </div>
          <button type="button" className="hashtag-search-popup__close" onClick={onClose} aria-label="닫기">
            <X size={18} aria-hidden />
          </button>
        </header>

        <div className="hashtag-search-popup__body">
          {loading ? (
            <p className="hashtag-search-popup__status">검색 중…</p>
          ) : error ? (
            <p className="hashtag-search-popup__status hashtag-search-popup__status--error">{error}</p>
          ) : empty ? (
            <p className="hashtag-search-popup__status">관련내용을 찾지 못하였습니다.</p>
          ) : (
            <ul className="hashtag-search-popup__list">
              {rows.map((row) => (
                <li key={row.id}>
                  <button
                    type="button"
                    className="hashtag-search-popup__row"
                    onClick={() => onSelectResult?.(row)}
                  >
                    <span className="hashtag-search-popup__avatar" aria-hidden>
                      {row.avatarUrl ? (
                        <img src={row.avatarUrl} alt="" loading="lazy" draggable={false} />
                      ) : (
                        String(row.name || "?").slice(0, 1)
                      )}
                    </span>
                    <span className="hashtag-search-popup__meta">
                      <span className="hashtag-search-popup__name">{row.name}</span>
                      <span className="hashtag-search-popup__sub">
                        {row.publicHandle ? `@${row.publicHandle}` : row.subtitle || "쇼케이스"}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
