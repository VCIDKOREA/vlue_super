import { formatShowcaseLikeCountKo } from "../../lib/showcase/formatShowcaseLikeCount.js";

function likerHandle(author) {
  const handle = String(author?.handle || "").replace(/^@+/, "").trim();
  if (handle) return `@${handle}`;
  return String(author?.name || "회원").trim() || "회원";
}

/**
 * 인스타그램형 — (VLUE ID)님 외 17.5만명이 좋아합니다
 */
export default function ShowcaseLikeSummary({
  likeCount = 0,
  recentLiker = null,
  onOpenLikers,
  className = ""
}) {
  const total = Math.max(0, Math.floor(Number(likeCount) || 0));
  if (total <= 0) return null;

  const firstLabel = likerHandle(recentLiker);
  const countLabel = `${formatShowcaseLikeCountKo(total)}명`;

  if (total === 1) {
    return (
      <p className={`showcase-like-summary${className ? ` ${className}` : ""}`} aria-live="polite">
        <span className="showcase-like-summary__accent">{firstLabel}</span>
        <span>님이 좋아합니다</span>
      </p>
    );
  }

  return (
    <p className={`showcase-like-summary${className ? ` ${className}` : ""}`} aria-live="polite">
      <span className="showcase-like-summary__accent">{firstLabel}</span>
      <span>님 외 </span>
      <button
        type="button"
        className="showcase-like-summary__count"
        onClick={(e) => {
          e.stopPropagation();
          onOpenLikers?.();
        }}
      >
        <span className="showcase-like-summary__accent">{countLabel}</span>
      </button>
      <span>이 좋아합니다</span>
    </p>
  );
}
