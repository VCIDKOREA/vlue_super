import { ShieldCheck } from "lucide-react";
import { TENT_THEME } from "../../lib/showcase/tentShowcaseTypes.js";

/**
 * 매트 실버 / 플래티넘 VLUE 디지털 신원 인증 마크
 */
export default function TentIdentityBadge({
  verified = true,
  premium = false,
  size = "md",
  label = "VLUE 인증"
}) {
  const dim = size === "lg" ? "tent-badge--lg" : size === "sm" ? "tent-badge--sm" : "tent-badge--md";
  if (!verified) {
    return (
      <span className={`tent-badge tent-badge--unverified ${dim}`} title="미인증">
        <span className="tent-badge__mark">?</span>
        <span className="tent-badge__text">미인증 번호</span>
      </span>
    );
  }

  return (
    <span
      className={`tent-badge tent-badge--verified ${premium ? "tent-badge--premium" : ""} ${dim}`}
      style={{ "--tent-silver": TENT_THEME.matteSilver, "--tent-neon": TENT_THEME.neonBlue }}
      title={label}
      aria-label={label}
    >
      <span className="tent-badge__orb" aria-hidden>
        <ShieldCheck className="tent-badge__icon" strokeWidth={2.25} />
      </span>
      <span className="tent-badge__copy">
        <span className="tent-badge__text">{label}</span>
        {premium ? <span className="tent-badge__sub">디지털 신원 검증</span> : null}
      </span>
    </span>
  );
}
