import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { X, Send } from "lucide-react";
import { fetchShowcaseComments, postShowcaseComment } from "../../lib/showcase/showcaseSocialApi.js";
import { groupCommentsWithReplies } from "../../lib/showcase/commentRichText.js";
import ShowcaseCommentBody from "./ShowcaseCommentBody.jsx";

/**
 * SAM/숏폼형 댓글 바텀시트 — 답글 · #해시태그 · @멘션
 */
export default function ShowcaseCommentSheet({
  open,
  onClose,
  ownerUserId = "",
  slideId = "",
  previewMode = false,
  seedComments = [],
  onCountChange,
  onToast,
  onHashtag,
  onMention
}) {
  const [comments, setComments] = useState(() => seedComments || []);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [replyTo, setReplyTo] = useState(null);

  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    setComments(seedComments || []);
    setReplyTo(null);
    setDraft("");
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

  const threads = useMemo(() => groupCommentsWithReplies(comments), [comments]);
  const totalCount = comments.length;

  if (!open || typeof document === "undefined") return null;

  const startReply = (c) => {
    setReplyTo(c);
    const handle = String(c.author?.handle || "").replace(/^@+/, "");
    if (handle && !draft.trim()) setDraft(`@${handle} `);
  };

  const cancelReply = () => setReplyTo(null);

  const submit = async () => {
    const body = draft.trim();
    if (!body || busy) return;
    const parentId = replyTo?.id || null;

    if (previewMode || !ownerUserId) {
      const local = {
        id: `local-${Date.now()}`,
        body,
        parentId,
        createdAt: new Date().toISOString(),
        author: { id: "me", handle: "", name: "나" }
      };
      const next = [local, ...comments];
      setComments(next);
      setDraft("");
      setReplyTo(null);
      onCountChange?.(next.length);
      onToast?.("미리보기 댓글입니다. 실제 통화·열람에서 저장됩니다.");
      return;
    }
    setBusy(true);
    const res = await postShowcaseComment(ownerUserId, body, { slideId, parentId });
    setBusy(false);
    if (!res.ok) {
      const msg = String(res.error || "");
      if (/failed to fetch/i.test(msg) || res.status === 401) {
        onToast?.(
          res.status === 401 ? "로그인 후 댓글을 남길 수 있습니다." : "서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요."
        );
      } else {
        onToast?.(msg || "댓글을 남기지 못했습니다.");
      }
      return;
    }
    const next = [res.comment, ...comments];
    setComments(next);
    setDraft("");
    setReplyTo(null);
    onCountChange?.(next.length);
  };

  const renderItem = (c, { isReply = false } = {}) => (
    <article
      key={c.id}
      className={`showcase-comment-sheet__item${isReply ? " showcase-comment-sheet__item--reply" : ""}`}
    >
      <div className="showcase-comment-sheet__avatar" aria-hidden>
        {String(c.author?.name || "?").slice(0, 1)}
      </div>
      <div className="showcase-comment-sheet__body">
        <div className="showcase-comment-sheet__meta">
          <p className="showcase-comment-sheet__author">{c.author?.name || "회원"}</p>
          {c.author?.handle ? (
            <button
              type="button"
              className="showcase-comment-sheet__author-handle"
              onClick={() => onMention?.(String(c.author.handle).replace(/^@+/, ""))}
            >
              @{String(c.author.handle).replace(/^@+/, "")}
            </button>
          ) : null}
        </div>
        <ShowcaseCommentBody text={c.body} onHashtag={onHashtag} onMention={onMention} />
        {!isReply ? (
          <button type="button" className="showcase-comment-sheet__reply-btn" onClick={() => startReply(c)}>
            답글 달기
          </button>
        ) : null}
      </div>
    </article>
  );

  return createPortal(
    <div className="showcase-comment-sheet-root" role="dialog" aria-modal="true" aria-label="댓글">
      <button type="button" className="showcase-comment-sheet-backdrop" aria-label="닫기" onClick={onClose} />
      <div className="showcase-comment-sheet">
        <div className="showcase-comment-sheet__handle" aria-hidden />
        <header className="showcase-comment-sheet__head">
          <p className="showcase-comment-sheet__title">댓글 {totalCount > 0 ? totalCount : ""}</p>
          <button type="button" className="showcase-comment-sheet__close" onClick={onClose} aria-label="닫기">
            <X size={18} aria-hidden />
          </button>
        </header>
        <div className="showcase-comment-sheet__list">
          {loading ? (
            <p className="showcase-comment-sheet__empty">불러오는 중…</p>
          ) : !threads.length ? (
            <p className="showcase-comment-sheet__empty">첫 댓글을 남겨 보세요.</p>
          ) : (
            threads.map((root) => (
              <div key={root.id} className="showcase-comment-sheet__thread">
                {renderItem(root)}
                {(root.replies || []).map((r) => renderItem(r, { isReply: true }))}
              </div>
            ))
          )}
        </div>
        <div className="showcase-comment-sheet__composer-wrap">
          {replyTo ? (
            <div className="showcase-comment-sheet__replying">
              <span>
                <b>{replyTo.author?.name || "회원"}</b>님에게 답글 남기는 중
              </span>
              <button type="button" onClick={cancelReply} aria-label="답글 취소">
                취소
              </button>
            </div>
          ) : null}
          <div className="showcase-comment-sheet__composer">
            <input
              className="showcase-comment-sheet__input"
              placeholder={replyTo ? "답글 추가…" : "댓글 추가… #태그 @멘션"}
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
      </div>
    </div>,
    document.body
  );
}
