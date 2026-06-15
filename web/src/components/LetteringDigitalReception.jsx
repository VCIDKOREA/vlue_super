import { useMemo, useState } from "react";
import {
  Phone,
  Mail,
  MapPin,
  Globe,
  Briefcase,
  User,
  ShieldCheck,
  Check
} from "lucide-react";
import { formatLetteringPhoneDisplay } from "../lib/letteringPhoneMatch.js";
import { formatLetteringReceptionLines } from "../lib/letteringPaidIdentityDisplay.js";
import { resolveLetteringDemoLogoUrl } from "../lib/letteringDemoAssets.js";
import { formatLetteringContactEmailDisplay } from "../lib/letteringBizcardStorage.js";
import { normalizeLetteringCard } from "../lib/letteringCardNormalize.js";
import VluePushAuthSeal from "./VluePushAuthSeal.jsx";

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

function ContactRow({ icon: Icon, label, value, href, showCertBadge = false }) {
  if (!value) return null;
  const inner = (
    <div className="ldr-contact-row">
      <span className="ldr-contact-row__icon" aria-hidden>
        <Icon className="h-4 w-4" />
      </span>
      <div className="ldr-contact-row__body">
        <span className="ldr-contact-row__label">{label}</span>
        <span className="ldr-contact-row__value-line">
          <span className="ldr-contact-row__value">{value}</span>
          {showCertBadge ? <PhoneCertBadge /> : null}
        </span>
      </div>
    </div>
  );
  if (href) {
    return (
      <a href={href} className="ldr-contact-row-link" target={href.startsWith("http") ? "_blank" : undefined} rel="noreferrer">
        {inner}
      </a>
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
      {phoneDisplay || title ? (
        <p className="ldr-hero__contact">
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
        {phoneDisplay || title ? (
          <p className="ldr-hero__contact">
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

function FrontPanel({ card, verified, verificationItems = [], embeddedInPush = false }) {
  const intro = card.companyIntro || card.salesContent || "";
  const careers = verificationItems.length
    ? verificationItems
    : intro
      ? [intro]
      : ["VLUE 디지털 인증 명함이 연결되었습니다."];
  const phone = card.phone ? formatLetteringPhoneDisplay(card.phone) : "";
  const telHref = card.phone ? `tel:${String(card.phone).replace(/[^\d+]/g, "")}` : undefined;

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
          <h3 className="ldr-back-title">{card.name}</h3>
          <p className="ldr-back-sub">
            {[card.title, card.department, card.organization].filter(Boolean).join(" · ")}
          </p>
        </div>
      </div>

      <div className="ldr-front-profile-stack">
        {phone ? (
          <section className="ldr-back-section ldr-back-section--phone">
            <h4 className="ldr-back-section__title">
              <Phone className="h-4 w-4" aria-hidden />
              전화
            </h4>
            <p className="ldr-back-section__body ldr-back-section__body--phone">
              {telHref ? (
                <a href={telHref} className="ldr-front-phone-link">
                  {phone}
                </a>
              ) : (
                <span className="ldr-front-phone-link">{phone}</span>
              )}
              {verified ? <PhoneCertBadge /> : null}
            </p>
          </section>
        ) : null}

        <section className="ldr-back-section">
          <h4 className="ldr-back-section__title">
            <User className="h-4 w-4" aria-hidden />
            소개
          </h4>
          <p
            className={`ldr-back-section__body${
              !intro ? " ldr-back-section__body--placeholder" : ""
            }`.trim()}
          >
            {intro || "소개 문구를 명함 만들기에서 입력할 수 있습니다."}
          </p>
        </section>

        <section className="ldr-back-section">
          <h4 className="ldr-back-section__title">
            <Briefcase className="h-4 w-4" aria-hidden />
            인증 · 경력 요약
          </h4>
          <ul className="ldr-back-list">
            {careers.slice(0, 6).map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </section>
      </div>

      {embeddedInPush && verified ? (
        <VluePushAuthSeal className="ldr-front-intro ldr-front-intro--verified" />
      ) : !embeddedInPush && card.companyIntro ? (
        <p className="ldr-front-intro">{card.companyIntro}</p>
      ) : null}
    </div>
  );
}

function BackPanel({ card, verified, embeddedInPush = false }) {
  const fax = card.fax ? formatLetteringPhoneDisplay(card.fax) : "";
  const website = formatWebsite(card.website);
  const emailRaw = String(card.email || "").trim();
  const email = emailRaw ? formatLetteringContactEmailDisplay(emailRaw) : "";
  const additionalNote = resolveBackAdditionalNote(card);
  const additionalPlaceholder = "명함 만들기에서 추가 설명을 입력할 수 있습니다.";

  return (
    <div className={`ldr-panel ldr-panel--back${embeddedInPush ? " ldr-panel--push" : ""}`}>
      {embeddedInPush ? <WatermarkBackdrop card={card} /> : null}
      <div className="ldr-contact-list">
        <ContactRow icon={Mail} label="이메일" value={email} href={emailRaw ? `mailto:${emailRaw}` : undefined} />
        <ContactRow icon={MapPin} label="주소" value={card.address} />
        <ContactRow
          icon={Globe}
          label="웹사이트"
          value={website}
          href={website ? `https://${website}` : undefined}
        />
        {fax ? <ContactRow icon={Phone} label="팩스" value={fax} /> : null}
        <div className="ldr-contact-extra">
          <p className="ldr-contact-extra__label">추가 설명</p>
          <p
            className={`ldr-contact-extra__body${
              !additionalNote ? " ldr-contact-extra__body--placeholder" : ""
            }`.trim()}
          >
            {additionalNote || (embeddedInPush ? additionalPlaceholder : "")}
          </p>
        </div>
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
  face = "front",
  onFaceChange,
  className = ""
}) {
  const card = useMemo(() => normalizeLetteringCard(cardRaw || {}), [cardRaw]);
  const items = verificationItems.length ? verificationItems : card.verificationItems;

  return (
    <div
      className={`ldr-reception${embeddedInPush ? " ldr-reception--push" : ""} ${className}`.trim()}
      data-face={face}
    >
      <div className="ldr-face-tabs" role="tablist" aria-label="명함 면">
        <button
          type="button"
          role="tab"
          aria-selected={face === "front"}
          className={`ldr-face-tab${face === "front" ? " ldr-face-tab--active" : ""}`}
          onClick={() => onFaceChange?.("front")}
        >
          앞면 · 프로필
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={face === "back"}
          className={`ldr-face-tab${face === "back" ? " ldr-face-tab--active" : ""}`}
          onClick={() => onFaceChange?.("back")}
        >
          뒷면 · 연락
        </button>
      </div>

      <div className="ldr-panel-wrap" role="tabpanel">
        {embeddedInPush ? (
          <div className="ldr-panel-stage">
            <FrontPanel card={card} verified={verified} verificationItems={items} embeddedInPush />
            <BackPanel card={card} verified={verified} embeddedInPush />
          </div>
        ) : face === "back" ? (
          <BackPanel card={card} verified={verified} embeddedInPush={false} />
        ) : (
          <FrontPanel card={card} verified={verified} verificationItems={items} embeddedInPush={false} />
        )}
      </div>
    </div>
  );
}
