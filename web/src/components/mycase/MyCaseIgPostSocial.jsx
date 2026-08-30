import { useCallback, useEffect, useRef, useState } from "react";
import { Heart, MessageCircle, Send } from "lucide-react";
import {
  fetchShowcaseSocial,
  recordShowcaseShareApi,
  toggleShowcaseLikeApi
} from "../../lib/showcase/showcaseSocialApi.js";
import { shareShowcaseInviteViaKakao } from "../../lib/call/shareShowcaseInviteKakao.js";
import ShowcaseCommentSheet from "../showcase/ShowcaseCommentSheet.jsx";
import {
  hasVlueLoggedInSession,
  VLUE_MEMBERSHIP_REQUIRED_MSG
} from "../../lib/vlueGuestAuthGate.js";

const OWNER_UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * 케이스함 게시물 — 좋아요·댓글(바텀시트)·공유
 */
export default function MyCaseIgPostSocial({
  ownerUserId = "",
  slideId = "",
  displayName = "",
  peerPhone = "",
  variant = "fullscreen",
  onToast,
  pickButton = null
}) {
  const ownerId = OWNER_UUID_RE.test(String(ownerUserId || "").trim()) ? String(ownerUserId).trim() : "";
  const sid = String(slideId || "").trim();
  const localOnly = !ownerId;
  const isFeedMobile = variant === "fullscreen";

  const likedRef = useRef(false);
  const likeCountRef = useRef(0);
  const likeGenRef = useRef(0);

  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [commentCount, setCommentCount] = useState(0);
  const [seedComments, setSeedComments] = useState([]);
  const [commentOpen, setCommentOpen] = useState(false);

  const applyLike = useCallback((nextLiked, nextCount) => {
    likedRef.current = nextLiked;
    likeCountRef.current = nextCount;
    setLiked(nextLiked);
    setLikeCount(nextCount);
  }, []);

  useEffect(() => {
    let cancelled = false;
    likeGenRef.current = 0;
    setCommentOpen(false);
    if (!ownerId) {
      applyLike(false, 0);
      setCommentCount(0);
      setSeedComments([]);
      return undefined;
    }
    fetchShowcaseSocial(ownerId, { slideId: sid }).then((res) => {
      if (cancelled) return;
      if (!res.ok) return;
      if (likeGenRef.current === 0) {
        applyLike(res.likedByMe, res.likeCount);
      }
      const list = Array.isArray(res.comments) ? res.comments : [];
      setSeedComments(list);
      setCommentCount(list.length);
    });
    return () => {
      cancelled = true;
    };
  }, [ownerId, sid, applyLike]);

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
    setCommentOpen(true);
  }, [localOnly, onToast]);

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

  const likeLabel = likeCount > 0 ? (likeCount > 999 ? "999+" : String(likeCount)) : "";
  const commentLabel = commentCount > 0 ? (commentCount > 999 ? "999+" : String(commentCount)) : "";

  return (
    <>
      <footer className="my-case-ig-post__foot">
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
            onClick={openComments}
          >
            <MessageCircle size={24} strokeWidth={1.8} />
            {commentLabel ? <span>{commentLabel}</span> : null}
          </button>
          <button type="button" className="my-case-ig-post__action" aria-label="공유" onClick={onShare}>
            <Send size={24} strokeWidth={1.8} />
          </button>
        </div>
        {pickButton}
      </footer>

      {isFeedMobile || variant === "modal" ? (
        <ShowcaseCommentSheet
          open={commentOpen}
          onClose={() => setCommentOpen(false)}
          ownerUserId={ownerId}
          slideId={sid}
          seedComments={seedComments}
          onCountChange={setCommentCount}
          onToast={onToast}
        />
      ) : null}
    </>
  );
}
