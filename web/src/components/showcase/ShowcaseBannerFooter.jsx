import { useState } from "react";

/**
 * 쇼케이스 배너 좌하단 — 5 아바타 · 6 캡션/상태
 */
export default function ShowcaseBannerFooter({
  avatarUrl = "",
  name = "",
  caption = "",
  logoLetter = ""
}) {
  const [expanded, setExpanded] = useState(false);
  const letter = String(logoLetter || name || "?").trim().slice(0, 1).toUpperCase() || "?";
  const text = String(caption || "").trim();
  const canExpand = text.length > 48;

  return (
    <div className="showcase-banner-footer">
      <div className="showcase-banner-footer__avatar" aria-hidden={!avatarUrl && !letter}>
        {avatarUrl ? (
          <img src={avatarUrl} alt="" className="showcase-banner-footer__avatar-img" draggable={false} />
        ) : (
          <span className="showcase-banner-footer__avatar-letter">{letter}</span>
        )}
      </div>
      <div className="showcase-banner-footer__meta">
        {name ? <p className="showcase-banner-footer__name">{name}</p> : null}
        {text ? (
          <button
            type="button"
            className={`showcase-banner-footer__caption${expanded ? " is-expanded" : ""}`}
            onClick={(e) => {
              e.stopPropagation();
              if (canExpand) setExpanded((v) => !v);
            }}
            aria-expanded={canExpand ? expanded : undefined}
          >
            {text}
          </button>
        ) : null}
      </div>
    </div>
  );
}
