/**
 * VLUE 눈 마크 SVG
 * - `shield`: `vlue-shield-logo.svg`와 동일 도형 (Navbar·앱 홈, 3번 참고 이미지)
 * - `header`: 얇은 눈 (로그인 비밀번호 토글 등)
 */
export function VlueEyeMark({
  variant = "shield",
  svgWidth = 32,
  svgHeight = 32,
  wrapClassName = "",
  tone = "light",
}) {
  const toneClass = tone === "muted" ? "vlue-header-eye-wrap--muted" : "";
  const shieldClass = variant === "shield" ? "vlue-header-eye-wrap--shield-square" : "";

  if (variant === "header") {
    return (
      <span className={[wrapClassName, toneClass, shieldClass].filter(Boolean).join(" ")}>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width={svgWidth}
          height={svgHeight}
          viewBox="0 0.625 24 24"
          fill="none"
          preserveAspectRatio="xMidYMid meet"
          className="vlue-header-eye-svg"
          aria-hidden
        >
          <g className="vlue-header-eye-globe">
            <circle className="vlue-header-eye-pupil" cx="12" cy="15.05" r="4" fill="white" />
          </g>
          <g className="vlue-header-eye-lid">
            <path
              d="M3.75 13.88 Q12 6.05 20.25 13.88"
              stroke="white"
              strokeWidth="1.45"
              strokeLinecap="butt"
              strokeLinejoin="round"
              fill="none"
            />
          </g>
          <g className="vlue-header-eye-lashes" stroke="white" fill="none" strokeLinecap="round">
            <line strokeWidth="0.36" x1="6.85" y1="13.86" x2="6.02" y2="15.58" />
            <line strokeWidth="0.36" x1="8.52" y1="13.93" x2="7.9" y2="15.64" />
            <line strokeWidth="0.36" x1="10.22" y1="13.98" x2="9.92" y2="15.68" />
            <line strokeWidth="0.37" x1="12" y1="14" x2="12" y2="15.74" />
            <line strokeWidth="0.36" x1="13.78" y1="13.98" x2="14.08" y2="15.68" />
            <line strokeWidth="0.36" x1="15.48" y1="13.93" x2="16.1" y2="15.64" />
            <line strokeWidth="0.36" x1="17.15" y1="13.86" x2="17.98" y2="15.58" />
          </g>
        </svg>
      </span>
    );
  }

  return (
    <span className={[wrapClassName, toneClass, shieldClass].filter(Boolean).join(" ")}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={svgWidth}
        height={svgHeight}
        viewBox="0 0 128 128"
        fill="none"
        preserveAspectRatio="xMidYMid meet"
        className="vlue-header-eye-svg vlue-header-eye-svg--shield"
        aria-hidden
      >
        <g transform="translate(0 -5.2)">
          <g className="vlue-header-eye-globe">
            <circle className="vlue-header-eye-pupil" cx="64" cy="76.9333" r="21.3333" fill="white" />
          </g>
          <g className="vlue-header-eye-lid">
            <path
              d="M 22.4 70.267 Q 64 29.733 105.6 70.267"
              stroke="white"
              strokeWidth="7.7333"
              strokeLinecap="butt"
              strokeLinejoin="round"
              fill="none"
            />
          </g>
        </g>
      </svg>
    </span>
  );
}
