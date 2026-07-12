import { useEffect, useMemo, useState } from "react";
import { readProfileOrLogoAvatar, scrubBrandAvatarsFromStorage } from "../lib/vlueAvatar.js";
import { withLetteringBizcardPreviewFallback } from "../lib/letteringBizcardProfile.js";
import { scrubLetteringDemoPollution } from "../lib/letteringDemoPollution.js";
import { ensureDigitalCardId } from "../lib/digitalCardApi.js";
import { buildKakaoBizcardPublicUrls } from "../lib/kakaoBizcardFeedShare.js";
import { buildPublicCardViewUrl } from "../lib/vlueViralLinks.js";
import VLUE_SHIELD_LOGO from "../assets/vlue-shield-logo.svg?url";
import UserProfileAvatar from "./UserProfileAvatar.jsx";

function buildTags(card) {
  const tags = [];
  const title = String(card.title || "").trim();
  const dept = String(card.department || "").trim();
  if (dept) tags.push(dept);
  if (title && title !== dept) tags.push(title);
  /* 상호는 헤더에 이미 표시 — 태그로 중복하지 않음 */
  return tags.slice(0, 3);
}

/**
 * 카카오톡 Feed에 전송되는 「명함 카드」 UI 미리보기 (카카오 비즈니스 채널 스타일)
 * 다크모드 전역 [class*="bg-white"] 보정과 충돌하지 않도록 전용 클래스만 사용.
 */
export default function KakaoBizcardFeedPreview({
  card,
  className = "",
  isDarkMode = false,
  onToast
}) {
  const snap = useMemo(
    () => scrubLetteringDemoPollution(withLetteringBizcardPreviewFallback(card || {})),
    [card]
  );
  const name = String(snap.name || "").trim();
  const org = String(snap.organization || "").trim();
  const title = String(snap.title || "").trim();
  const dept = String(snap.department || "").trim();
  const roleLine = [dept, title].filter(Boolean).join(" | ");
  const tags = useMemo(() => buildTags(snap), [snap]);
  const [avatarTick, setAvatarTick] = useState(0);
  const avatarUrl = useMemo(() => {
    scrubBrandAvatarsFromStorage();
    return readProfileOrLogoAvatar();
  }, [avatarTick, snap.name]);
  const displayName = name || "명함 미설정";
  const hasProfile = Boolean(name || org || roleLine || tags.length);
  const [viewUrl, setViewUrl] = useState("");

  useEffect(() => {
    const bump = () => setAvatarTick((n) => n + 1);
    window.addEventListener("vlue-avatar-changed", bump);
    return () => window.removeEventListener("vlue-avatar-changed", bump);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const id = (await ensureDigitalCardId()) || "";
      if (cancelled) return;
      if (id) {
        const urls = buildKakaoBizcardPublicUrls(id, snap);
        setViewUrl(urls.viewUrl || buildPublicCardViewUrl(id));
      } else {
        setViewUrl("");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [snap.name, snap.organization, snap.phone, snap.title, snap.department]);

  const openCardView = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!viewUrl) {
      onToast?.("명함을 저장한 뒤 확인할 수 있습니다.");
      return;
    }
    try {
      window.open(viewUrl, "_blank", "noopener,noreferrer");
    } catch {
      onToast?.("명함 보기 페이지를 열 수 없습니다.");
    }
  };

  return (
    <div
      className={`vlue-kakao-feed-preview mt-2 overflow-hidden rounded-2xl ${className}`}
      data-theme={isDarkMode ? "dark" : "light"}
      aria-label="카카오 명함 카드 미리보기"
    >
      <div className="vlue-kakao-feed-preview__header">
        <div className="vlue-kakao-feed-preview__row">
          <div className="vlue-kakao-feed-preview__avatar">
            <UserProfileAvatar src={avatarUrl} blankClassName="bg-[#c5cdd6] text-[#8b95a1]" />
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
        <button
          type="button"
          className="vlue-kakao-feed-preview__cta-btn"
          onClick={openCardView}
        >
          명함 확인
        </button>
        <button type="button" className="vlue-kakao-feed-preview__footer" onClick={openCardView}>
          <div className="vlue-kakao-feed-preview__brand">
            <img src={VLUE_SHIELD_LOGO} alt="" className="h-5 w-5 shrink-0 object-contain" />
            <span>VLUE</span>
          </div>
          <span className="vlue-kakao-feed-preview__chev" aria-hidden>
            ›
          </span>
        </button>
      </div>
    </div>
  );
}
