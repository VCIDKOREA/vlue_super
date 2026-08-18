import { useEffect, useMemo, useRef, useState } from "react";
import {
  Phone,
  Mail,
  MapPin,
  Globe,
  Printer,
  User,
  ShieldCheck,
  Check
} from "lucide-react";
import { formatLetteringPhoneDisplay } from "../lib/letteringPhoneMatch.js";
import { formatLetteringReceptionLines } from "../lib/letteringPaidIdentityDisplay.js";
import { formatLetteringContactEmailDisplay, photoFocusToCss } from "../lib/letteringBizcardStorage.js";
import { normalizeLetteringCard, resolveDccTitlePhotoUrl } from "../lib/letteringCardNormalize.js";
import {
  formatNameDeptTitleLine,
  VLUE_PREVIEW_TITLE_DEPT_PLACEHOLDER,
  VLUE_PREVIEW_EMAIL_PLACEHOLDER
} from "../lib/vlueShowcasePreviewIdentity.js";
import {
  openEmailLink,
  openWebsiteLink,
  openPhoneDial
} from "../lib/showcase/showcaseContactActions.js";
import VluePushAuthSeal from "./VluePushAuthSeal.jsx";
import ShowcaseDialConfirmModal from "./showcase/ShowcaseDialConfirmModal.jsx";
import InCallDtmfPad from "./call/InCallDtmfPad.jsx";
import { resolveAuthValidityPeriod } from "../lib/authValidityPeriod.js";
import { openExternalHref, formatWebHref } from "../lib/showcase/showcaseContactActions.js";
import { getLocalVlueUserId } from "../lib/showcase/resolveShowcaseOwnerUserId.js";
import AgencyDcpCard from "./agency/AgencyDcpCard.jsx";
import { isCeoSubjectCard } from "../lib/letteringDemoPollution.js";
import VLUE_EYE_WATERMARK from "../assets/vlue-eye-watermark.svg?url";
import VLUE_SHIELD_LOGO from "../assets/vlue-shield-logo.svg?url";

const CEO_WATERMARK_SRC = VLUE_EYE_WATERMARK || VLUE_SHIELD_LOGO || "";

function formatWebsite(raw) {
  return String(raw || "")
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "");
}

function firstText(...values) {
  for (const v of values) {
    const s = String(v || "").trim();
    if (s) return s;
  }
  return "";
}

/** 디지털 명함 — 비즈니스 쇼셜링크 (인스타·유튜브·페이스북·카카오채팅·카카오프로필) */
function listCardSocialOutlinks(card) {
  const style = card?.showcaseStyle && typeof card.showcaseStyle === "object" ? card.showcaseStyle : {};
  const outlinks = style.commercial?.outlinks || {};
  const feed = style.platformFeed || {};

  const ig =
    firstText(outlinks.instagram, feed.instagramProfileUrl) ||
    (feed.instagramHandle
      ? `https://instagram.com/${String(feed.instagramHandle).replace(/^@/, "")}`
      : "");
  const legacyKakao = firstText(outlinks.kakao);
  const kakaoOpen = firstText(
    outlinks.kakaoOpenChat,
    /open\.kakao\.com/i.test(legacyKakao) ? legacyKakao : ""
  );
  const kakaoProfile = firstText(
    outlinks.kakaoProfile,
    feed.kakaoProfileUrl,
    legacyKakao && !/open\.kakao\.com/i.test(legacyKakao) ? legacyKakao : ""
  );
  const facebook = firstText(outlinks.facebook);
  const youtube = firstText(outlinks.youtube);

  return [
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
}

function SocialOutlinkGlyph({ kind }) {
  if (kind === "instagram") {
    return (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden>
        <rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="12" cy="12" r="4.2" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" />
      </svg>
    );
  }
  if (kind === "kakao-open" || kind === "kakao-profile") {
    return (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden>
        <path d="M12 4C7.03 4 3 7.13 3 10.98c0 2.45 1.62 4.6 4.06 5.84-.13.48-.47 1.73-.54 2-.09.32.12.32.25.23.11-.07 1.72-1.17 2.41-1.64.6.09 1.21.13 1.82.13 4.97 0 9-3.13 9-6.98C21 7.13 16.97 4 12 4z" />
      </svg>
    );
  }
  if (kind === "facebook") {
    return (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden>
        <path d="M14 9h3V6h-3c-2.2 0-4 1.8-4 4v2H8v3h2v7h3v-7h2.6l.4-3H13v-2c0-.6.4-1 1-1z" />
      </svg>
    );
  }
  if (kind === "youtube") {
    return (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden>
        <path d="M23.5 7.2a3 3 0 0 0-2.1-2.1C19.5 4.6 12 4.6 12 4.6s-7.5 0-9.4.5A3 3 0 0 0 .5 7.2 31.5 31.5 0 0 0 0 12a31.5 31.5 0 0 0 .5 4.8 3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1A31.5 31.5 0 0 0 24 12a31.5 31.5 0 0 0-.5-4.8zM9.8 15.5v-7l6.3 3.5-6.3 3.5z" />
      </svg>
    );
  }
  return null;
}

function FrontSocialOutlinkButtons({ card, enableContactLinks = true, visible = false }) {
  const items = listCardSocialOutlinks(card);
  if (!items.length) return null;

  return (
    <div
      className={`ldr-biz-logos ldr-biz-logos--dock${visible ? " is-visible" : ""}`}
      aria-label="비즈니스 쇼셜링크"
      aria-hidden={!visible}
    >
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          className={`ldr-biz-logos__item ${item.className}`}
          title={item.label}
          aria-label={`${item.label} 열기`}
          tabIndex={visible ? 0 : -1}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!enableContactLinks) return;
            const href = formatWebHref(item.url) || String(item.url || "").trim();
            if (href) openExternalHref(href);
          }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <SocialOutlinkGlyph kind={item.id} />
        </button>
      ))}
    </div>
  );
}

function PhoneCertBadge({ className = "" }) {
  return (
    <span
      className={`ldr-phone-cert-mark${className ? ` ${className}` : ""}`.trim()}
      title="VLUE 인증 번호"
      aria-label="VLUE 인증 번호"
    >
      <Check className="ldr-phone-cert-mark__check" strokeWidth={3.2} aria-hidden />
    </span>
  );
}

function ContactRow({ icon: Icon, label, value, onActivate, showCertBadge = false, isPlaceholder = false }) {
  if (!value) return null;
  const interactive = typeof onActivate === "function" && !isPlaceholder;
  const inner = (
    <div className={`ldr-contact-row${interactive ? " ldr-contact-row--link" : ""}`}>
      <span className="ldr-contact-row__icon" aria-hidden>
        <Icon className="h-4 w-4" />
      </span>
      <div className="ldr-contact-row__body">
        <span className="ldr-contact-row__label">{label}</span>
        <span className="ldr-contact-row__value-line">
          <span
            className={`ldr-contact-row__value${interactive ? " ldr-contact-row__value--link" : ""}${
              isPlaceholder ? " ldr-contact-row__value--placeholder" : ""
            }`.trim()}
          >
            {value}
          </span>
          {showCertBadge ? <PhoneCertBadge /> : null}
        </span>
      </div>
    </div>
  );
  if (interactive) {
    return (
      <button
        type="button"
        className="ldr-contact-row-link"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onActivate();
        }}
        onPointerDown={(e) => e.stopPropagation()}
      >
        {inner}
      </button>
    );
  }
  return inner;
}

function FaceTabs({ face, onFaceChange, hidden = false }) {
  const isBack = face === "back";
  return (
    <div
      className={`ldr-face-tabs${isBack ? " ldr-face-tabs--back" : ""}${
        hidden ? " ldr-face-tabs--hidden" : ""
      }`}
      role="tablist"
      aria-label="명함 면"
      aria-hidden={hidden}
    >
      <div className="ldr-face-tabs__track">
        <span className="ldr-face-tabs__thumb" aria-hidden />
        <button
          type="button"
          role="tab"
          aria-selected={!isBack}
          className={`ldr-face-tab${!isBack ? " ldr-face-tab--active" : ""}`}
          onClick={(e) => {
            e.stopPropagation();
            onFaceChange?.("front");
          }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          앞면
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={isBack}
          className={`ldr-face-tab${isBack ? " ldr-face-tab--active" : ""}`}
          onClick={(e) => {
            e.stopPropagation();
            onFaceChange?.("back");
          }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          뒷면
        </button>
      </div>
    </div>
  );
}

/** CEO(@ceo / ceo@vlue.kr) 소유 명함 — 이 계정만 ‘로고 없음’과 동일 처리 */
function isCeoOwnerCard(card) {
  if (isCeoSubjectCard(card)) return true;
  try {
    const me = String(localStorage.getItem("vlue_member_handle") || "")
      .trim()
      .toLowerCase()
      .replace(/^@/, "");
    if (me !== "ceo") return false;
    const owner = String(card?.userId || card?.ownerUserId || "").trim();
    const meId = getLocalVlueUserId();
    /* 빈 미인증 카드(owner 없음)를 수신자 계정만으로 CEO 쇼케이스로 치지 않음 */
    if (meId && owner && owner === meId) return true;
    return false;
  } catch {
    return false;
  }
}

/**
 * 등록한 회사 로고 URL
 * - CEO: 1번 캡처 VLUE 공식 로고 (업로드 PNG 대신)
 * - 그 외: 업로드 로고 (프로필·워터마크 동일 소스)
 */
function resolveCardLogoUrl(card) {
  if (isCeoOwnerCard(card)) return CEO_WATERMARK_SRC;
  if (card?.noCompanyLogo) return "";
  const logo = String(card?.logoUrl || card?.logo_url || "").trim();
  if (!logo) return "";
  if (/lettering-demo|icons8\.com/i.test(logo)) return "";
  if (/data:image\/svg\+xml/i.test(logo) && /2563eb/i.test(logo)) return "";
  if (/\/assets\/vlue-shield-logo\.svg/i.test(logo)) return "";
  return logo;
}

/**
 * 뒷배경 워터마크 (크기·명도는 전 유저 동일)
 * - CEO: VLUE 공식 로고
 * - 그 외: 프로필 로고와 동일 / 없으면 없음
 */
function CompanyLogoWatermark({ card }) {
  const [imgBroken, setImgBroken] = useState(false);
  const ceo = isCeoOwnerCard(card);
  const company = resolveCardLogoUrl(card);

  let logoUrl = "";
  let variant = "nukki";
  if (ceo) {
    logoUrl = CEO_WATERMARK_SRC;
    variant = "ceo";
  } else if (company) {
    logoUrl = company;
    variant = "nukki";
  } else {
    return null;
  }

  if (!logoUrl || imgBroken) return null;

  return (
    <div className={`ldr-watermark ldr-watermark--${variant}`} aria-hidden>
      <img
        src={logoUrl}
        alt=""
        className="ldr-watermark__img"
        onError={() => setImgBroken(true)}
      />
    </div>
  );
}

function CompanyLogoBadge({ card, className = "" }) {
  const [imgBroken, setImgBroken] = useState(false);
  const logoUrl = resolveCardLogoUrl(card);
  if (!logoUrl || imgBroken) return null;
  return (
    <span
      className={`ldr-company-logo-badge ldr-company-logo-badge--link${className ? ` ${className}` : ""}`.trim()}
      aria-label="회사 로고"
    >
      <img src={logoUrl} alt="" className="ldr-company-logo-badge__img" onError={() => setImgBroken(true)} />
    </span>
  );
}

function ProfileMedia({ card, className = "", variant = "avatar" }) {
  const [imgBroken, setImgBroken] = useState(false);
  const titlePhotoUrl = resolveDccTitlePhotoUrl(card);
  const logoUrl = resolveCardLogoUrl(card);
  /* avatar = 회사 로고, hero = DCC 타이틀 사진 — 서로 대체하지 않음 */
  const isLogo = variant === "logo" || variant === "avatar";
  const src = isLogo ? logoUrl : titlePhotoUrl;
  const focusCss = !isLogo ? photoFocusToCss(card.photoFocus) : undefined;

  /* 로고 없음 → 무지(슬롯 비움) */
  if (isLogo && !logoUrl) return null;

  const fallback = (card.organization || card.name || "?").slice(0, 1);

  return (
    <div
      className={`ldr-profile-media ldr-profile-media--${variant}${
        isLogo ? " ldr-profile-media--logo ldr-profile-media--link-logo" : ""
      }${className ? ` ${className}` : ""}`.trim()}
    >
      {src && !imgBroken ? (
        <img
          src={src}
          alt=""
          className="ldr-profile-media__img"
          style={focusCss ? { objectPosition: focusCss } : undefined}
          onError={() => setImgBroken(true)}
        />
      ) : (
        <span className="ldr-profile-media__fallback" aria-hidden>
          {fallback}
        </span>
      )}
    </div>
  );
}

function BackPanelHero({ card }) {
  const photoUrl = resolveDccTitlePhotoUrl(card);
  if (!photoUrl) return null;

  return (
    <div className="ldr-back-hero">
      <ProfileMedia card={card} variant="hero" />
      <div className="ldr-back-hero__shade" aria-hidden />
    </div>
  );
}

function ProfileHero({ card, verified, incomingNumber = "" }) {
  const [imgBroken, setImgBroken] = useState(false);
  const photoUrl = resolveDccTitlePhotoUrl(card);
  const logoUrl = resolveCardLogoUrl(card);
  const hasPhoto = Boolean(photoUrl);
  const hasLogo = Boolean(logoUrl);
  const photoObjectPosition = photoFocusToCss(card.photoFocus);
  const lines = formatLetteringReceptionLines(card, { incomingNumber });
  const orgLine = lines.expandedOrgLine;
  const personName = lines.organization && lines.name ? lines.name : "";
  const phoneDisplay = lines.phone ? formatLetteringPhoneDisplay(lines.phone) : "";
  const title = lines.title;

  const identityCopy = (
    <>
      {orgLine ? (
        <p className={`ldr-hero__brand${hasLogo ? " ldr-hero__brand--with-logo" : ""}`}>
          {hasLogo ? <CompanyLogoBadge card={card} className="ldr-company-logo-badge--inline" /> : null}
          <span>{orgLine}</span>
        </p>
      ) : null}
      {personName || phoneDisplay || title ? (
        <p className="ldr-hero__contact">
          {personName ? <span className="ldr-hero__person">{personName}</span> : null}
          {personName && (phoneDisplay || title) ? <span className="ldr-hero__contact-sep"> / </span> : null}
          {phoneDisplay ? <span className="ldr-hero__phone">{phoneDisplay}</span> : null}
          {phoneDisplay && title ? <span className="ldr-hero__contact-sep"> / </span> : null}
          {title ? <span className="ldr-hero__title">{title}</span> : null}
        </p>
      ) : null}
    </>
  );

  /* 프로필 사진 없음 + 로고만 → 로고는 워터마크(브랜드), 프로필 자리와 혼동 방지 */
  if (!hasPhoto && hasLogo) {
    return (
      <div className="ldr-hero ldr-hero--watermark">
        <div className="ldr-hero__watermark-stage" aria-hidden>
          {!imgBroken ? (
            <img
              src={logoUrl}
              alt=""
              className="ldr-hero__watermark-img"
              onError={() => setImgBroken(true)}
            />
          ) : (
            <span className="ldr-hero__watermark-fallback">{(orgLine || "V").slice(0, 1)}</span>
          )}
        </div>
        <div className="ldr-hero__copy ldr-hero__copy--watermark">
          {verified ? (
            <span className="ldr-hero__badge ldr-hero__badge--inline">
              <ShieldCheck className="h-3.5 w-3.5" />
              VLUE 인증
            </span>
          ) : null}
          {identityCopy}
        </div>
      </div>
    );
  }

  return (
    <div className="ldr-hero">
      <div className="ldr-hero__visual">
        {hasPhoto && !imgBroken ? (
          <img
            src={photoUrl}
            alt=""
            className="ldr-hero__photo"
            style={{ objectPosition: photoObjectPosition }}
            onError={() => setImgBroken(true)}
          />
        ) : (
          <div className="ldr-hero__fallback" aria-hidden>
            {(orgLine || "V").slice(0, 1)}
          </div>
        )}
        <div className="ldr-hero__shade" />
        {hasLogo ? <CompanyLogoBadge card={card} className="ldr-company-logo-badge--hero" /> : null}
        {verified ? (
          <span className="ldr-hero__badge">
            <ShieldCheck className="h-3.5 w-3.5" />
            VLUE 인증
          </span>
        ) : null}
      </div>
      <div className="ldr-hero__copy ldr-hero__copy--overlay">{identityCopy}</div>
    </div>
  );
}

function resolveBackAdditionalNote(card) {
  return String(card.customBackText || card.backNote || card.introBack || "").trim();
}

function FrontInfoRow({ icon: Icon, label, children, className = "" }) {
  return (
    <div className={`ldr-front-info-row${className ? ` ${className}` : ""}`.trim()}>
      <span className="ldr-front-info-row__label">
        {Icon ? <Icon className="ldr-front-info-row__icon" aria-hidden /> : null}
        <span className="ldr-front-info-row__label-text">{label}</span>
        <span className="ldr-front-info-row__colon" aria-hidden>
          :
        </span>
      </span>
      <div className="ldr-front-info-row__value">{children}</div>
    </div>
  );
}

function FrontPanel({
  card,
  verified,
  verificationItems = [],
  embeddedInPush = false,
  enableContactLinks = true,
  onRequestDial,
  hideFollow = false,
  onToast
}) {
  const [socialOpen, setSocialOpen] = useState(false);
  const socialItems = listCardSocialOutlinks(card);
  const hasSocial = socialItems.length > 0;
  const phone = card.phone ? formatLetteringPhoneDisplay(card.phone) : "";
  const phoneRaw = String(card.phone || "").trim();
  const faxRaw = String(card.fax || "").trim();
  const fax = faxRaw ? formatLetteringPhoneDisplay(faxRaw) : "";
  const website = formatWebsite(card.website);
  const emailRaw = String(card.email || "").trim();
  const email = emailRaw ? formatLetteringContactEmailDisplay(emailRaw) : "";
  /* 통화 송출(피어): 빈 이메일은 숨김. 미리보기 편집만 플레이스홀더 */
  const emailValue = email || (embeddedInPush ? "" : VLUE_PREVIEW_EMAIL_PLACEHOLDER);
  const addressRaw = String(card.address || "").trim();
  const intro = String(card.companyIntro || card.salesContent || "").trim();
  const validityFromItems = (verificationItems || [])
    .map((line) => String(line || "").trim())
    .find((line) => /만료일|인증유효기간/.test(line));
  const peerUserId = String(card.userId || card.ownerUserId || "").trim();
  const meId = getLocalVlueUserId();
  const isPeerCard = Boolean(peerUserId && (!meId || peerUserId !== meId));
  const validityResolved = resolveAuthValidityPeriod({
    paidAt: card.authPaidAt || null,
    cycleEndAt: card.authCycleEndAt || card.cycleEndAt || null,
    validUntil: card.authValidUntil || null,
    billingCycle: card.billingCycle || null,
    useLocalFallback: !isPeerCard && !peerUserId
  });
  const validityLabel = "만료일";
  const validityDisplay = validityFromItems
    ? validityFromItems.replace(/^(만료일|인증유효기간)\s*[:：]?\s*/, "").trim()
    : validityResolved?.line || "";

  const openPeerCaseArchive = () => {
    if (!peerUserId) return;
    window.dispatchEvent(
      new CustomEvent("vlue-open-case-user", {
        detail: {
          userId: peerUserId,
          name: String(card.name || card.organization || "").trim(),
          handle: String(card.publicHandle || card.loginId || "").replace(/^@/, "")
        }
      })
    );
  };

  return (
    <div className={`ldr-panel ldr-panel--front${embeddedInPush ? " ldr-panel--push" : ""}`}>
      <CompanyLogoWatermark card={card} />
      {embeddedInPush ? null : <ProfileHero card={card} verified={verified} />}
      {embeddedInPush ? <BackPanelHero card={card} /> : null}
      <div className={`ldr-back-head${resolveDccTitlePhotoUrl(card) && embeddedInPush ? " ldr-back-head--with-hero" : ""}`}>
        <ProfileMedia card={card} variant="avatar" className="ldr-back-head__media" />
        <div className="ldr-back-head__copy">
          <p className="ldr-back-kicker">Digital ID · Profile</p>
          <div className="ldr-back-title-row">
            {peerUserId ? (
              <button
                type="button"
                className="ldr-back-title ldr-back-title--link"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  openPeerCaseArchive();
                }}
                onPointerDown={(e) => e.stopPropagation()}
                aria-label="케이스함 열기"
              >
                {String(card.organization || "").trim() || card.name}
              </button>
            ) : (
              <h3 className="ldr-back-title">
                {String(card.organization || "").trim() || card.name}
              </h3>
            )}
            {verified ? (
              <ShieldCheck className="ldr-name-shield" strokeWidth={2.35} aria-label="VLUE 인증됨" />
            ) : null}
          </div>
          {(() => {
            const org = String(card.organization || "").trim();
            const personName = org ? String(card.name || "").trim() : "";
            if (card.previewTitleDeptPlaceholder || card.previewExampleBrand) {
              return (
                <p className="ldr-back-person-name ldr-back-person-name--row">
                  {[personName, VLUE_PREVIEW_TITLE_DEPT_PLACEHOLDER].filter(Boolean).join(" ｜ ")}
                </p>
              );
            }
            const line = formatNameDeptTitleLine(personName || (!org ? card.name : ""), card.department, card.title);
            if (!line) return null;
            if (peerUserId && personName) {
              return (
                <button
                  type="button"
                  className="ldr-back-person-name ldr-back-person-name--row ldr-back-person-name--link"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    openPeerCaseArchive();
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  {line}
                </button>
              );
            }
            return <p className="ldr-back-person-name ldr-back-person-name--row">{line}</p>;
          })()}
        </div>
      </div>

      <div className="ldr-front-profile-stack">
        {phone ? (
          <FrontInfoRow icon={Phone} label="전화번호" className="ldr-front-info-row--phone">
            <span className="ldr-front-info-row__phone-line">
              {enableContactLinks ? (
                <button
                  type="button"
                  className="ldr-front-phone-link ldr-front-phone-link--btn"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onRequestDial?.(phoneRaw, card.name || card.organization || "");
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  {phone}
                </button>
              ) : (
                <span className="ldr-front-phone-link">{phone}</span>
              )}
              {verified ? <PhoneCertBadge /> : null}
            </span>
          </FrontInfoRow>
        ) : null}

        {fax ? (
          <FrontInfoRow icon={Printer} label="팩스">
            <span className="ldr-front-info-row__text">
              {enableContactLinks ? (
                <button
                  type="button"
                  className="ldr-front-phone-link ldr-front-phone-link--btn"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onRequestDial?.(faxRaw, card.organization || card.name || "팩스");
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  {fax}
                </button>
              ) : (
                fax
              )}
            </span>
          </FrontInfoRow>
        ) : null}

        {emailValue ? (
          <FrontInfoRow icon={Mail} label="이메일">
            <p
              className={`ldr-front-info-row__text${!email ? " ldr-front-info-row__text--placeholder" : ""}`.trim()}
            >
              {enableContactLinks && emailRaw ? (
                <button
                  type="button"
                  className="ldr-front-phone-link ldr-front-phone-link--btn"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    openEmailLink(emailRaw);
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  {emailValue}
                </button>
              ) : (
                emailValue
              )}
            </p>
          </FrontInfoRow>
        ) : null}

        {addressRaw ? (
          <FrontInfoRow icon={MapPin} label="주소">
            <p className="ldr-front-info-row__text">{addressRaw}</p>
          </FrontInfoRow>
        ) : null}

        {website ? (
          <FrontInfoRow icon={Globe} label="웹사이트">
            <p className="ldr-front-info-row__text">
              {enableContactLinks ? (
                <button
                  type="button"
                  className="ldr-front-phone-link ldr-front-phone-link--btn"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    openWebsiteLink(card.website || website);
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  {website}
                </button>
              ) : (
                website
              )}
            </p>
          </FrontInfoRow>
        ) : null}

        {intro ? (
          <FrontInfoRow icon={User} label="소개">
            <p className="ldr-front-info-row__text">{intro}</p>
          </FrontInfoRow>
        ) : null}

        {validityDisplay ? (
          <FrontInfoRow icon={ShieldCheck} label={validityLabel} className="ldr-front-info-row--careers">
            <p className="ldr-front-info-row__text tabular-nums">{validityDisplay}</p>
          </FrontInfoRow>
        ) : null}
      </div>

      {embeddedInPush && verified ? (
        <div className={`ldr-auth-social-dock${socialOpen && hasSocial ? " is-open" : ""}`}>
          {hasSocial ? (
            <FrontSocialOutlinkButtons
              card={card}
              enableContactLinks={enableContactLinks}
              visible={socialOpen}
            />
          ) : null}
          <VluePushAuthSeal
            className="ldr-front-intro ldr-front-intro--verified"
            card={card}
            hideFollow={hideFollow}
            fallbackToMe={!isPeerCard}
            onToast={onToast}
            socialToggle={hasSocial}
            socialExpanded={socialOpen}
            onActivate={hasSocial ? () => setSocialOpen((v) => !v) : undefined}
          />
        </div>
      ) : null}
    </div>
  );
}

function BackPanel({
  card,
  verified: _verified,
  embeddedInPush = false,
  enableContactLinks: _enableContactLinks = true,
  onRequestDial: _onRequestDial
}) {
  const additionalNote = resolveBackAdditionalNote(card);
  const additionalPlaceholder = "명함 만들기에서 추가 설명을 입력할 수 있습니다.";

  return (
    <div className={`ldr-panel ldr-panel--back${embeddedInPush ? " ldr-panel--push" : ""}`}>
      <CompanyLogoWatermark card={card} />
      <div className="ldr-contact-extra ldr-contact-extra--back-only">
        <p className="ldr-contact-extra__label">추가 설명</p>
        <p
          className={`ldr-contact-extra__body${
            !additionalNote ? " ldr-contact-extra__body--placeholder" : ""
          }`.trim()}
        >
          {additionalNote || (embeddedInPush ? additionalPlaceholder : "등록된 추가 설명이 없습니다.")}
        </p>
      </div>
    </div>
  );
}

/**
 * 빅푸시 펼침 — 디지털 신분증 수신 UI (앞면 연락 / 뒷면 프로필)
 */
export default function LetteringDigitalReception({
  card: cardRaw,
  verified = true,
  verificationItems = [],
  incomingNumber = "",
  embeddedInPush = false,
  previewMode = false,
  /** 전화·메일·웹 링크 (저장 쇼케이스·통화목록 다시보기 포함) */
  enableContactLinks = true,
  face = "front",
  onFaceChange,
  className = "",
  /** 명함 프레임(탭·프로필·인증배지 포함) 전체를 덮는 DTMF 키패드 */
  keypadOpen = false,
  onKeypadClose,
  keypadDemoMode = false,
  onToast,
  hideFollow = false,
  /** 실통화 하단 통화옵션과 겹치지 않도록 토글 여백·크기 축소 */
  callChromeSafe = false
}) {
  const card = useMemo(() => normalizeLetteringCard(cardRaw || {}), [cardRaw]);
  const isDcp = card?.profileKind === "dcp" || card?.dcp;
  const items = verificationItems.length ? verificationItems : card.verificationItems;
  const panelWrapRef = useRef(null);
  const useStackedPanels = embeddedInPush && !previewMode;
  const [dialTarget, setDialTarget] = useState(null);
  /* 부모가 onFaceChange 를 안 넘기면 탭이 먹통이 되므로 내부 상태로 폴백 */
  const [internalFace, setInternalFace] = useState(() => (face === "back" ? "back" : "front"));
  const faceControlled = typeof onFaceChange === "function";
  const activeFace = faceControlled ? (face === "back" ? "back" : "front") : internalFace;
  const setActiveFace = faceControlled ? onFaceChange : setInternalFace;

  useEffect(() => {
    if (!faceControlled) return;
    setInternalFace(face === "back" ? "back" : "front");
  }, [face, faceControlled]);

  useEffect(() => {
    const root = panelWrapRef.current;
    if (!root) return;
    root.querySelectorAll(".ldr-panel").forEach((panel) => {
      panel.scrollTop = 0;
    });
  }, [activeFace]);

  const requestDial = (phone, _displayName) => {
    if (!enableContactLinks) return;
    /* 이메일·웹과 동일 — 확인 팝업 없이 즉시 일반전화(tel:) 연결 */
    if (!openPhoneDial(phone)) {
      setDialTarget({ phone, displayName: _displayName });
    }
  };

  if (isDcp) {
    return (
      <div
        className={`ldr-reception ldr-reception--dcp${embeddedInPush ? " ldr-reception--push" : ""}${
          previewMode ? " ldr-reception--preview" : ""
        } ${className}`.trim()}
      >
        <AgencyDcpCard card={card} incomingNumber={incomingNumber} />
      </div>
    );
  }

  const front = (
    <FrontPanel
      card={card}
      verified={verified}
      verificationItems={items}
      embeddedInPush={embeddedInPush}
      enableContactLinks={enableContactLinks}
      onRequestDial={requestDial}
      hideFollow={hideFollow}
      onToast={onToast}
    />
  );
  const back = (
    <BackPanel
      card={card}
      verified={verified}
      embeddedInPush={embeddedInPush}
      enableContactLinks={enableContactLinks}
      onRequestDial={requestDial}
    />
  );

  return (
    <div
      className={`ldr-reception${embeddedInPush ? " ldr-reception--push" : ""}${
        previewMode ? " ldr-reception--preview" : ""
      }${keypadOpen ? " ldr-reception--keypad" : ""}${
        callChromeSafe ? " ldr-reception--call-chrome" : ""
      } ${className}`.trim()}
      data-face={activeFace}
    >
      <div className="ldr-panel-wrap" role="tabpanel" ref={panelWrapRef} aria-hidden={keypadOpen}>
        {useStackedPanels ? (
          <div className="ldr-panel-stage">
            {front}
            {back}
          </div>
        ) : activeFace === "back" ? (
          back
        ) : (
          front
        )}
      </div>

      <FaceTabs face={activeFace} onFaceChange={setActiveFace} hidden={keypadOpen} />

      {keypadOpen ? (
        <div className="ldr-reception-keypad-layer">
          <InCallDtmfPad
            fill
            className="ldr-reception-keypad"
            demoMode={keypadDemoMode}
            onClose={() => onKeypadClose?.()}
            onToast={onToast}
          />
        </div>
      ) : null}

      <ShowcaseDialConfirmModal
        open={Boolean(dialTarget?.phone)}
        phone={dialTarget?.phone || ""}
        displayName={dialTarget?.displayName || ""}
        onClose={() => setDialTarget(null)}
        onConfirm={(phone) => openPhoneDial(phone)}
      />
    </div>
  );
}
