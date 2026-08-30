import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Heart, MessageCircle, Send } from "lucide-react";
import {
  fetchShowcaseSocial,
  postShowcaseComment,
  recordShowcaseShareApi,
  toggleShowcaseLikeApi
} from "../../lib/showcase/showcaseSocialApi.js";
import { shareShowcaseInviteViaKakao } from "../../lib/call/shareShowcaseInviteKakao.js";
import { groupCommentsWithReplies } from "../../lib/showcase/commentRichText.js";
import { readProfilePhotoAvatar } from "../../lib/vlueAvatar.js";
import { getFeedDisplayName, getMemberHandle } from "../../lib/memberCardStorage.js";
import ShowcaseCommentBody from "../showcase/ShowcaseCommentBody.jsx";
import {
  hasVlueLoggedInSession,
  VLUE_MEMBERSHIP_REQUIRED_MSG
} from "../../lib/vlueGuestAuthGate.js";

const OWNER_UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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
 * 케이스함 게시물 상세 — 좋아요·댓글·공유 (통화 쇼케이스 slideId 연동)
 */
export default function MyCaseIgPostSocial({
  ownerUserId = "",
  slideId = "",
  displayName = "",
  peerPhone = "",
  variant = "fullscreen",
  commentMode = false,
  onCommentModeChange,
  onToast,
  pickButton = null
}) {
  const ownerId = OWNER_UUID_RE.test(String(ownerUserId || "").trim()) ? String(ownerUserId).trim() : "";
  const sid = String(slideId || "").trim();
  const localOnly = !ownerId;

  const likedRef = useRef(false);
  const likeCountRef = useRef(0);
  const likeGenRef = useRef(0);
  const commentsRef = useRef(null);
  const inputRef = useRef(null);

  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [comments, setComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [draft, setDraft] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const applyLike = useCallback((nextLiked, nextCount) => {
    likedRef.current = nextLiked;
    likeCountRef.current = nextCount;
    setLiked(nextLiked);
    setLikeCount(nextCount);
  }, []);

  useEffect(() => {
    let cancelled = false;
    likeGenRef.current = 0;
    setDraft("");
    if (!ownerId) {
      applyLike(false, 0);
      setComments([]);
      return undefined;
    }
    setLoadingComments(true);
    fetchShowcaseSocial(ownerId, { slideId: sid }).then((res) => {
      if (cancelled) return;
      setLoadingComments(false);
      if (!res.ok) return;
      if (likeGenRef.current === 0) {
        applyLike(res.likedByMe, res.likeCount);
      }
      setComments(Array.isArray(res.comments) ? res.comments : []);
    });
    return () => {
      cancelled = true;
    };
  }, [ownerId, sid, applyLike]);

  useEffect(() => {
    if (!commentMode) return undefined;
    const t = window.setTimeout(() => inputRef.current?.focus?.(), 80);
    return () => window.clearTimeout(t);
  }, [commentMode]);

  useEffect(() => {
    if (!commentMode) return undefined;
    const el = commentsRef.current;
    if (!el) return undefined;
    const t = window.setTimeout(() => {
      el.scrollTop = el.scrollHeight;
    }, 60);
    return () => window.clearTimeout(t);
  }, [commentMode, comments.length]);

  const threads = useMemo(() => groupCommentsWithReplies(comments), [comments]);
  const commentCount = comments.length;

  const onLike = useCallback(() => {
    if (!localOnly && !hasVlueLoggedInSession()) {
      onToast?.(VLUE_MEMBERSHIP_REQUIRED_MSG);
      return;
    }
    const prevLiked = likedRef.current;
    const prevCount = likeCountRef.current;
    const nextLiked = !prevLiked;
    const nextCount = nextLiked ? prevCount + 1 : Math.max(0, prevCount - 1);
    applyLike(nextLiked, nextCount);
    if (localOnly) return;

    const gen = ++likeGenRef.current;
    void toggleShowcaseLikeApi(ownerId, { slideId: sid, liked: nextLiked }).then((res) => {
      if (gen !== likeGenRef.current) return;
      if (res.ok) {
        applyLike(res.likedByMe, res.likeCount);
        return;
      }
      if (res.status === 401) {
        applyLike(prevLiked, prevCount);
        onToast?.(VLUE_MEMBERSHIP_REQUIRED_MSG);
        return;
      }
      applyLike(prevLiked, prevCount);
      onToast?.(res.error || "좋아요에 실패했습니다.");
    });
  }, [ownerId, sid, localOnly, onToast, applyLike]);

  const openComments = useCallback(() => {
    if (!localOnly && !hasVlueLoggedInSession()) {
      onToast?.(VLUE_MEMBERSHIP_REQUIRED_MSG);
      return;
    }
    onCommentModeChange?.(true);
  }, [localOnly, onToast, onCommentModeChange]);

  const onShare = useCallback(async () => {
    if (!localOnly && !hasVlueLoggedInSession()) {
      onToast?.(VLUE_MEMBERSHIP_REQUIRED_MSG);
      return;
    }
    await shareShowcaseInviteViaKakao({
      inviteeName: displayName,
      phone: peerPhone,
      onToast
    });
    if (!localOnly && hasVlueLoggedInSession()) {
      void recordShowcaseShareApi(ownerId, { slideId: sid });
    }
  }, [displayName, peerPhone, onToast, localOnly, ownerId, sid]);

  const submitComment = useCallback(async () => {
    const body = draft.trim();
    if (!body || submitting) return;
    if (!localOnly && !hasVlueLoggedInSession()) {
      onToast?.(VLUE_MEMBERSHIP_REQUIRED_MSG);
      return;
    }

    const optimistic = {
      id: `local-${Date.now()}`,
      body,
      createdAt: new Date().toISOString(),
      mine: true,
      author: resolveMyCommentAuthor()
    };
    const snapshot = comments;
    setComments((prev) => [...prev, optimistic]);
    setDraft("");
    setSubmitting(true);

    if (localOnly) {
      setSubmitting(false);
      return;
    }

    const res = await postShowcaseComment(ownerId, body, { slideId: sid });
    setSubmitting(false);
    if (!res.ok || !res.comment) {
      setComments(snapshot);
      onToast?.(res.error || "댓글을 등록하지 못했습니다.");
      return;
    }
    setComments((prev) => {
      const without = prev.filter((c) => c.id !== optimistic.id);
      return [...without, { ...res.comment, mine: true }];
    });
  }, [draft, submitting, localOnly, onToast, comments, ownerId, sid]);

  const likeLabel = likeCount > 0 ? (likeCount > 999 ? "999+" : String(likeCount)) : "";
  const commentLabel = commentCount > 0 ? (commentCount > 999 ? "999+" : String(commentCount)) : "";

  const renderComment = (c, { isReply = false } = {}) => {
    const author = c.author || {};
    const letter = String(author.name || author.handle || "?").replace(/^@/, "").slice(0, 1) || "?";
    return (
      <article
        key={c.id}
        className={`my-case-ig-post__comment${isReply ? " my-case-ig-post__comment--reply" : ""}`}
      >
        <div className="my-case-ig-post__comment-avatar" aria-hidden>
          {author.avatarUrl ? <img src={author.avatarUrl} alt="" /> : letter}
        </div>
        <div className="my-case-ig-post__comment-body">
          <strong className="my-case-ig-post__comment-name">{author.name || "회원"}</strong>
          <ShowcaseCommentBody text={c.body} className="my-case-ig-post__comment-text" />
        </div>
      </article>
    );
  };

  return (
    <>
      <div
        ref={commentsRef}
        className={`my-case-ig-post__comments${commentMode ? " is-open" : ""}`}
        aria-label="댓글"
      >
        {loadingComments && !comments.length ? (
          <p className="my-case-ig-post__comments-empty">댓글 불러오는 중…</p>
        ) : threads.length ? (
          <div className="my-case-ig-post__comment-list">
            {threads.map(({ comment, replies }) => (
              <div key={comment.id} className="my-case-ig-post__comment-thread">
                {renderComment(comment)}
                {replies?.length ? replies.map((reply) => renderComment(reply, { isReply: true })) : null}
              </div>
            ))}
          </div>
        ) : commentMode ? (
          <p className="my-case-ig-post__comments-empty">첫 댓글을 남겨 보세요.</p>
        ) : null}
      </div>

      <footer className={`my-case-ig-post__foot${commentMode ? " is-commenting" : ""}`}>
        <div className="my-case-ig-post__actions" role="toolbar" aria-label="게시물 액션">
          <button
            type="button"
            className={`my-case-ig-post__action${liked ? " is-liked" : ""}`}
            aria-label="좋아요"
            aria-pressed={liked}
            onClick={onLike}
          >
            <Heart size={24} strokeWidth={1.8} fill={liked ? "currentColor" : "none"} />
            {likeLabel ? <span>{likeLabel}</span> : null}
          </button>
          <button
            type="button"
            className="my-case-ig-post__action"
            aria-label="댓글"
            aria-pressed={commentMode}
            onClick={openComments}
          >
            <MessageCircle size={24} strokeWidth={1.8} />
            {commentLabel ? <span>{commentLabel}</span> : null}
          </button>
          <button type="button" className="my-case-ig-post__action" aria-label="공유" onClick={onShare}>
            <Send size={24} strokeWidth={1.8} />
          </button>
        </div>

        {commentMode ? (
          <form
            className="my-case-ig-post__composer"
            onSubmit={(e) => {
              e.preventDefault();
              void submitComment();
            }}
          >
            <input
              ref={inputRef}
              type="text"
              className="my-case-ig-post__composer-input"
              value={draft}
              maxLength={1000}
              placeholder="댓글 달기…"
              onChange={(e) => setDraft(e.target.value)}
              enterKeyHint="send"
            />
            <button
              type="submit"
              className="my-case-ig-post__composer-send"
              disabled={!draft.trim() || submitting}
              aria-label="댓글 등록"
            >
              <Send size={18} strokeWidth={2.2} />
            </button>
          </form>
        ) : null}

        {pickButton}
      </footer>
    </>
  );
}
