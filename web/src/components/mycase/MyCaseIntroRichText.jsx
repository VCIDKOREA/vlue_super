import {
  openIntroHashtag,
  openIntroMention,
  parseIntroRichText
} from "../../lib/mycase/mycaseIntroRichText.js";

/**
 * 케이스함 소개글 — URL · @ · # 시안블루 링크 (줄바꿈 유지)
 */
export default function MyCaseIntroRichText({ text = "" }) {
  const parts = parseIntroRichText(text);
  if (!parts.length) return null;

  return parts.map((p, i) => {
    if (p.type === "url") {
      return (
        <a
          key={`u-${i}`}
          className="ig-mycase__intro-link"
          href={p.href || p.value}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
        >
          {p.raw}
        </a>
      );
    }
    if (p.type === "hashtag") {
      return (
        <button
          key={`h-${i}`}
          type="button"
          className="ig-mycase__intro-link"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            openIntroHashtag(p.value);
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
          className="ig-mycase__intro-link"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            openIntroMention(p.value);
          }}
        >
          @{p.value}
        </button>
      );
    }
    return <span key={`t-${i}`}>{p.value}</span>;
  });
}
