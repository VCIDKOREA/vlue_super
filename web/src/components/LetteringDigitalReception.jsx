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
import { resolveLetteringDemoLogoUrl } from "../lib/letteringDemoAssets.js";
import { formatLetteringContactEmailDisplay } from "../lib/letteringBizcardStorage.js";
import { normalizeLetteringCard } from "../lib/letteringCardNormalize.js";
import {
  formatTitleDeptLine,
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

function formatWebsite(raw) {
  return String(raw || "")
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "");
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

function WatermarkBackdrop({ card }) {
  const [imgBroken, setImgBroken] = useState(false);
  const photoUrl = card.photoUrl || "";
  const logoUrl = card.logoUrl || resolveLetteringDemoLogoUrl(card);
  const heroSrc = photoUrl || logoUrl;
  if (!heroSrc || imgBroken) return null;

  return (
    <div className="ldr-watermark" aria-hidden>
      <img src={heroSrc} alt="" className="ldr-watermark__img" onError={() => setImgBroken(true)} />
    </div>
  );
}

function ProfileMedia({ card, className = "", variant = "avatar" }) {
  const [imgBroken, setImgBroken] = useState(false);
  const photoUrl = card.photoUrl || "";
  const logoUrl = card.logoUrl || resolveLetteringDemoLogoUrl(card);
  const src = photoUrl || logoUrl;
  const isLogoOnly = !photoUrl && Boolean(src);
  const fallback = (card.name || card.organization || "V").slice(0, 1);

  return (
    <div
      className={`ldr-profile-media ldr-profile-media--${variant}${
        isLogoOnly ? " ldr-profile-media--logo" : ""
      }${className ? ` ${className}` : ""}`.trim()}
    >
      {src && !imgBroken ? (
        <img src={src} alt="" className="ldr-profile-media__img" onError={() => setImgBroken(true)} />
      ) : (
        <span className="ldr-profile-media__fallback" aria-hidden>
          {fallback}
        </span>
      )}
    </div>
  );
}

function BackPanelHero({ card }) {
  const photoUrl = card.photoUrl || "";
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
  const photoUrl = card.photoUrl || "";
  const logoUrl = card.logoUrl || resolveLetteringDemoLogoUrl(card);
  const heroSrc = photoUrl || logoUrl;
  const isLogoOnly = !photoUrl && Boolean(heroSrc);
  const lines = formatLetteringReceptionLines(card, { incomingNumber });
  const orgLine = lines.expandedOrgLine;
  const personName = lines.organization && lines.name ? lines.name : "";
  const phoneDisplay = lines.phone ? formatLetteringPhoneDisplay(lines.phone) : "";
  const title = lines.title;

  const heroCopy = (
    <div className={`ldr-hero__copy${isLogoOnly ? " ldr-hero__copy--watermark" : ""}`}>
      {verified ? (
        <span className={`ldr-hero__badge${isLogoOnly ? " ldr-hero__badge--inline" : ""}`}>
          <ShieldCheck className="h-3.5 w-3.5" />
          VLUE 인증
        </span>
      ) : null}
      {orgLine ? <p className="ldr-hero__brand">{orgLine}</p> : null}
      {personName || phoneDisplay || title ? (
        <p className="ldr-hero__contact">
          {personName ? <span className="ldr-hero__person">{personName}</span> : null}
          {personName && (phoneDisplay || title) ? <span className="ldr-hero__contact-sep"> / </span> : null}
          {phoneDisplay ? <span className="ldr-hero__phone">{phoneDisplay}</span> : null}
          {phoneDisplay && title ? <span className="ldr-hero__contact-sep"> / </span> : null}
          {title ? <span className="ldr-hero__title">{title}</span> : null}
        </p>
      ) : null}
    </div>
  );

  if (isLogoOnly) {
    return (
      <div className="ldr-hero ldr-hero--watermark">
        <div className="ldr-hero__watermark-stage" aria-hidden>
          {heroSrc && !imgBroken ? (
            <img
              src={heroSrc}
              alt=""
              className="ldr-hero__watermark-img"
              onError={() => setImgBroken(true)}
            />
          ) : (
            <span className="ldr-hero__watermark-fallback">{(orgLine || "V").slice(0, 1)}</span>
          )}
        </div>
        {heroCopy}
      </div>
    );
  }

  return (
    <div className="ldr-hero">
      <div className="ldr-hero__visual">
        {heroSrc && !imgBroken ? (
          <img
            src={heroSrc}
            alt=""
            className="ldr-hero__photo"
            onError={() => setImgBroken(true)}
          />
        ) : (
          <div className="ldr-hero__fallback" aria-hidden>
            {(orgLine || "V").slice(0, 1)}
          </div>
        )}
        <div className="ldr-hero__shade" />
        {verified ? (
          <span className="ldr-hero__badge">
            <ShieldCheck className="h-3.5 w-3.5" />
            VLUE 인증
          </span>
        ) : null}
      </div>
      <div className="ldr-hero__copy ldr-hero__copy--overlay">
        {orgLine ? <p className="ldr-hero__brand">{orgLine}</p> : null}
        {personName || phoneDisplay || title ? (
          <p className="ldr-hero__contact">
            {personName ? <span className="ldr-hero__person">{personName}</span> : null}
            {personName && (phoneDisplay || title) ? <span className="ldr-hero__contact-sep"> / </span> : null}
            {phoneDisplay ? <span className="ldr-hero__phone">{phoneDisplay}</span> : null}
            {phoneDisplay && title ? <span className="ldr-hero__contact-sep"> / </span> : null}
            {title ? <span className="ldr-hero__title">{title}</span> : null}
          </p>
        ) : null}
      </div>
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
  const phone = card.phone ? formatLetteringPhoneDisplay(card.phone) : "";
  const phoneRaw = String(card.phone || "").trim();
  const faxRaw = String(card.fax || "").trim();
  const fax = faxRaw ? formatLetteringPhoneDisplay(faxRaw) : "";
  const website = formatWebsite(card.website);
  const emailRaw = String(card.email || "").trim();
  const email = emailRaw ? formatLetteringContactEmailDisplay(emailRaw) : "";
  /* 이메일만 필수 — 미입력 시 짧은 안내. 주소·웹·팩스는 값 있을 때만 표기 */
  const emailValue = email || VLUE_PREVIEW_EMAIL_PLACEHOLDER;
  const addressRaw = String(card.address || "").trim();
  const intro = String(card.companyIntro || card.salesContent || "").trim();
  const validityFromItems = (verificationItems || [])
    .map((line) => String(line || "").trim())
    .find((line) => /인증유효기간/.test(line));
  const validityDisplay = validityFromItems
    ? validityFromItems.replace(/^인증유효기간\s*[:：]?\s*/, "").trim()
    : resolveAuthValidityPeriod({
        paidAt: card.authPaidAt || card.issuedAt || null,
        billingCycle: card.billingCycle || null
      }).line;

  return (
    <div className={`ldr-panel ldr-panel--front${embeddedInPush ? " ldr-panel--push" : ""}`}>
      {embeddedInPush ? (
        <WatermarkBackdrop card={card} />
      ) : (
        <ProfileHero card={card} verified={verified} />
      )}
      {embeddedInPush ? <BackPanelHero card={card} /> : null}
      <div className={`ldr-back-head${card.photoUrl && embeddedInPush ? " ldr-back-head--with-hero" : ""}`}>
        {embeddedInPush && !card.photoUrl ? (
          <ProfileMedia card={card} className="ldr-back-head__media" />
        ) : null}
        <div className="ldr-back-head__copy">
          <p className="ldr-back-kicker">Digital ID · Profile</p>
          <div className="ldr-back-title-row">
            <h3 className="ldr-back-title">
              {String(card.organization || "").trim() || card.name}
            </h3>
            {verified ? (
              <ShieldCheck className="ldr-name-shield" strokeWidth={2.35} aria-label="VLUE 인증됨" />
            ) : null}
          </div>
          {String(card.organization || "").trim() && String(card.name || "").trim() ? (
            <p className="ldr-back-person-name">{card.name}</p>
          ) : null}
          {card.previewTitleDeptPlaceholder ||
          card.previewExampleBrand ||
          card.title ||
          card.department ? (
            <p
              className={`ldr-back-sub${
                card.previewTitleDeptPlaceholder || card.previewExampleBrand
                  ? " ldr-back-sub--placeholder"
                  : ""
              }`.trim()}
            >
              {card.previewTitleDeptPlaceholder || card.previewExampleBrand
                ? VLUE_PREVIEW_TITLE_DEPT_PLACEHOLDER
                : formatTitleDeptLine(card.title, card.department)}
            </p>
          ) : null}
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
          <FrontInfoRow icon={ShieldCheck} label="인증유효기간" className="ldr-front-info-row--careers">
            <p className="ldr-front-info-row__text tabular-nums">{validityDisplay}</p>
          </FrontInfoRow>
        ) : null}
      </div>

      {embeddedInPush && verified ? (
        <VluePushAuthSeal
          className="ldr-front-intro ldr-front-intro--verified"
          card={card}
          hideFollow={hideFollow}
          onToast={onToast}
        />
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
      {embeddedInPush ? <WatermarkBackdrop card={card} /> : null}
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
  hideFollow = false
}) {
  const card = useMemo(() => normalizeLetteringCard(cardRaw || {}), [cardRaw]);
  const items = verificationItems.length ? verificationItems : card.verificationItems;
  const panelWrapRef = useRef(null);
  const useStackedPanels = embeddedInPush && !previewMode;
  const [dialTarget, setDialTarget] = useState(null);

  useEffect(() => {
    const root = panelWrapRef.current;
    if (!root) return;
    root.querySelectorAll(".ldr-panel").forEach((panel) => {
      panel.scrollTop = 0;
    });
  }, [face]);

  const requestDial = (phone, displayName) => {
    if (!enableContactLinks) return;
    setDialTarget({ phone, displayName });
  };

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
      }${keypadOpen ? " ldr-reception--keypad" : ""} ${className}`.trim()}
      data-face={face}
    >
      <div className="ldr-face-tabs" role="tablist" aria-label="명함 면" aria-hidden={keypadOpen}>
        <button
          type="button"
          role="tab"
          aria-selected={face === "front"}
          className={`ldr-face-tab${face === "front" ? " ldr-face-tab--active" : ""}`}
          onClick={(e) => {
            e.stopPropagation();
            onFaceChange?.("front");
          }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          앞면 · 프로필
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={face === "back"}
          className={`ldr-face-tab${face === "back" ? " ldr-face-tab--active" : ""}`}
          onClick={(e) => {
            e.stopPropagation();
            onFaceChange?.("back");
          }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          뒷면 · 연락
        </button>
      </div>

      <div className="ldr-panel-wrap" role="tabpanel" ref={panelWrapRef} aria-hidden={keypadOpen}>
        {useStackedPanels ? (
          <div className="ldr-panel-stage">
            {front}
            {back}
          </div>
        ) : face === "back" ? (
          back
        ) : (
          front
        )}
      </div>

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
