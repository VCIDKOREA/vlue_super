import { Heart, MessageCircle, Send, MoreHorizontal } from "lucide-react";

/**
 * 쇼케이스 배너 우하단 액션 레일 — 좋아요 · 댓글 · 공유(비행기) · 더보기
 */
export default function ShowcaseSocialRail({
  liked = false,
  likeCount = 0,
  commentCount = 0,
  onLike,
  onComment,
  onShare,
  onMore
}) {
  const likeLabel = likeCount > 0 ? (likeCount > 999 ? "999+" : String(likeCount)) : "";
  const commentLabel = commentCount > 0 ? (commentCount > 999 ? "999+" : String(commentCount)) : "";

  return (
    <div className="showcase-social-rail" role="toolbar" aria-label="쇼케이스 액션">
      <button
        type="button"
        className={`showcase-social-rail__btn${liked ? " is-liked" : ""}`}
        aria-label="좋아요"
        aria-pressed={liked}
        onClick={(e) => {
          e.stopPropagation();
          onLike?.();
        }}
      >
        <Heart size={22} strokeWidth={2.2} fill={liked ? "currentColor" : "none"} aria-hidden />
        {likeLabel ? <span className="showcase-social-rail__count">{likeLabel}</span> : null}
      </button>
      <button
        type="button"
        className="showcase-social-rail__btn"
        aria-label="댓글"
        onClick={(e) => {
          e.stopPropagation();
          onComment?.();
        }}
      >
        <MessageCircle size={22} strokeWidth={2.2} aria-hidden />
        {commentLabel ? <span className="showcase-social-rail__count">{commentLabel}</span> : null}
      </button>
      <button
        type="button"
        className="showcase-social-rail__btn"
        aria-label="공유"
        onClick={(e) => {
          e.stopPropagation();
          onShare?.();
        }}
      >
        <Send size={22} strokeWidth={2.2} aria-hidden />
      </button>
      <button
        type="button"
        className="showcase-social-rail__btn"
        aria-label="더보기"
        onClick={(e) => {
          e.stopPropagation();
          onMore?.();
        }}
      >
        <MoreHorizontal size={22} strokeWidth={2.2} aria-hidden />
      </button>
    </div>
  );
}
