import VlueCyanVerifiedSeal from "../VlueCyanVerifiedSeal.jsx";
import { formatLetteringPhoneDisplay } from "../../lib/letteringPhoneMatch.js";
import {
  isVlueBrandOrganization,
  resolveCallOverlayIdentityLines
} from "../../lib/letteringPaidIdentityDisplay.js";
import IdentitySecondaryText from "../IdentitySecondaryText.jsx";

/**
 * 쇼케이스 좌측 하단 식별
 * 회사명 있으면 1줄 회사명 / 2줄 이름 | 직급 (구분선 시안블루)
 */
export default function ShowcaseIdentityCorner({
  name = "",
  organization = "",
  phone = "",
  title = "",
  department = "",
  /** 유료 회원·유료 가족만. 본인인증(verified)과 분리. */
  cyanBadge = false,
  kicker = "",
  hint = "",
  showName = true
}) {
  const rawOrg = String(organization || "").trim();
  const org = isVlueBrandOrganization(rawOrg) ? "" : rawOrg;
  const nm = String(name || "").trim();
  const phoneLabel = formatLetteringPhoneDisplay(phone) || String(phone || "").trim() || "";
  const showIdentity = showName !== false;
  const lines = resolveCallOverlayIdentityLines(
    { organization: org, name: nm, phone: phoneLabel, title, department },
    { incomingNumber: phoneLabel }
  );
  const primary = showIdentity ? org || nm : "";
  const secondary = showIdentity ? (org ? lines.secondary : phoneLabel) : phoneLabel;

  return (
    <div className="showcase-identity-corner">
      {kicker ? <p className="showcase-identity-corner__kicker">{kicker}</p> : null}
      {primary ? (
        <p className="showcase-identity-corner__name">
          <span className="showcase-identity-corner__name-text">{primary}</span>
          {cyanBadge ? (
            <VlueCyanVerifiedSeal size={16} className="showcase-identity-corner__badge" />
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
