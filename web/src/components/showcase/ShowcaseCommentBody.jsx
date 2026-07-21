import {
  dispatchCommentHashtag,
  dispatchCommentMention,
  parseCommentRichText
} from "../../lib/showcase/commentRichText.js";

/**
 * 댓글 본문 — #해시태그 · @멘션 강조
 */
export default function ShowcaseCommentBody({ text = "", onHashtag, onMention, className = "" }) {
  const parts = parseCommentRichText(text);

  return (
    <p className={`showcase-comment-sheet__text${className ? ` ${className}` : ""}`.trim()}>
      {parts.map((p, i) => {
        if (p.type === "hashtag") {
          return (
            <button
              key={`h-${i}`}
              type="button"
              className="showcase-comment-sheet__chip showcase-comment-sheet__chip--tag"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onHashtag?.(p.value);
                dispatchCommentHashtag(p.value);
              }}
            >
              #{p.value}
            </button>
          );
        }
        if (p.type === "mention") {
          return (
            <button
              key={`m-${i}`}
              type="button"
              className="showcase-comment-sheet__chip showcase-comment-sheet__chip--mention"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onMention?.(p.value);
                dispatchCommentMention(p.value);
              }}
            >
              @{p.value}
            </button>
          );
        }
        return <span key={`t-${i}`}>{p.value}</span>;
      })}
    </p>
  );
}
