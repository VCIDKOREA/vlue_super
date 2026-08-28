/** Instagram-style scalloped seal — VLUE 시안 채움 인증마크 */

const CYAN = "#00d2ff";

/** 12톱니 스캘럽 — 직선(L) 대신 Q 곡선으로 데스크톱·모바일 동일 렌더 */
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
const CHECK_PATH = "M7.4 12.3 10.4 15.3 17.1 8.2 18.5 9.6 10.4 17.7 6.1 13.4Z";

export default function VlueCyanVerifiedSeal({
  size = 18,
  className = "",
  title = "VLUE 인증됨"
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid meet"
      overflow="visible"
      className={`vlue-cyan-verified-seal${className ? ` ${className}` : ""}`}
      role="img"
      aria-label={title}
    >
      <title>{title}</title>
      <path d={SEAL_PATH} fill={CYAN} />
      <path d={CHECK_PATH} fill="#ffffff" />
    </svg>
  );
}
