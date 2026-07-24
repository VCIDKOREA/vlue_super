import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Smile, X, Send } from "lucide-react";
import { fetchShowcaseComments, postShowcaseComment } from "../../lib/showcase/showcaseSocialApi.js";
import {
  dispatchCommentAuthor,
  dispatchCommentMention,
  groupCommentsWithReplies
} from "../../lib/showcase/commentRichText.js";
import { readProfilePhotoAvatar } from "../../lib/vlueAvatar.js";
import { getFeedDisplayName, getMemberHandle } from "../../lib/memberCardStorage.js";
import ShowcaseCommentBody from "./ShowcaseCommentBody.jsx";

const BASIC_EMOJIS = [
  "😀",
  "😂",
  "😍",
  "🥰",
  "😊",
  "👍",
  "👏",
  "🙏",
  "❤️",
  "🔥",
  "✨",
  "🎵",
  "💯",
  "🎉",
  "😮",
  "😢",
  "💪",
  "🙌"
];

function CommentAvatar({ author, onOpen }) {
  const url = String(author?.avatarUrl || "").trim();
  const letter = String(author?.name || author?.handle || "?").replace(/^@/, "").slice(0, 1) || "?";
  const inner = url ? (
    <div className="showcase-comment-sheet__avatar showcase-comment-sheet__avatar--photo" aria-hidden>
      <img src={url} alt="" loading="lazy" draggable={false} />
    </div>
  ) : (
    <div className="showcase-comment-sheet__avatar" aria-hidden>
      {letter}
    </div>
  );
  if (!onOpen) return inner;
  return (
    <button type="button" className="showcase-comment-sheet__avatar-btn" onClick={onOpen} aria-label="계정 케이스함">
      {inner}
    </button>
  );
}

function resolveMyCommentAuthor() {
  let handle = "";
  try {
    handle = String(getMemberHandle() || "")
      .replace(/^@/, "")
      .trim();
  } catch {
    /* ignore */
  }
  return {
    id: "me",
    handle,
    name: getFeedDisplayName(handle || "나"),
    avatarUrl: readProfilePhotoAvatar() || ""
  };
}

/**
 * SAM/숏폼형 댓글 바텀시트 — 답글 · #해시태그 · @멘션 · 이모티콘
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
  const [emojiOpen, setEmojiOpen] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    setComments(seedComments || []);
    setReplyTo(null);
    setDraft("");
    setEmojiOpen(false);
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

  const insertEmoji = (emoji) => {
    const el = inputRef.current;
    const value = draft;
    if (el && typeof el.selectionStart === "number") {
      const start = el.selectionStart;
      const end = el.selectionEnd ?? start;
      const next = `${value.slice(0, start)}${emoji}${value.slice(end)}`.slice(0, 1000);
      setDraft(next);
      requestAnimationFrame(() => {
        try {
          el.focus();
          const pos = start + emoji.length;
          el.setSelectionRange(pos, pos);
        } catch {
          /* ignore */
        }
      });
      return;
    }
    setDraft(`${value}${emoji}`.slice(0, 1000));
  };

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
        author: resolveMyCommentAuthor()
      };
      const next = [local, ...comments];
      setComments(next);
      setDraft("");
      setReplyTo(null);
      setEmojiOpen(false);
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
    const comment = res.comment
      ? {
          ...res.comment,
          author: {
            ...(res.comment.author || {}),
            name:
              String(res.comment.author?.name || "").trim() ||
              getFeedDisplayName(String(res.comment.author?.handle || "").trim() || "나"),
            avatarUrl:
              String(res.comment.author?.avatarUrl || "").trim() || readProfilePhotoAvatar() || ""
          }
        }
      : null;
    if (!comment) return;
    const next = [comment, ...comments];
    setComments(next);
    setDraft("");
    setReplyTo(null);
    setEmojiOpen(false);
    onCountChange?.(next.length);
  };

  const openAuthorCase = (author) => {
    onMention?.(String(author?.handle || "").replace(/^@+/, ""));
    dispatchCommentAuthor(author);
  };

  const renderItem = (c, { isReply = false } = {}) => {
    let author = c.author || {};
    try {
      const myId = String(localStorage.getItem("vlue_server_user_id") || "").trim();
      if (myId && String(author.id || "") === myId) {
        author = {
          ...author,
          name: getFeedDisplayName(author.name || author.handle || "나"),
          avatarUrl: String(author.avatarUrl || "").trim() || readProfilePhotoAvatar() || ""
        };
      }
    } catch {
      /* ignore */
    }
    return (
    <article
      key={c.id}
      className={`showcase-comment-sheet__item${isReply ? " showcase-comment-sheet__item--reply" : ""}`}
    >
      <CommentAvatar author={author} onOpen={() => openAuthorCase(author)} />
      <div className="showcase-comment-sheet__body">
        <div className="showcase-comment-sheet__meta">
          <button
            type="button"
            className="showcase-comment-sheet__author"
            onClick={() => openAuthorCase(author)}
          >
            {author?.name || "회원"}
          </button>
          {author?.handle ? (
            <button
              type="button"
              className="showcase-comment-sheet__author-handle"
              onClick={() => {
                const handle = String(author.handle).replace(/^@+/, "");
                onMention?.(handle);
                dispatchCommentMention(handle);
              }}
            >
              @{String(author.handle).replace(/^@+/, "")}
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
  };

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
          {emojiOpen ? (
            <div className="showcase-comment-sheet__emoji" role="listbox" aria-label="이모티콘">
              {BASIC_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  className="showcase-comment-sheet__emoji-btn"
                  onClick={() => insertEmoji(emoji)}
                  aria-label={`이모티콘 ${emoji}`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          ) : null}
          <div className="showcase-comment-sheet__composer">
            <button
              type="button"
              className={`showcase-comment-sheet__emoji-toggle${emojiOpen ? " is-open" : ""}`}
              aria-label={emojiOpen ? "이모티콘 닫기" : "이모티콘"}
              aria-expanded={emojiOpen}
              onClick={() => setEmojiOpen((v) => !v)}
            >
              <Smile size={20} aria-hidden />
            </button>
            <input
              ref={inputRef}
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
