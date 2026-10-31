import VlueCyanVerifiedSeal from "./VlueCyanVerifiedSeal.jsx";

const CHECK_PATH = "M7.4 12.3 10.4 15.3 17.1 8.2 18.5 9.6 10.4 17.7 6.1 13.4Z";

/** VlueCyanVerifiedSeal 과 동일한 12톱니 스캘럽 */
function buildScallopedSealPath(cx, cy, outerR, innerR, teeth = 12) {
  const parts = [];
  for (let i = 0; i < teeth; i++) {
    const a0 = -Math.PI / 2 + (i * 2 * Math.PI) / teeth;
    const a1 = -Math.PI / 2 + ((i + 0.5) * 2 * Math.PI) / teeth;
    const a2 = -Math.PI / 2 + ((i + 1) * 2 * Math.PI) / teeth;
    const x0 = cx + outerR * Math.cos(a0);
    const y0 = cy + outerR * Math.sin(a0);
    const x1 = cx + innerR * Math.cos(a1);
    const y1 = cy + innerR * Math.sin(a1);
    const x2 = cx + outerR * Math.cos(a2);
    const y2 = cy + outerR * Math.sin(a2);
    if (i === 0) parts.push(`M${x0.toFixed(2)},${y0.toFixed(2)}`);
    parts.push(`Q${x1.toFixed(2)},${y1.toFixed(2)} ${x2.toFixed(2)},${y2.toFixed(2)}`);
  }
  return `${parts.join(" ")} Z`;
}

const SEAL_PATH = buildScallopedSealPath(12, 12, 10.5, 8.85, 12);

/**
 * 유료·인증 회원 배지 표시 여부.
 * isPaidUser / isVerified / cyanBadgeActive / vlueVerifiedBadge 를 모두 수용.
 */
export function userHasVerifiedBadge(user) {
  if (!user || typeof user !== "object") return false;
  return Boolean(
    user.isPaidUser === true ||
      user.isVerified === true ||
      user.cyanBadgeActive === true ||
      user.vlueVerifiedBadge === true ||
      user.vlue_verified_badge === true ||
      user.paidMember === true ||
      user.isPaid === true
  );
}

/** 지도 HtmlIcon 등 React 밖용 시안 인증 씰 SVG */
export function verifiedSealSvgHtml(size = 12, title = "VLUÉ 유료 인증") {
  const s = Math.max(10, Math.min(24, Number(size) || 12));
  return `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="display:inline-block;vertical-align:-2px;flex-shrink:0;margin-left:3px" role="img" aria-label="${title}"><title>${title}</title><path d="${SEAL_PATH}" fill="#00d2ff"/><path d="${CHECK_PATH}" fill="#ffffff"/></svg>`;
}

/**
 * 닉네임/이름/@아이디 오른쪽 인증 배지 공통 렌더.
 */
export default function UserBadgeLabel({
  name = "",
  handle = "",
  user = null,
  verified = null,
  size = 14,
  className = "",
  nameClassName = "",
  gapClassName = "gap-0.5",
  title = "VLUÉ 유료 인증",
  as: Tag = "span",
  children = null
}) {
  const label =
    children != null
      ? null
      : String(name || "").trim() ||
        (handle ? `@${String(handle).replace(/^@/, "")}` : "");
  const show = verified == null ? userHasVerifiedBadge(user) : Boolean(verified);
  return (
    <Tag className={`inline-flex min-w-0 max-w-full items-center ${gapClassName}${className ? ` ${className}` : ""}`}>
      {children != null ? (
        children
      ) : (
        <span className={`min-w-0 truncate${nameClassName ? ` ${nameClassName}` : ""}`}>{label}</span>
      )}
      {show ? <VlueCyanVerifiedSeal size={size} className="shrink-0" title={title} /> : null}
    </Tag>
  );
}
