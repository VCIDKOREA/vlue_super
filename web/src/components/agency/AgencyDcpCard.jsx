import { Globe, Phone } from "lucide-react";
import { formatAgencyTelHref, formatWebHref } from "../../lib/showcase/showcaseContactActions.js";
import { formatLetteringPhoneDisplay } from "../../lib/letteringPhoneMatch.js";
import { ABNORMAL_REPORT_URL } from "../../lib/nationalAgencyDcpClient.js";

const DEFAULT_WARNING =
  "🚨 현재 번호는 비정상 발신 번호로 의심됩니다! 즉시 통화를 종료하고 공식 정보를 확인하세요!!";
const NORMAL_MESSAGE =
  "공식 국가기관 번호로 확인되었습니다. 디지털인증프로필을 확인하세요.";

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
const EXPIRED_MESSAGE = "인증기간이 만료된 번호입니다. 직접 확인 부탁드립니다.";

export default function AgencyDcpCard({
  card = {},
  incomingNumber = "",
  compact = false,
  variant = "normal",
  warning = "",
  onClose
}) {
  const dcp = card?.dcp && typeof card.dcp === "object" ? card.dcp : {};
  const expired = variant === "expired";
  const agencyName = expired
    ? String(card.displayName || card.name || incomingNumber || "").trim()
    : String(dcp.agencyName || card.organization || card.name || "").trim();
  const phoneRaw = String(dcp.shortNumber || card.phone || incomingNumber || "").trim();
  const phone = formatLetteringPhoneDisplay(phoneRaw) || phoneRaw;
  const website = expired ? "" : String(dcp.officialWebsite || card.website || "").trim();
  const telHref = formatAgencyTelHref(phoneRaw);
  const webHref = formatWebHref(website);
  const abnormal = variant === "abnormal";
  const warnText = expired
    ? String(warning || card.expiredDetail || EXPIRED_MESSAGE).trim()
    : abnormal
      ? String(warning || dcp.warning || DEFAULT_WARNING).trim()
      : NORMAL_MESSAGE;

  return (
    <article
      className={`agency-dcp-card${compact ? " is-compact" : ""}${abnormal ? " is-abnormal" : ""}${expired ? " is-expired" : ""}`}
      data-profile={expired ? "expired-line" : "dcp"}
    >
      <p className="agency-dcp-card__badge">
        {expired ? "인증기간 만료" : abnormal ? "경로 검증 · 비정상" : "경로 검증 · 정상"}
      </p>
      <p className="agency-dcp-card__warn">{warnText}</p>
      <h1 className="agency-dcp-card__name">{expired ? phone || agencyName || "만료된 번호" : agencyName || "국가기관"}</h1>
      {expired ? (
        telHref ? (
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
        )
      ) : telHref ? (
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
      {expired ? null : webHref ? (
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
      {onClose || abnormal || expired ? (
        <button
          type="button"
          className={`agency-dcp-card__close${abnormal ? " is-danger" : ""}`}
          onPointerDown={stopDrag}
          onClick={(e) => {
            stopDrag(e);
            if (abnormal && typeof window !== "undefined") {
              window.open(ABNORMAL_REPORT_URL, "_blank", "noopener,noreferrer");
            }
            onClose?.();
          }}
        >
          {expired ? "닫기" : "확인"}
        </button>
      ) : null}
    </article>
  );
}
