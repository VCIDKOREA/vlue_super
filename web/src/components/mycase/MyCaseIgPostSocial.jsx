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
import ShowcaseCommentSheet from "../showcase/ShowcaseCommentSheet.jsx";
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

export function pickLatestShowcaseComment(comments) {
  const list = Array.isArray(comments) ? comments.filter((c) => c && c.id) : [];
  if (!list.length) return null;
  return [...list].sort((a, b) => {
    const ta = Date.parse(a.createdAt) || 0;
    const tb = Date.parse(b.createdAt) || 0;
    return tb - ta;
  })[0];
}

export function showcaseCommentAuthorLabel(comment) {
  const author = comment?.author || {};
  return String(author.name || author.handle || "회원").replace(/^@+/, "").trim() || "회원";
}

export function showcaseCommentPreviewLine(body) {
  return String(body || "").replace(/\s+/g, " ").trim();
}

/**
 * 케이스함 게시물 — 좋아요·댓글·공유
 * - 모바일 피드: 바텀시트
 * - 데스크톱 모달: 사이드 인라인 댓글
 */
export default function MyCaseIgPostSocial({
  ownerUserId = "",
  slideId = "",
  displayName = "",
  peerPhone = "",
  variant = "fullscreen",
  onToast,
  pickButton = null,
  commentOpen: commentOpenProp,
  onCommentOpenChange,
  onCommentsChange,
  showFeedCommentPreview = false
}) {
  const ownerId = OWNER_UUID_RE.test(String(ownerUserId || "").trim()) ? String(ownerUserId).trim() : "";
  const sid = String(slideId || "").trim();
  const localOnly = !ownerId;
  const isFeedMobile = variant === "fullscreen";
  const isModalDesktop = variant === "modal";

  const likedRef = useRef(false);
  const likeCountRef = useRef(0);
  const likeGenRef = useRef(0);
  const commentsRef = useRef(null);
  const inputRef = useRef(null);

  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [commentCount, setCommentCount] = useState(0);
  const [seedComments, setSeedComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentMode, setCommentMode] = useState(false);
  const [draft, setDraft] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [commentOpenInternal, setCommentOpenInternal] = useState(false);
  const commentOpen = commentOpenProp ?? commentOpenInternal;
  const setCommentOpen = onCommentOpenChange ?? setCommentOpenInternal;

  const applyLike = useCallback((nextLiked, nextCount) => {
    likedRef.current = nextLiked;
    likeCountRef.current = nextCount;
    setLiked(nextLiked);
    setLikeCount(nextCount);
  }, []);

  const syncComments = useCallback(
    (list) => {
      const next = Array.isArray(list) ? list : [];
      setSeedComments(next);
      setCommentCount(next.length);
      onCommentsChange?.(next);
    },
    [onCommentsChange]
  );

  useEffect(() => {
    let cancelled = false;
    likeGenRef.current = 0;
    setCommentOpen(false);
    setCommentMode(false);
    setDraft("");
    if (!ownerId) {
      applyLike(false, 0);
      syncComments([]);
      setLoadingComments(false);
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
      syncComments(Array.isArray(res.comments) ? res.comments : []);
    });
    return () => {
      cancelled = true;
    };
  }, [ownerId, sid, applyLike, syncComments, setCommentOpen]);

  useEffect(() => {
    if (!isModalDesktop || !commentMode) return undefined;
    const t = window.setTimeout(() => inputRef.current?.focus?.(), 80);
    return () => window.clearTimeout(t);
  }, [isModalDesktop, commentMode]);

  useEffect(() => {
    if (!isModalDesktop || !commentMode) return undefined;
    const el = commentsRef.current;
    if (!el) return undefined;
    const t = window.setTimeout(() => {
      el.scrollTop = el.scrollHeight;
    }, 60);
    return () => window.clearTimeout(t);
  }, [isModalDesktop, commentMode, seedComments.length]);

  const threads = useMemo(() => groupCommentsWithReplies(seedComments), [seedComments]);

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
    if (isModalDesktop) {
      setCommentMode(true);
      commentsRef.current?.scrollIntoView?.({ block: "nearest" });
      return;
    }
    setCommentOpen(true);
  }, [localOnly, onToast, isModalDesktop, setCommentOpen]);

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
    const snapshot = seedComments;
    syncComments([...seedComments, optimistic]);
    setDraft("");
    setSubmitting(true);

    if (localOnly) {
      setSubmitting(false);
      return;
    }

    const res = await postShowcaseComment(ownerId, body, { slideId: sid });
    setSubmitting(false);
    if (!res.ok || !res.comment) {
      syncComments(snapshot);
      onToast?.(res.error || "댓글을 등록하지 못했습니다.");
      return;
    }
    syncComments([
      ...snapshot.filter((c) => c.id !== optimistic.id),
      { ...res.comment, mine: true }
    ]);
  }, [draft, submitting, localOnly, onToast, seedComments, syncComments, ownerId, sid]);

  const likeLabel = likeCount > 0 ? (likeCount > 999 ? "999+" : String(likeCount)) : "";
  const commentLabel = commentCount > 0 ? (commentCount > 999 ? "999+" : String(commentCount)) : "";
  const latestComment = useMemo(() => pickLatestShowcaseComment(seedComments), [seedComments]);

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
          <p className="my-case-ig-post__comment-meta">
            <strong>{author.name || "회원"}</strong>
            <ShowcaseCommentBody text={c.body} className="my-case-ig-post__comment-text" />
          </p>
        </div>
      </article>
    );
  };

  return (
    <>
      {isModalDesktop ? (
        <div ref={commentsRef} className="my-case-ig-post__comments" aria-label="댓글">
          {loadingComments && !seedComments.length ? (
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
          ) : (
            <p className="my-case-ig-post__comments-empty">첫 댓글을 남겨 보세요.</p>
          )}
        </div>
      ) : null}

      <div className={isFeedMobile ? "my-case-ig-post__social-wrap" : undefined}>
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
              aria-pressed={isModalDesktop ? commentMode : commentOpen}
              onClick={openComments}
            >
              <MessageCircle size={24} strokeWidth={1.8} />
              {commentLabel ? <span>{commentLabel}</span> : null}
            </button>
            <button type="button" className="my-case-ig-post__action" aria-label="공유" onClick={onShare}>
              <Send size={24} strokeWidth={1.8} />
            </button>
          </div>

          {isModalDesktop && commentMode ? (
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
      </div>

      {isFeedMobile && showFeedCommentPreview && latestComment ? (
        <button
          type="button"
          className="my-case-ig-post__comment-preview"
          onClick={openComments}
        >
          <strong>{showcaseCommentAuthorLabel(latestComment)}</strong>
          <span>{showcaseCommentPreviewLine(latestComment.body)}</span>
        </button>
      ) : null}

      {isFeedMobile ? (
        <ShowcaseCommentSheet
          open={commentOpen}
          onClose={() => setCommentOpen(false)}
          ownerUserId={ownerId}
          slideId={sid}
          seedComments={seedComments}
          onCountChange={setCommentCount}
          onCommentsChange={syncComments}
          onToast={onToast}
        />
      ) : null}
    </>
  );
}
