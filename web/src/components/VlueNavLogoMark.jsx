import { useCallback, useState, useId } from "react";
import { NAV_LOGO_TILE_SIZE, logoCornerRadiusPx } from "../lib/vlueSquareLogoSpec.js";

export { NAV_LOGO_TILE_SIZE } from "../lib/vlueSquareLogoSpec.js";

/**
 * Navbar / 앱 홈 로고 — `vlue-shield-logo.svg`(128) 전체 타일 + 눈 깜빡임.
 * (눈만 따로 그리면 방패처럼 깨져 보이므로 반드시 rect+그라데이션 포함)
 */
export function VlueNavLogoMark({
  blinkSeq: blinkSeqProp,
  size = NAV_LOGO_TILE_SIZE,
  className = "",
}) {
  const seq = blinkSeqProp ?? 0;
  const scale = size / NAV_LOGO_TILE_SIZE;
  const tile = Math.round(NAV_LOGO_TILE_SIZE * scale);
  const radius = logoCornerRadiusPx(tile);
  const gradId = useId().replace(/:/g, "");
  const blinkClass = seq > 0 ? "vlue-header-eye-wrap--nav-loading" : "";

  return (
    <svg
      key={seq}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 128 128"
      width={tile}
      height={tile}
      className={["shrink-0 shadow-sm", className].filter(Boolean).join(" ")}
      style={{ borderRadius: radius }}
      aria-hidden
    >
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#2563eb" />
          <stop offset="100%" stopColor="#1d4ed8" />
        </linearGradient>
      </defs>
      <rect width="128" height="128" rx="36.6" fill={`url(#${gradId})`} />
      <g
        transform="translate(0 -5.2)"
        className={[
          "vlue-header-eye-wrap",
          "vlue-header-eye-wrap--shield-square",
          blinkClass,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <g className="vlue-header-eye-globe">
          <circle className="vlue-header-eye-pupil" cx="64" cy="76.9333" r="21.3333" fill="#ffffff" />
        </g>
        <g className="vlue-header-eye-lid">
          <path
            className="vlue-header-eye-lid-open"
            d="M 22.4 70.267 Q 64 29.733 105.6 70.267"
            stroke="#ffffff"
            strokeWidth="7.7333"
            strokeLinecap="butt"
            strokeLinejoin="round"
            fill="none"
          />
          <path
            className="vlue-header-eye-lid-closed"
            d="M 24 75.2 L 104 75.2"
            stroke="#ffffff"
            strokeWidth="7.7333"
            strokeLinecap="round"
            fill="none"
          />
        </g>
        {/* 감을 때 동공·U자가 남지 않도록 타일색으로 위에서 덮음 */}
        <g className="vlue-header-eye-lid-cover">
          <rect x="14" y="24" width="100" height="62" fill={`url(#${gradId})`} />
        </g>
      </g>
    </svg>
  );
}

export function useVlueLogoBlink() {
  const [blinkSeq, setBlinkSeq] = useState(0);
  const triggerBlink = useCallback(() => {
    setBlinkSeq((n) => n + 1);
  }, []);
  return { blinkSeq, triggerBlink };
}
