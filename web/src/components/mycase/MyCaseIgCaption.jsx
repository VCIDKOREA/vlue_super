import { useMemo, useState } from "react";

const CAPTION_PREVIEW_LEN = 72;

/**
 * 쇼케이스 소개글(캡션) — 길면 …더보기
 */
export default function MyCaseIgCaption({ handle = "", text = "", className = "" }) {
  const [expanded, setExpanded] = useState(false);
  const caption = String(text || "").trim();
  const needsMore = caption.length > CAPTION_PREVIEW_LEN;
  const preview = useMemo(() => {
    if (!needsMore || expanded) return caption;
    return `${caption.slice(0, CAPTION_PREVIEW_LEN).trim()}…`;
  }, [caption, expanded, needsMore]);

  if (!caption) return null;

  return (
    <p className={`my-case-ig-post__caption-text${className ? ` ${className}` : ""}`.trim()}>
      {handle ? <strong>{handle}</strong> : null}{" "}
      <span>{preview}</span>
      {needsMore && !expanded ? (
        <button type="button" className="my-case-ig-post__caption-more" onClick={() => setExpanded(true)}>
          더보기
        </button>
      ) : null}
    </p>
  );
}
