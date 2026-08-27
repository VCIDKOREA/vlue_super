import { ShieldCheck } from "lucide-react";
import { formatLetteringPhoneDisplay } from "../../lib/letteringPhoneMatch.js";
import { isVlueBrandOrganization } from "../../lib/letteringPaidIdentityDisplay.js";
import IdentitySecondaryText from "../IdentitySecondaryText.jsx";

/**
 * 일반·유료(명함 미사용) 쇼케이스 — 좌측 하단 식별 정보
 * 빅푸시와 동일: 1줄 상호|이름 / 2줄 이름|전화 또는 전화
 */
export default function ShowcaseIdentityCorner({
  name = "",
  organization = "",
  phone = "",
  verified = true,
  kicker = "",
  hint = "",
  showName = true
}) {
  const rawOrg = String(organization || "").trim();
  const org = isVlueBrandOrganization(rawOrg) ? "" : rawOrg;
  const nm = String(name || "").trim();
  const phoneLabel = formatLetteringPhoneDisplay(phone) || String(phone || "").trim() || "";
  const showIdentity = showName !== false;
  const primary = showIdentity ? org || nm : "";
  const secondary = showIdentity
    ? org
      ? [nm, phoneLabel].filter(Boolean).join(" | ")
      : phoneLabel
    : phoneLabel;

  return (
    <div className="showcase-identity-corner">
      {kicker ? <p className="showcase-identity-corner__kicker">{kicker}</p> : null}
      {primary ? (
        <p className="showcase-identity-corner__name">
          <span className="showcase-identity-corner__name-text">{primary}</span>
          {verified ? (
            <ShieldCheck className="showcase-identity-corner__badge" strokeWidth={2.4} aria-label="VLUE 인증" />
          ) : null}
        </p>
      ) : null}
      {secondary ? (
        <IdentitySecondaryText text={secondary} className="showcase-identity-corner__org" as="p" />
      ) : null}
      {hint ? <p className="showcase-identity-corner__hint">{hint}</p> : null}
    </div>
  );
}
