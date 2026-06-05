/** `vlue-shield-logo.svg` (128×128) 기준 — 앱·웹 공통 정사각 로고 규격 */

export const LOGO_REF_SIZE = 128;
/** rx=36.6 / 128 */
export const LOGO_CORNER_RADIUS_RATIO = 36.6 / 128;

export const LOGO_TILE_GRADIENT_CLASS =
  "bg-gradient-to-br from-[#2563eb] to-[#1d4ed8]";

export const NAV_LOGO_TILE_SIZE = 32;

export function logoCornerRadiusPx(size) {
  return Math.round(size * LOGO_CORNER_RADIUS_RATIO * 10) / 10;
}

/** Navbar 깜빡임용: 타일과 동일 크기(3번 참고 이미지와 동일 채움) */
export function navLogoEyeSize(tilePx) {
  return { eyeW: tilePx, eyeH: tilePx };
}
