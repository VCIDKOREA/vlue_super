/**
 * VLUE 브랜드 **눈** 마크 (단일 규격 SVG) — 앱 상단 **홈(로고 탭)** 에만 사용합니다.
 * 동공만 globe에 inset으로 가림. 완전히 덮일 때 속눈썹은 뚜껑 위 레이어에서 페이드인.
 *
 * 공식 알림·채팅 목록의 VLUE 타일은 눈이 아니라 실드 로고 `VlueOfficialChannelAvatar.jsx` 를 씁니다.
 * 스플래시 등 영상 눈은 별 매체이며 이 컴포넌트와 혼용하지 않습니다.
 */
export function VlueEyeMark({
  svgWidth = 32,
  svgHeight = 30,
  wrapClassName = "",
  /** light = 흰색(헤더), muted = 회색(로그인 비밀번호 토글 등) */
  tone = "light",
}) {
  const toneClass = tone === "muted" ? "vlue-header-eye-wrap--muted" : "";
  return (
    <span className={[wrapClassName, toneClass].filter(Boolean).join(" ")}>
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
