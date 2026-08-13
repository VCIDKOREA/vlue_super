import { Globe, Phone } from "lucide-react";
import { formatAgencyTelHref, formatWebHref } from "../../lib/showcase/showcaseContactActions.js";

function websiteLabel(url) {
  return String(url || "")
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/\/$/, "");
}

function stopDrag(e) {
  e.stopPropagation();
}

/**
 * 국가기관 디지털인증프로필(DCP)
 * 로고 / 공식 번호 / 공식 웹사이트 — 임의 로고를 그리지 않음
 */
export default function AgencyDcpCard({
  card = {},
  incomingNumber = "",
  compact = false,
  variant = "normal",
  warning = "",
  onClose
}) {
  const dcp = card?.dcp && typeof card.dcp === "object" ? card.dcp : {};
  const agencyName = String(dcp.agencyName || card.organization || card.name || "").trim();
  const phone = String(dcp.shortNumber || card.phone || incomingNumber || "").trim();
  const website = String(dcp.officialWebsite || card.website || "").trim();
  const logoUrl = String(dcp.logoUrl || card.logoUrl || card.photoUrl || "").trim();
  const telHref = formatAgencyTelHref(phone);
  const webHref = formatWebHref(website);
  const abnormal = variant === "abnormal";
  const warnText = String(warning || dcp.warning || "").trim();

  return (
    <article
      className={`agency-dcp-card${compact ? " is-compact" : ""}${abnormal ? " is-abnormal" : ""}`}
      data-profile="dcp"
    >
      <p className="agency-dcp-card__badge">
        {abnormal ? "경로 검증 · 비정상" : "VLUE DCP · 디지털인증프로필"}
      </p>
      <div className="agency-dcp-card__logo-wrap">
        {logoUrl ? (
          <img src={logoUrl} alt={`${agencyName} 공식 로고`} className="agency-dcp-card__logo" draggable={false} />
        ) : (
          <div className="agency-dcp-card__logo-empty">
            <p>공식 로고 미등록</p>
            <p>관리자 페이지에서 기관 로고를 업로드해 주세요.</p>
          </div>
        )}
      </div>
      {abnormal && warnText ? <p className="agency-dcp-card__warn">{warnText}</p> : null}
      <h1 className="agency-dcp-card__name">{agencyName || "국가기관"}</h1>
      {telHref ? (
        <a
          className="agency-dcp-card__phone"
          href={telHref}
          onPointerDown={stopDrag}
          onClick={stopDrag}
        >
          <Phone size={16} aria-hidden />
          <span>{phone}</span>
        </a>
      ) : (
        <p className="agency-dcp-card__phone">
          <Phone size={16} aria-hidden />
          <span>{phone || "—"}</span>
        </p>
      )}
      {webHref ? (
        <a
          className="agency-dcp-card__web"
          href={webHref}
          target="_blank"
          rel="noopener noreferrer"
          onPointerDown={stopDrag}
          onClick={stopDrag}
        >
          <Globe size={16} aria-hidden />
          <span>해당 공식 웹사이트</span>
          <strong>{websiteLabel(website)}</strong>
        </a>
      ) : (
        <p className="agency-dcp-card__web-empty">공식 웹사이트 미등록</p>
      )}
      {onClose ? (
        <button
          type="button"
          className={`agency-dcp-card__close${abnormal ? " is-danger" : ""}`}
          onPointerDown={stopDrag}
          onClick={(e) => {
            stopDrag(e);
            onClose();
          }}
        >
          확인
        </button>
      ) : null}
    </article>
  );
}
