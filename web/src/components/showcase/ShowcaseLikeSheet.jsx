import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { fetchShowcaseLikes } from "../../lib/showcase/showcaseSocialApi.js";
import { COMMENT_CASE_USER_EVENT } from "../../lib/showcase/commentRichText.js";

function LikeRow({ author, onOpen }) {
  const handle = String(author?.handle || "").replace(/^@+/, "").trim();
  const name = String(author?.name || handle || "회원").trim();
  const url = String(author?.avatarUrl || "").trim();
  const letter = (handle || name).replace(/^@/, "").slice(0, 1) || "?";

  return (
    <button type="button" className="showcase-like-sheet__row" onClick={() => onOpen?.(author)}>
      <span className="showcase-like-sheet__avatar" aria-hidden>
        {url ? <img src={url} alt="" loading="lazy" draggable={false} /> : letter}
      </span>
      <span className="showcase-like-sheet__meta">
        <span className="showcase-like-sheet__name">{handle ? `@${handle}` : name}</span>
        {handle && name && name !== handle ? (
          <span className="showcase-like-sheet__sub">{name}</span>
        ) : null}
      </span>
    </button>
  );
}

export default function ShowcaseLikeSheet({ open, onClose, ownerUserId = "", slideId = "" }) {
  const [likes, setLikes] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !ownerUserId) return undefined;
    let cancelled = false;
    setLoading(true);
    fetchShowcaseLikes(ownerUserId, { slideId }).then((res) => {
      if (cancelled) return;
      setLoading(false);
      setLikes(Array.isArray(res.likes) ? res.likes : []);
    });
    return () => {
      cancelled = true;
    };
  }, [open, ownerUserId, slideId]);

  const openUser = (author) => {
    const detail = {
      userId: String(author?.id || "").trim() || undefined,
      handle: String(author?.handle || "").replace(/^@+/, "").trim(),
      name: String(author?.name || "").trim()
    };
    window.dispatchEvent(new CustomEvent(COMMENT_CASE_USER_EVENT, { detail }));
    onClose?.();
  };

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="showcase-like-sheet__scrim" role="presentation" onClick={onClose}>
      <div
        className="showcase-like-sheet"
        role="dialog"
        aria-modal="true"
        aria-label="좋아요"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="showcase-like-sheet__head">
          <h3 className="showcase-like-sheet__title">좋아요</h3>
          <button type="button" className="showcase-like-sheet__close" onClick={onClose} aria-label="닫기">
            <X size={18} aria-hidden />
          </button>
        </header>
        <div className="showcase-like-sheet__body">
          {loading ? <p className="showcase-like-sheet__loading">불러오는 중…</p> : null}
          {!loading && !likes.length ? (
            <p className="showcase-like-sheet__empty">아직 좋아요가 없습니다.</p>
          ) : null}
          {likes.map((row) => (
            <LikeRow key={row.id} author={row.author} onOpen={openUser} />
          ))}
        </div>
      </div>
    </div>,
    document.body
  );
}
