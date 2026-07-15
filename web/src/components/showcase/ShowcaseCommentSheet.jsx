import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, Send } from "lucide-react";
import { fetchShowcaseComments, postShowcaseComment } from "../../lib/showcase/showcaseSocialApi.js";

/**
 * SAM/숏폼형 댓글 바텀시트
 */
export default function ShowcaseCommentSheet({
  open,
  onClose,
  ownerUserId = "",
  slideId = "",
  previewMode = false,
  seedComments = [],
  onCountChange,
  onToast
}) {
  const [comments, setComments] = useState(() => seedComments || []);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    setComments(seedComments || []);
    if (!ownerUserId || previewMode) return undefined;
    setLoading(true);
    fetchShowcaseComments(ownerUserId, { slideId }).then((res) => {
      if (cancelled) return;
      setLoading(false);
      if (res.ok) {
        setComments(res.comments);
        onCountChange?.(res.comments.length);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [open, ownerUserId, slideId, previewMode, seedComments, onCountChange]);

  if (!open || typeof document === "undefined") return null;

  const submit = async () => {
    const body = draft.trim();
    if (!body || busy) return;
    if (previewMode || !ownerUserId) {
      const local = {
        id: `local-${Date.now()}`,
        body,
        createdAt: new Date().toISOString(),
        author: { id: "me", handle: "", name: "나" }
      };
      const next = [local, ...comments];
      setComments(next);
      setDraft("");
      onCountChange?.(next.length);
      onToast?.("미리보기 댓글입니다. 실제 통화·열람에서 저장됩니다.");
      return;
    }
    setBusy(true);
    const res = await postShowcaseComment(ownerUserId, body, { slideId });
    setBusy(false);
    if (!res.ok) {
      onToast?.(res.error || "댓글을 남기지 못했습니다.");
      return;
    }
    const next = [res.comment, ...comments];
    setComments(next);
    setDraft("");
    onCountChange?.(next.length);
  };

  return createPortal(
    <div className="showcase-comment-sheet-root" role="dialog" aria-modal="true" aria-label="댓글">
      <button type="button" className="showcase-comment-sheet-backdrop" aria-label="닫기" onClick={onClose} />
      <div className="showcase-comment-sheet">
        <div className="showcase-comment-sheet__handle" aria-hidden />
        <header className="showcase-comment-sheet__head">
          <p className="showcase-comment-sheet__title">댓글 {comments.length > 0 ? comments.length : ""}</p>
          <button type="button" className="showcase-comment-sheet__close" onClick={onClose} aria-label="닫기">
            <X size={18} aria-hidden />
          </button>
        </header>
        <div className="showcase-comment-sheet__list">
          {loading ? (
            <p className="showcase-comment-sheet__empty">불러오는 중…</p>
          ) : !comments.length ? (
            <p className="showcase-comment-sheet__empty">첫 댓글을 남겨 보세요.</p>
          ) : (
            comments.map((c) => (
              <article key={c.id} className="showcase-comment-sheet__item">
                <div className="showcase-comment-sheet__avatar" aria-hidden>
                  {String(c.author?.name || "?").slice(0, 1)}
                </div>
                <div className="showcase-comment-sheet__body">
                  <p className="showcase-comment-sheet__author">{c.author?.name || "회원"}</p>
                  <p className="showcase-comment-sheet__text">{c.body}</p>
                </div>
              </article>
            ))
          )}
        </div>
        <div className="showcase-comment-sheet__composer">
          <input
            className="showcase-comment-sheet__input"
            placeholder="댓글 추가…"
            value={draft}
            maxLength={1000}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void submit();
              }
            }}
          />
          <button
            type="button"
            className="showcase-comment-sheet__send"
            disabled={busy || !draft.trim()}
            onClick={() => void submit()}
            aria-label="전송"
          >
            <Send size={18} aria-hidden />
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
