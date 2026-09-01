import { useCallback, useEffect, useRef, useState } from "react";
import { Heart, MessageCircle, Send, MoreHorizontal, ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Instagram API 메타데이터 → VLUE 커스텀 쇼케이스 카드
 * - embed / iframe 없음
 * - media_url 을 <img src> 에 직접 사용 (서버 파일 저장 없음)
 */
export default function ShowcaseInstagramPost({
  username = "",
  profilePictureUrl = "",
  photos = [],
  caption = "",
  mediaId = "",
  permalink = "",
  verified = true,
  liked: likedProp,
  likeCount: likeCountProp = 0,
  commentCount = 0,
  onLike,
  onComment,
  onShare,
  onReport,
  onImageError
}) {
  const list = (Array.isArray(photos) ? photos : [])
    .map((p) => ({
      id: String(p?.id || p?.mediaId || "").trim(),
      url: String(p?.url || p?.mediaUrl || p?.media_url || p?.thumbnailUrl || "").trim()
    }))
    .filter((p) => p.url)
    .slice(0, 20);

  const [index, setIndex] = useState(0);
  const [liked, setLiked] = useState(Boolean(likedProp));
  const [likeCount, setLikeCount] = useState(Number(likeCountProp) || 0);
  const startX = useRef(0);
  const startY = useRef(0);
  const dragging = useRef(false);
  const axis = useRef(null);
  const movedRef = useRef(false);
  const tapArmedRef = useRef(false);
  const lastTapRef = useRef({ t: 0, x: 0 });
  const handle = String(username || "").trim().replace(/^@+/, "") || "instagram";
  const canSwipe = list.length > 1;

  useEffect(() => {
    setIndex(0);
  }, [list.map((p) => `${p.id}:${p.url}`).join("|")]);

  useEffect(() => {
    if (likedProp !== undefined) setLiked(Boolean(likedProp));
  }, [likedProp]);

  useEffect(() => {
    setLikeCount(Number(likeCountProp) || 0);
  }, [likeCountProp]);

  const go = useCallback(
    (dir) => {
      if (!canSwipe) return;
      setIndex((i) => Math.max(0, Math.min(list.length - 1, i + dir)));
    },
    [canSwipe, list.length]
  );

  const ctx = () => ({
    mediaId: mediaId || list[index]?.id || "",
    permalink: permalink || "",
    username: handle,
    photoIndex: index,
    mediaUrl: list[index]?.url || ""
  });

  /** placeholder — VLUE DB / Instagram Graph API 연동 지점 */
  const handleLike = () => {
    const nextLiked = !liked;
    setLiked(nextLiked);
    setLikeCount((n) => Math.max(0, n + (nextLiked ? 1 : -1)));
    // TODO: POST /api/lettering/showcase/social/:ownerId/like 또는 IG insights 연동
    onLike?.(ctx(), { liked: nextLiked });
  };

  const handleComment = () => {
    // TODO: 댓글 시트 오픈 + POST comments API
    onComment?.(ctx());
  };

  const handleShare = () => {
    // TODO: 카카오/시스템 공유 + 공유 이벤트 기록
    onShare?.(ctx());
  };

  const handleReport = () => {
    // TODO: 신고/차단 플로우 · VLUE 신고 API
    onReport?.(ctx());
  };

  const finishSwipe = useCallback(
    (clientX, clientY) => {
      if (!dragging.current) return;
      dragging.current = false;
      const dx = clientX - startX.current;
      const dy = clientY - startY.current;
      const locked = axis.current;
      axis.current = null;
      if (locked !== "x" || !canSwipe) return;
      if (Math.abs(dx) < 36) return;
      if (Math.abs(dx) < Math.abs(dy)) return;
      go(dx < 0 ? 1 : -1);
      lastTapRef.current = { t: 0, x: 0 };
    },
    [canSwipe, go]
  );

  const onPointerDown = (e) => {
    if (e.target?.closest?.("button, a")) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    movedRef.current = false;
    tapArmedRef.current = true;
    dragging.current = true;
    axis.current = null;
    startX.current = e.clientX;
    startY.current = e.clientY;
  };

  const onPointerMove = (e) => {
    if (!dragging.current) return;
    const dx = e.clientX - startX.current;
    const dy = e.clientY - startY.current;
    if (Math.abs(dx) > 10 || Math.abs(dy) > 10) movedRef.current = true;
    if (axis.current == null && (Math.abs(dx) > 10 || Math.abs(dy) > 10)) {
      axis.current = Math.abs(dx) >= Math.abs(dy) ? "x" : "y";
      if (axis.current === "x") {
        e.stopPropagation();
        try {
          e.currentTarget.setPointerCapture?.(e.pointerId);
        } catch {
          /* ignore */
        }
      } else {
        dragging.current = false;
      }
    } else if (axis.current === "x") {
      e.stopPropagation();
      if (e.cancelable) e.preventDefault();
    }
  };

  const onPointerUp = (e) => {
    if (!dragging.current && axis.current == null) return;
    const moved = movedRef.current || axis.current === "x";
    if (axis.current === "x") e.stopPropagation();
    try {
      e.currentTarget.releasePointerCapture?.(e.pointerId);
    } catch {
      /* ignore */
    }
    finishSwipe(e.clientX, e.clientY);
    if (tapArmedRef.current && !moved) {
      const now = Date.now();
      const prev = lastTapRef.current;
      if (now - prev.t < 320 && Math.abs(e.clientX - prev.x) < 36) {
        lastTapRef.current = { t: 0, x: 0 };
        if (!liked) handleLike();
      } else {
        lastTapRef.current = { t: now, x: e.clientX };
      }
    }
    tapArmedRef.current = false;
    movedRef.current = false;
  };

  const onTouchStart = (e) => {
    if (!canSwipe) return;
    if (e.target?.closest?.("button, a")) return;
    const t = e.touches?.[0];
    if (!t) return;
    dragging.current = true;
    axis.current = null;
    movedRef.current = false;
    tapArmedRef.current = true;
    startX.current = t.clientX;
    startY.current = t.clientY;
  };

  const onTouchMove = (e) => {
    if (!dragging.current || !canSwipe) return;
    const t = e.touches?.[0];
    if (!t) return;
    const dx = t.clientX - startX.current;
    const dy = t.clientY - startY.current;
    if (Math.abs(dx) > 10 || Math.abs(dy) > 10) movedRef.current = true;
    if (axis.current == null && (Math.abs(dx) > 10 || Math.abs(dy) > 10)) {
      axis.current = Math.abs(dx) >= Math.abs(dy) ? "x" : "y";
      if (axis.current === "y") dragging.current = false;
    }
    if (axis.current === "x") {
      e.stopPropagation();
      if (e.cancelable) e.preventDefault();
    }
  };

  const onTouchEnd = (e) => {
    if (!dragging.current && axis.current == null) return;
    const t = e.changedTouches?.[0];
    if (axis.current === "x") e.stopPropagation();
    finishSwipe(t?.clientX ?? startX.current, t?.clientY ?? startY.current);
    tapArmedRef.current = false;
    movedRef.current = false;
  };

  if (!list.length) {
    return (
      <div className="showcase-ig-post showcase-ig-post--empty" role="status">
        <p>표시할 사진이 없습니다</p>
        <p className="showcase-ig-post__empty-hint">Instagram 연동 후 게시물을 선택해 주세요.</p>
      </div>
    );
  }

  const safeIndex = Math.min(index, list.length - 1);
  const current = list[safeIndex];
  const avatarLetter = handle.slice(0, 1).toUpperCase();

  return (
    <article className="showcase-ig-post" data-media-id={mediaId || current.id}>
      <header className="showcase-ig-post__header">
        <div className="showcase-ig-post__avatar" aria-hidden>
          {profilePictureUrl ? (
            <img
              src={profilePictureUrl}
              alt=""
              className="showcase-ig-post__avatar-img"
              loading="lazy"
              draggable={false}
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          ) : (
            <span className="showcase-ig-post__avatar-letter">{avatarLetter}</span>
          )}
        </div>
        <div className="showcase-ig-post__identity">
          <p className="showcase-ig-post__username">
            @{handle}
            {verified ? (
              <span className="showcase-ig-post__verified" title="Instagram 인증" aria-label="인증">
                ✓
              </span>
            ) : null}
          </p>
          <p className="showcase-ig-post__badge">Instagram · VLUE</p>
        </div>
      </header>

      <div
        className={`showcase-ig-post__media${canSwipe ? " is-swipeable" : ""}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          dragging.current = false;
          axis.current = null;
          movedRef.current = false;
          tapArmedRef.current = false;
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={() => {
          dragging.current = false;
          axis.current = null;
          movedRef.current = false;
          tapArmedRef.current = false;
        }}
      >
        {/* 현재 + 인접 사진만 로드 (lazy carousel) */}
        {list.map((p, i) => {
          const near = Math.abs(i - safeIndex) <= 1;
          if (!near && i !== safeIndex) return null;
          const active = i === safeIndex;
          return (
            <img
              key={p.id || p.url}
              src={p.url}
              alt=""
              className={`showcase-ig-post__img${active ? " is-active" : " is-preload"}`}
              loading={active ? "eager" : "lazy"}
              decoding="async"
              draggable={false}
              hidden={!active}
              onError={() => active && onImageError?.(p)}
            />
          );
        })}
        <div className="showcase-ig-post__veil" aria-hidden />

        {canSwipe ? (
          <>
            <button
              type="button"
              className="showcase-ig-post__nav showcase-ig-post__nav--prev"
              aria-label="이전 사진"
              disabled={safeIndex <= 0}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                go(-1);
              }}
              onPointerDown={(e) => e.stopPropagation()}
              onPointerUp={(e) => e.stopPropagation()}
            >
              <ChevronLeft className="h-5 w-5" strokeWidth={2.4} aria-hidden />
            </button>
            <button
              type="button"
              className="showcase-ig-post__nav showcase-ig-post__nav--next"
              aria-label="다음 사진"
              disabled={safeIndex >= list.length - 1}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                go(1);
              }}
              onPointerDown={(e) => e.stopPropagation()}
              onPointerUp={(e) => e.stopPropagation()}
            >
              <ChevronRight className="h-5 w-5" strokeWidth={2.4} aria-hidden />
            </button>
            <div className="showcase-ig-post__dots" role="tablist" aria-label="사진">
              {list.map((p, i) => (
                <button
                  key={p.id || i}
                  type="button"
                  className={`showcase-ig-post__dot${i === safeIndex ? " is-active" : ""}`}
                  aria-label={`사진 ${i + 1}`}
                  aria-selected={i === safeIndex}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIndex(i);
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                  onPointerUp={(e) => e.stopPropagation()}
                />
              ))}
            </div>
          </>
        ) : null}
      </div>

      <div className="showcase-ig-post__actions" role="toolbar" aria-label="쇼케이스 액션">
        <button
          type="button"
          className={`showcase-ig-post__action${liked ? " is-liked" : ""}`}
          aria-label="좋아요"
          aria-pressed={liked}
          onClick={(e) => {
            e.stopPropagation();
            handleLike();
          }}
        >
          <Heart size={22} strokeWidth={2.2} fill={liked ? "currentColor" : "none"} aria-hidden />
          {likeCount > 0 ? (
            <span className="showcase-ig-post__action-count">
              {likeCount > 999 ? "999+" : String(likeCount)}
            </span>
          ) : null}
        </button>
        <button
          type="button"
          className="showcase-ig-post__action"
          aria-label="댓글"
          onClick={(e) => {
            e.stopPropagation();
            handleComment();
          }}
        >
          <MessageCircle size={22} strokeWidth={2.2} aria-hidden />
          {commentCount > 0 ? (
            <span className="showcase-ig-post__action-count">
              {commentCount > 999 ? "999+" : String(commentCount)}
            </span>
          ) : null}
        </button>
        <button
          type="button"
          className="showcase-ig-post__action"
          aria-label="공유"
          onClick={(e) => {
            e.stopPropagation();
            handleShare();
          }}
        >
          <Send size={22} strokeWidth={2.2} aria-hidden />
        </button>
        <button
          type="button"
          className="showcase-ig-post__action"
          aria-label="신고 · 더보기"
          onClick={(e) => {
            e.stopPropagation();
            handleReport();
          }}
        >
          <MoreHorizontal size={22} strokeWidth={2.2} aria-hidden />
        </button>
      </div>

      {caption ? <p className="showcase-ig-post__caption">{caption}</p> : null}
    </article>
  );
}
