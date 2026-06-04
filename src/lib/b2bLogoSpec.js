/** 레터링 명함 UI 기준 — 기업 로고 업로드 가이드 */
export const B2B_LOGO_SPEC = {
  /** 명함에 실제로 그려지는 영역 (CSS px) */
  displayWidthPx: 44,
  displayHeightPx: 44,
  /** 권장 업로드 해상도 (정사각형, 1:1) */
  recommendWidthPx: 125,
  recommendHeightPx: 125,
  /** 고해상도(레티나) 권장 */
  recommendRetinaWidthPx: 250,
  recommendRetinaHeightPx: 250,
  maxFileSizeMb: 1.5,
  formatsLabel: "PNG(투명 배경 권장) · JPG · WebP"
};

export function b2bLogoSizeGuideText() {
  const s = B2B_LOGO_SPEC;
  return `권장 ${s.recommendWidthPx} × ${s.recommendHeightPx}px (정사각형) · 명함 표시 ${s.displayWidthPx}×${s.displayHeightPx}px`;
}
