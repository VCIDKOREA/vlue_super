import { ShieldCheck } from "lucide-react";
import { formatLetteringPhoneDisplay } from "../../lib/letteringPhoneMatch.js";

/**
 * 일반·유료(명함 미사용) 쇼케이스 — 좌측 하단 식별 정보
 * 상호·이름(설정에 따라) + 전화번호
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
  const org = String(organization || "").trim();
  const nm = String(name || "").trim();
  const phoneLabel = formatLetteringPhoneDisplay(phone) || String(phone || "").trim() || "—";
  const showIdentity = showName !== false;
  const primary = showIdentity ? org || nm : "";
  const secondary = showIdentity && org && nm ? nm : "";

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
      {secondary ? <p className="showcase-identity-corner__org">{secondary}</p> : null}
      <p className="showcase-identity-corner__phone">{phoneLabel}</p>
      {hint ? <p className="showcase-identity-corner__hint">{hint}</p> : null}
    </div>
  );
}
