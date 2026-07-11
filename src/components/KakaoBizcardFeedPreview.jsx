import { useMemo } from "react";
import { readAvatar } from "../lib/vlueAvatar.js";
import { withLetteringBizcardPreviewFallback } from "../lib/letteringBizcardProfile.js";
import VLUE_SHIELD_LOGO from "../assets/vlue-shield-logo.svg?url";

function buildTags(card) {
  const tags = [];
  const title = String(card.title || "").trim();
  const dept = String(card.department || "").trim();
  if (dept) tags.push(dept);
  if (title && title !== dept) tags.push(title);
  const org = String(card.organization || "").trim();
  if (tags.length < 3 && org) tags.push(org.length > 14 ? `${org.slice(0, 13)}…` : org);
  return tags.slice(0, 3);
}

/**
 * 카카오톡 Feed에 전송되는 「명함 카드」 UI 미리보기 (카카오 비즈니스 채널 스타일)
 * 다크모드 전역 [class*="bg-white"] 보정과 충돌하지 않도록 전용 클래스만 사용.
 */
export default function KakaoBizcardFeedPreview({ card, className = "", isDarkMode = false }) {
  const snap = useMemo(() => withLetteringBizcardPreviewFallback(card || {}), [card]);
  const name = String(snap.name || "").trim();
  const org = String(snap.organization || "").trim();
  const title = String(snap.title || "").trim();
  const dept = String(snap.department || "").trim();
  const roleLine = [dept, title].filter(Boolean).join(" | ");
  const tags = useMemo(() => buildTags(snap), [snap]);
  const avatarUrl = readAvatar("card") || readAvatar("primary") || "";
  const displayName = name || "명함 미설정";
  const initial = (displayName.replace(/\s/g, "").slice(0, 1) || "V").toUpperCase();
  const hasProfile = Boolean(name || org || roleLine || tags.length);

  return (
    <div
      className={`vlue-kakao-feed-preview mt-2 overflow-hidden rounded-2xl ${className}`}
      data-theme={isDarkMode ? "dark" : "light"}
      aria-label="카카오 명함 카드 미리보기"
    >
      <div className="vlue-kakao-feed-preview__header">
        <div className="vlue-kakao-feed-preview__row">
          <div className="vlue-kakao-feed-preview__avatar">
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="vlue-kakao-feed-preview__initial">{initial}</span>
            )}
          </div>
          <div className="vlue-kakao-feed-preview__meta">
            <p className="vlue-kakao-feed-preview__name">{displayName}</p>
            {roleLine ? <p className="vlue-kakao-feed-preview__role">{roleLine}</p> : null}
            {org ? <p className="vlue-kakao-feed-preview__org">{org}</p> : null}
            {!hasProfile ? (
              <p className="vlue-kakao-feed-preview__role">명함 수정에서 회사·직책 정보를 입력하세요.</p>
            ) : null}
          </div>
        </div>
        {tags.length > 0 ? (
          <div className="vlue-kakao-feed-preview__tags">
            {tags.map((tag) => (
              <span key={tag} className="vlue-kakao-feed-preview__tag">
                {tag}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      <div className="vlue-kakao-feed-preview__body">
        <p className="vlue-kakao-feed-preview__cta-line">
          <span className="vlue-kakao-feed-preview__cta-name">{displayName}</span>
          <span className="vlue-kakao-feed-preview__cta-rest">님의 명함을 확인하세요.</span>
        </p>
        <div className="vlue-kakao-feed-preview__cta-btn" aria-hidden>
          명함 확인
        </div>
        <div className="vlue-kakao-feed-preview__footer">
          <div className="vlue-kakao-feed-preview__brand">
            <img src={VLUE_SHIELD_LOGO} alt="" className="h-5 w-5 shrink-0 object-contain" />
            <span>VLUE</span>
          </div>
          <span className="vlue-kakao-feed-preview__chev" aria-hidden>
            ›
          </span>
        </div>
      </div>
    </div>
  );
}
