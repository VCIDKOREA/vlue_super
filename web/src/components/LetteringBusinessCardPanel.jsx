import { useMemo, useState } from "react";
import { formatLetteringPhoneDisplay } from "../lib/letteringPhoneMatch.js";
import { formatLetteringPaidIdentity } from "../lib/letteringPaidIdentityDisplay.js";
import { resolveLetteringDemoLogoUrl } from "../lib/letteringDemoAssets.js";
import { corporateBrandingStyleVars } from "../lib/b2bCorporateBranding.js";
import BizcardInlineQr from "./BizcardInlineQr.jsx";
import {
  LetteringBizcardSecurityOverlayBack,
  LetteringBizcardSecurityOverlayFront
} from "./LetteringBizcardSecurityOverlay.jsx";

function formatWebsiteDisplay(raw) {
  return String(raw || "")
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "");
}

function resolveBizcardFax(card) {
  return String(
    card.fax || card.officePhone || card.faxNumber || card.tel || card.landline || ""
  ).trim();
}

function resolveBizcardDepartment(card) {
  return String(
    card.department || card.dept || card.team || card.division || card.departmentName || ""
  ).trim();
}

function resolveBizcardAddress(card) {
  const primary = String(
    card.address || card.businessAddress || card.companyAddress || card.officeAddress || ""
  ).trim();
  if (primary) return primary;

  const road = String(card.roadAddress || card.companyAddressRoad || "").trim();
  const detail = String(card.addressDetail || "").trim();
  if (road && detail) return `${road} ${detail}`;
  return road || detail;
}

function buildBizcardContactRows(card) {
  const fax = resolveBizcardFax(card);
  const rows = [
    { label: "T", value: card.phone ? formatLetteringPhoneDisplay(card.phone) : "" },
    { label: "F", value: fax ? formatLetteringPhoneDisplay(fax) : "" },
    { label: "H", value: formatWebsiteDisplay(card.website || card.homepage || card.url) },
    { label: "E", value: String(card.email || "").trim() }
  ];
  return rows.filter((row) => row.value);
}

function VlueVerifiedBadge({ className = "" }) {
  return (
    <span
      className={`lettering-vlue-verified-badge inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center text-[10px] font-black leading-none ${className}`.trim()}
      title="VLUE 인증"
      aria-label="VLUE 인증됨"
    >
      {"\u2713"}
    </span>
  );
}

/** 유료 명함 — 도용 방지 VLUE 홀로그램 (앞·뒷면 공통) */
function BizcardHologram() {
  return (
    <div className="lettering-bizcard__hologram" aria-hidden>
      <span className="lettering-bizcard__hologram-aurora" />
      <span className="lettering-bizcard__hologram-mesh" />
      <span className="lettering-bizcard__hologram-shine" />
      <span className="lettering-bizcard__hologram-mark">VLUE</span>
    </div>
  );
}

function BizcardFace({ className = "", children, overlay = null }) {
  return (
    <div className={`lettering-bizcard__face ${className}`.trim()}>
      <BizcardHologram />
      <div className="lettering-bizcard__face-content">{children}</div>
      {overlay}
    </div>
  );
}

function BizAvatar({ card }) {
  const [imgBroken, setImgBroken] = useState(false);
  const photoUrl = card.photoUrl || "";
  const logoUrl = card.logoUrl || resolveLetteringDemoLogoUrl(card);
  const src = photoUrl || logoUrl;
  const isLogoOnly = !photoUrl && Boolean(logoUrl);
  const fallbackLabel = (card.organization || card.name || "?").slice(0, 1);

  return (
    <span className="lettering-bizcard__avatar">
      {src && !imgBroken ? (
        <img
          src={src}
          alt=""
          className={`h-full w-full ${isLogoOnly ? "object-contain p-1" : "object-cover"}`}
          onError={() => setImgBroken(true)}
        />
      ) : (
        <span className="lettering-bizcard__avatar-fallback">{fallbackLabel}</span>
      )}
    </span>
  );
}

function CardFront({ card, securityOverlay }) {
  const { companyLine, name: personName, title: personTitle, hasPersonLine } =
    formatLetteringPaidIdentity(card);
  const contactRows = buildBizcardContactRows(card);
  const department = resolveBizcardDepartment(card);
  const hasLower = Boolean(department || hasPersonLine || contactRows.length);
  const hasIdentityBlock = Boolean(department || hasPersonLine);

  const frontOverlay = securityOverlay ? <LetteringBizcardSecurityOverlayFront /> : null;

  return (
    <BizcardFace className="lettering-bizcard__face--front" overlay={frontOverlay}>
      <div className="lettering-bizcard__top">
        <BizAvatar card={card} />
        <div className="lettering-bizcard__identity min-w-0">
          <p className="lettering-bizcard__name-row">
            <span className="lettering-bizcard__name">{companyLine}</span>
            <VlueVerifiedBadge />
          </p>
        </div>
      </div>

      {hasLower ? (
        <div
          className={`lettering-bizcard__front-main${
            !hasIdentityBlock
              ? " lettering-bizcard__front-main--contact-only"
              : !contactRows.length
                ? " lettering-bizcard__front-main--identity-only"
                : ""
          }`}
        >
          {contactRows.length ? (
            <div className="lettering-bizcard__contact">
              {contactRows.map((row) => (
                <p
                  key={row.label}
                  className={`lettering-bizcard__contact-line${
                    row.label === "H" || row.label === "E" ? " lettering-bizcard__contact-line--url" : ""
                  }`}
                >
                  <span className="lettering-bizcard__contact-label">{row.label}</span>
                  <span className="lettering-bizcard__contact-value">{row.value}</span>
                </p>
              ))}
              {securityOverlay && !hasIdentityBlock ? (
                <BizcardInlineQr card={card} cardId={securityOverlay.cardId || ""} />
              ) : null}
            </div>
          ) : null}
          {hasIdentityBlock ? (
            <div className="lettering-bizcard__front-identity">
              {department ? <p className="lettering-bizcard__front-dept">{department}</p> : null}
              {hasPersonLine ? (
                <div className="lettering-bizcard__front-person">
                  {personName ? (
                    <p className="lettering-bizcard__front-person-name">{personName}</p>
                  ) : null}
                  {personTitle ? (
                    <p className="lettering-bizcard__front-person-title">{personTitle}</p>
                  ) : null}
                </div>
              ) : null}
              {securityOverlay ? (
                <BizcardInlineQr card={card} cardId={securityOverlay.cardId || ""} />
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      <p className="lettering-bizcard__vlue-mark" aria-hidden>
        VLUE
      </p>
    </BizcardFace>
  );
}

function CardBack({ card, securityOverlay }) {
  const intro = (card.companyIntro || "").trim();
  const address = resolveBizcardAddress(card);
  const backOverlay = securityOverlay ? (
    <LetteringBizcardSecurityOverlayBack
      card={card}
      cardId={securityOverlay.cardId || ""}
      issuedAt={securityOverlay.issuedAt || null}
    />
  ) : null;

  return (
    <BizcardFace className="lettering-bizcard__face--back" overlay={backOverlay}>
      {intro ? (
        <div className="lettering-bizcard__back-main">
          <section className="lettering-bizcard__back-section">
            <p className="lettering-bizcard__back-title">{"\uD68C\uC0AC \uC18C\uAC1C"}</p>
            <p className="lettering-bizcard__back-body lettering-bizcard__back-body--intro">{intro}</p>
          </section>
        </div>
      ) : null}

      {address ? (
        <p className="lettering-bizcard__back-address">
          <span className="lettering-bizcard__back-address-label">{"\uC0AC\uC5C5\uC7A5"}</span>
          {address}
        </p>
      ) : null}

      {!intro && !address ? (
        <p className="lettering-bizcard__back-empty-hint">
          {"\uD68C\uC0AC \uC18C\uAC1C\uC640 \uC0AC\uC5C5\uC7A5\uC744 \uC124\uC815\uD558\uBA74 \uB4B7\uBA74\uC5D0 \uD45C\uC2DC\uB429\uB2C8\uB2E4. \uC0AC\uC6A9\uC720\uD6A8\uAE30\uAC04\uC740 \uD558\uB2E8\uC5D0 \uD45C\uC2DC\uB429\uB2C8\uB2E4."}
        </p>
      ) : null}
    </BizcardFace>
  );
}

/** 유료 회원 — 펼침 명함 (앞면 / 뒷면 플립) */
export default function LetteringBusinessCardPanel({
  card,
  /** 기업 귀속 시 렌더 전용 카드 (개인 원본은 card prop에 유지) */
  displayCard: displayCardProp,
  corporateOverride = false,
  securityOverlay = null
}) {
  const [flipped, setFlipped] = useState(false);
  const displayCard = displayCardProp || card;
  const brandingStyle = useMemo(
    () => corporateBrandingStyleVars(displayCard),
    [displayCard]
  );
  const rootClass = [
    "lettering-bizcard",
    "lettering-bizcard--paid",
    securityOverlay ? "lettering-bizcard--with-security" : "",
    corporateOverride ? "lettering-bizcard--corporate-override" : ""
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={rootClass} style={brandingStyle}>
      {corporateOverride ? (
        <p className="lettering-bizcard__corp-badge" aria-hidden>
          기업 공식 CI
        </p>
      ) : null}
      <div className={`lettering-bizcard__flip ${flipped ? "lettering-bizcard__flip--back" : ""}`}>
        <CardFront card={displayCard} securityOverlay={securityOverlay} />
        <CardBack card={displayCard} securityOverlay={securityOverlay} />
      </div>
      <button
        type="button"
        onClick={() => setFlipped((v) => !v)}
        className="lettering-bizcard__flip-btn"
        aria-pressed={flipped}
      >
        {flipped ? "\uBA85\uD568 \uC55E\uBA74" : "\uBA85\uD568 \uB4B7\uBA74"}
      </button>
    </div>
  );
}
