import { openExternalHref, formatWebHref } from "../../lib/showcase/showcaseContactActions.js";
import { resolveShowcasePeerAvatar } from "../../lib/showcase/resolveShowcasePeerAvatar.js";
import { isVlueBrandAssetUrl } from "../../lib/vlueAvatar.js";
import ShowcaseBgmMarquee from "./ShowcaseBgmMarquee.jsx";

function firstText(...values) {
  for (const v of values) {
    const s = String(v || "").trim();
    if (s) return s;
  }
  return "";
}

function openUrl(url) {
  const href = formatWebHref(url) || String(url || "").trim();
  if (!href) return;
  openExternalHref(href);
}

/**
 * 쇼케이스 슬라이드 공통 크롬
 * 1 하단: VLUE 프로필(사진 + 활동명)
 * 2 좌측: 소셜 로고만
 * 3 상단 좌측: 개인커스텀일 때 비즈니스 링크 버튼 / 인스타는 게시물 헤더가 담당
 *
 * @param {"instagram"|"custom"} variant
 */
export default function ShowcaseSlideChrome({
  card,
  variant = "custom",
  hideBusinessLinks = false
}) {
  const style = card?.showcaseStyle || {};
  const outlinks = style?.commercial?.outlinks || {};
  const links = Array.isArray(style?.commercial?.links)
    ? style.commercial.links
    : Array.isArray(style?.commercial?.products)
      ? style.commercial.products
      : [];

  const activityName = firstText(
    card?.activityName,
    card?.handle,
    card?.memberId,
    card?.displayName,
    card?.name,
    card?.organization
  );

  const { avatarUrl, letter } = (() => {
    const peer = resolveShowcasePeerAvatar({
      style,
      card,
      displayName: activityName,
      exposeCustom: true
    });
    if (peer.type === "image" && peer.url && !isVlueBrandAssetUrl(peer.url)) {
      return { avatarUrl: peer.url, letter: activityName };
    }
    const logo = firstText(card?.photoUrl, card?.logoUrl, style?.platformFeed?.avatarUrl);
    if (logo && !isVlueBrandAssetUrl(logo)) {
      return { avatarUrl: logo, letter: activityName };
    }
    return { avatarUrl: "", letter: (activityName || "V").slice(0, 1).toUpperCase() };
  })();

  const ig =
    firstText(outlinks.instagram, style?.platformFeed?.instagramProfileUrl) ||
    (style?.platformFeed?.instagramHandle
      ? `https://instagram.com/${String(style.platformFeed.instagramHandle).replace(/^@/, "")}`
      : "");
  const legacyKakao = firstText(outlinks.kakao);
  const kakaoOpen = firstText(
    outlinks.kakaoOpenChat,
    /open\.kakao\.com/i.test(legacyKakao) ? legacyKakao : ""
  );
  const kakaoProfile = firstText(
    outlinks.kakaoProfile,
    style?.platformFeed?.kakaoProfileUrl,
    legacyKakao && !/open\.kakao\.com/i.test(legacyKakao) ? legacyKakao : ""
  );
  const facebook = firstText(outlinks.facebook);
  const youtube = firstText(outlinks.youtube);
  const tiktok = firstText(outlinks.tiktok);

  const socialItems = [
    ig ? { id: "instagram", label: "Instagram", url: ig, className: "is-ig" } : null,
    kakaoOpen
      ? { id: "kakao-open", label: "카카오 오픈채팅", url: kakaoOpen, className: "is-kakao", tag: "오픈채팅" }
      : null,
    kakaoProfile
      ? { id: "kakao-profile", label: "카카오 프로필", url: kakaoProfile, className: "is-kakao", tag: "프로필" }
      : null,
    facebook ? { id: "facebook", label: "Facebook", url: facebook, className: "is-fb" } : null,
    youtube ? { id: "youtube", label: "YouTube", url: youtube, className: "is-yt" } : null,
    tiktok ? { id: "tiktok", label: "TikTok", url: tiktok, className: "is-tt" } : null
  ].filter(Boolean);

  const showBizLinks = variant === "custom" && !hideBusinessLinks && links.some((l) => l?.url && l?.name);

  return (
    <div className="showcase-slide-chrome" data-variant={variant}>
      {showBizLinks ? (
        <div className="showcase-slide-chrome__biz" aria-label="비즈니스 링크">
          {links
            .filter((l) => l?.url && l?.name)
            .slice(0, 4)
            .map((l) => (
              <button
                key={l.id || l.url}
                type="button"
                className="showcase-slide-chrome__biz-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  openUrl(l.url);
                }}
                onPointerDown={(e) => e.stopPropagation()}
              >
                {l.name}
              </button>
            ))}
        </div>
      ) : null}

      {socialItems.length ? (
        <div className="showcase-slide-chrome__social" aria-label="소셜 링크">
          {socialItems.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`showcase-slide-chrome__social-btn ${item.className}`}
              title={item.tag ? `[카카오 ${item.tag}]` : item.label}
              aria-label={item.tag ? `카카오 ${item.tag}` : item.label}
              onClick={(e) => {
                e.stopPropagation();
                openUrl(item.url);
              }}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <SocialGlyph kind={item.id} />
              {item.tag ? <span className="showcase-slide-chrome__social-tag">{item.tag}</span> : null}
            </button>
          ))}
        </div>
      ) : null}

      <div className="showcase-slide-chrome__vlue" aria-label="VLUE 프로필">
        <div className="showcase-slide-chrome__vlue-avatar" aria-hidden>
          {avatarUrl ? (
            <img src={avatarUrl} alt="" loading="lazy" draggable={false} />
          ) : (
            <span>{letter}</span>
          )}
        </div>
        <div className="showcase-slide-chrome__vlue-meta">
          <p className="showcase-slide-chrome__vlue-label">VLUE 프로필</p>
          <p className="showcase-slide-chrome__vlue-name">{activityName || "회원"}</p>
        </div>
        <ShowcaseBgmMarquee
          styleConfig={style}
          compact
          className="showcase-slide-chrome__bgm"
        />
      </div>
    </div>
  );
}

function SocialGlyph({ kind }) {
  if (kind === "instagram") {
    return (
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden>
        <rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="12" cy="12" r="4.2" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" />
      </svg>
    );
  }
  if (kind === "kakao-open" || kind === "kakao-profile") {
    return (
      <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden>
        <path d="M12 4C7.03 4 3 7.13 3 10.98c0 2.45 1.62 4.6 4.06 5.84-.13.48-.47 1.73-.54 2-.09.32.12.32.25.23.11-.07 1.72-1.17 2.41-1.64.6.09 1.21.13 1.82.13 4.97 0 9-3.13 9-6.98C21 7.13 16.97 4 12 4z" />
      </svg>
    );
  }
  if (kind === "facebook") {
    return (
      <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden>
        <path d="M14 9h3V6h-3c-2.2 0-4 1.8-4 4v2H8v3h2v7h3v-7h2.6l.4-3H13v-2c0-.6.4-1 1-1z" />
      </svg>
    );
  }
  if (kind === "youtube") {
    return (
      <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden>
        <path d="M23.5 7.2a3 3 0 0 0-2.1-2.1C19.5 4.6 12 4.6 12 4.6s-7.5 0-9.4.5A3 3 0 0 0 .5 7.2 31.5 31.5 0 0 0 0 12a31.5 31.5 0 0 0 .5 4.8 3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1A31.5 31.5 0 0 0 24 12a31.5 31.5 0 0 0-.5-4.8zM9.8 15.5v-7l6.3 3.5-6.3 3.5z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden>
      <path d="M16.5 3c.6 2.3 2.1 3.9 4.5 4.3v3.1c-1.6.1-3.1-.4-4.5-1.3v6.4c0 3.4-2.7 6.1-6.1 6.1S4.3 18.9 4.3 15.5 7 9.4 10.4 9.4c.4 0 .7 0 1.1.1v3.2c-.3-.1-.7-.2-1.1-.2-1.6 0-2.9 1.3-2.9 2.9s1.3 2.9 2.9 2.9 2.9-1.3 2.9-2.9V3h3.2z" />
    </svg>
  );
}
