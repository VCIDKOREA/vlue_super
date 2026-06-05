import VLUE_BRAND_LOGO from "../assets/vlue-shield-logo.svg?url";
import { logoCornerRadiusPx } from "../lib/vlueSquareLogoSpec.js";

/**
 * VLUE 공식 정사각 브랜드 마크 (`vlue-shield-logo.svg` — 3번 참고 이미지와 동일).
 */
export function VlueBrandLogo({ size = 32, className = "", alt = "VLUE" }) {
  return (
    <img
      src={VLUE_BRAND_LOGO}
      alt={alt}
      width={size}
      height={size}
      draggable={false}
      className={["shrink-0 object-cover shadow-sm", className].filter(Boolean).join(" ")}
      style={{ width: size, height: size, borderRadius: logoCornerRadiusPx(size) }}
    />
  );
}

/** 인증 뱃지·히어로 칩 등 — 동일 SVG, 크기만 축소 */
export function VlueBrandMark({ size = 14, className = "" }) {
  return (
    <img
      src={VLUE_BRAND_LOGO}
      alt=""
      aria-hidden
      width={size}
      height={size}
      draggable={false}
      className={["inline-block shrink-0 object-cover", className].filter(Boolean).join(" ")}
      style={{ width: size, height: size, borderRadius: logoCornerRadiusPx(size) }}
    />
  );
}

export default VlueBrandLogo;
