import { useState } from "react";
import { openExternalHref, formatWebHref } from "../../lib/showcase/showcaseContactActions.js";
import { resolveShowcasePeerAvatar } from "../../lib/showcase/resolveShowcasePeerAvatar.js";
import { isVlueBrandAssetUrl } from "../../lib/vlueAvatar.js";
import {
  resolveFollowTargetUserId,
  shouldShowShowcaseFollow
} from "../../lib/showcase/resolveShowcaseOwnerUserId.js";
import { normalizeBusinessLink } from "../../lib/showcase/showcasePages.js";
import FollowActionButton from "../follow/FollowActionButton.jsx";
import "../follow/follow-action.css";
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

function displayHost(url) {
  const raw = String(url || "").trim();
  if (!raw) return "";
  try {
    return new URL(formatWebHref(raw) || raw).href.replace(/^https?:\/\//i, "");
  } catch {
    return raw.replace(/^https?:\/\//i, "");
  }
}

/**
 * 쇼케이스 슬라이드 공통 크롬
 * 1 하단: VLUE 프로필 + 팔로우 + 쇼셜 토글
 * 2 상단 좌측: 개인커스텀일 때 페이지 비즈니스 링크
 * 3 쇼셜: 토글 시 VLUE 바 위에 표시
 *
 * @param {"instagram"|"custom"} variant
 */
export default function ShowcaseSlideChrome({
  card,
  variant = "custom",
  /** 현재 슬라이드(페이지)의 비즈니스 링크 — 페이지당 1개 */
  businessLink = null,
  hideBusinessLinks = false,
  targetUserId: targetUserIdProp = null,
  hideFollow = false,
  fallbackToMe = true,
  onToast
}) {
  const [socialOpen, setSocialOpen] = useState(false);
  const style = card?.showcaseStyle || {};
  const outlinks = style?.commercial?.outlinks || {};
  const pageLink = normalizeBusinessLink(businessLink);

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

  const socialItems = [
    ig ? { id: "instagram", label: "Instagram", url: ig, className: "is-ig" } : null,
    youtube ? { id: "youtube", label: "YouTube", url: youtube, className: "is-yt" } : null,
    facebook ? { id: "facebook", label: "Facebook", url: facebook, className: "is-fb" } : null,
    kakaoOpen
      ? { id: "kakao-open", label: "카카오 오픈채팅", url: kakaoOpen, className: "is-kakao" }
      : null,
    kakaoProfile
      ? { id: "kakao-profile", label: "카카오 프로필", url: kakaoProfile, className: "is-kakao" }
      : null
  ].filter(Boolean);

  const showBizLink = variant === "custom" && !hideBusinessLinks && Boolean(pageLink);
  const hasSocial = socialItems.length > 0;

  const targetUserId = String(
    targetUserIdProp || resolveFollowTargetUserId(card, { fallbackToMe }) || ""
  ).trim();
  const showFollow = shouldShowShowcaseFollow(targetUserId, { hideFollow });

  return (
    <div className="showcase-slide-chrome" data-variant={variant}>
      {showBizLink ? (
        <div className="showcase-slide-chrome__biz" aria-label="비즈니스 링크">
          <button
            type="button"
            className="showcase-slide-chrome__biz-card"
            aria-label={`${pageLink.name} 열기`}
            title={pageLink.name}
            onClick={(e) => {
              e.stopPropagation();
              openUrl(pageLink.url);
            }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            {pageLink.logoUrl ? (
              <img
                src={pageLink.logoUrl}
                alt=""
                className="showcase-slide-chrome__biz-logo"
                draggable={false}
              />
            ) : (
              <span className="showcase-slide-chrome__biz-logo-fallback" aria-hidden>
                링크
              </span>
            )}
            <span className="showcase-slide-chrome__biz-meta">
              <span className="showcase-slide-chrome__biz-name">{pageLink.name}</span>
              <span className="showcase-slide-chrome__biz-url">{displayHost(pageLink.url)}</span>
            </span>
          </button>
        </div>
      ) : null}

      <div className={`showcase-slide-chrome__dock${socialOpen && hasSocial ? " is-open" : ""}`}>
        {hasSocial ? (
          <div
            className={`showcase-slide-chrome__social-dock${socialOpen ? " is-visible" : ""}`}
            aria-label="비즈니스 쇼셜링크"
            aria-hidden={!socialOpen}
          >
            {socialItems.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`showcase-slide-chrome__social-btn ${item.className}`}
                title={item.label}
                aria-label={item.label}
                tabIndex={socialOpen ? 0 : -1}
                onClick={(e) => {
                  e.stopPropagation();
                  openUrl(item.url);
                }}
                onPointerDown={(e) => e.stopPropagation()}
              >
                <SocialGlyph kind={item.id} />
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
          {showFollow ? (
            <FollowActionButton
              targetUserId={targetUserId}
              className="follow-action-btn--chrome"
              onToast={onToast}
            />
          ) : null}
          <ShowcaseBgmMarquee
            styleConfig={style}
            compact
            className="showcase-slide-chrome__bgm"
          />
          {hasSocial ? (
            <button
              type="button"
              className={`showcase-slide-chrome__social-toggle${socialOpen ? " is-open" : ""}`}
              aria-label={socialOpen ? "쇼셜 링크 닫기" : "쇼셜 링크 열기"}
              aria-expanded={socialOpen}
              title={socialOpen ? "쇼셜 닫기" : "쇼셜"}
              onClick={(e) => {
                e.stopPropagation();
                setSocialOpen((v) => !v);
              }}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <SocialToggleGlyph />
              <span className="showcase-slide-chrome__social-toggle-label">쇼셜</span>
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function SocialToggleGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" aria-hidden>
      <circle cx="6" cy="12" r="2.2" fill="currentColor" />
      <circle cx="12" cy="6.5" r="2.2" fill="currentColor" />
      <circle cx="12" cy="17.5" r="2.2" fill="currentColor" />
      <circle cx="18" cy="12" r="2.2" fill="currentColor" />
      <path
        d="M8 11.2 10.2 7.8M8 12.8l2.2 3.4M14 7.8 16 11.2M14 16.2 16 12.8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
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
      <path d="M14 9h3V6h-3c-2.2 0-4 1.8-4 4v2H8v3h2v7h3v-7h2.6l.4-3H13v-2c0-.6.4-1 1-1z" />
    </svg>
  );
}
