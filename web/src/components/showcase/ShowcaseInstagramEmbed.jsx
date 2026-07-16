import { useMemo } from "react";
import { resolveInstagramEmbed } from "../../lib/showcase/instagramEmbed.js";

/**
 * Instagram 공식 embed — VLUE 디자인 없음.
 * 캐러셀·스피커(음소거)는 Instagram iframe 원본 UI.
 */
export default function ShowcaseInstagramEmbed({
  postUrl = "",
  captioned = false,
  title = "Instagram 게시물"
}) {
  const resolved = useMemo(
    () => resolveInstagramEmbed(postUrl, { captioned }),
    [postUrl, captioned]
  );

  if (!resolved.ok) {
    return (
      <div className="showcase-ig-embed showcase-ig-embed--fallback" role="status">
        <p className="showcase-ig-embed__fallback-title">Instagram 게시물을 넣을 수 없습니다</p>
        <p className="showcase-ig-embed__fallback-hint">
          프로필 주소가 아니라 게시물·릴스 링크(/p/ · /reel/)를 입력해 주세요.
        </p>
        {postUrl ? (
          <a className="showcase-ig-embed__fallback-link" href={postUrl} target="_blank" rel="noreferrer">
            Instagram에서 열기
          </a>
        ) : null}
      </div>
    );
  }

  return (
    <div className="showcase-ig-embed">
      <iframe
        title={title}
        src={resolved.embedUrl}
        className="showcase-ig-embed__frame"
        allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
        allowFullScreen
        loading="lazy"
        referrerPolicy="strict-origin-when-cross-origin"
      />
    </div>
  );
}
