/** Instagram-style scalloped seal — VLUE 시안 채움 인증마크 */

const CYAN = "#00d2ff";

/** 12톱니 스캘럽 원 — 경로 문자열 깨짐 방지용 프로그램 생성 */
function buildScallopedSealPath(cx, cy, outerR, innerR, teeth = 12) {
  const steps = teeth * 2;
  const parts = [];
  for (let i = 0; i <= steps; i++) {
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / steps;
    const r = i % 2 === 0 ? outerR : innerR;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    parts.push(i === 0 ? `M${x.toFixed(2)},${y.toFixed(2)}` : `L${x.toFixed(2)},${y.toFixed(2)}`);
  }
  return `${parts.join(" ")} Z`;
}

const SEAL_PATH = buildScallopedSealPath(12, 12, 10.6, 9.05, 12);
/** 흰 체크 — 소형에서도 선명하게 (fill) */
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
      shapeRendering="geometricPrecision"
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
