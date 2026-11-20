/** HIDDEN CAM CHECK — 카메라 미리보기를 켠 동안에만 쓰는 설정. */

export const OPEN_SPACE_EVENT = "vlue-open-space";

export const PALETTES = ["THERMAL_IRON", "NVG_PHOSPHOR", "HIGH_CONTRAST_EDGE"];

export const PALETTE_LABEL = {
  THERMAL_IRON: "열화상 의사컬러",
  NVG_PHOSPHOR: "야간투시 인광 고대비",
  HIGH_CONTRAST_EDGE: "고대비 반사·윤곽 강조"
};

export const SUPPRESS_LEVELS = ["low", "medium", "high"];
export const SUPPRESS_LABEL = {
  low: "낮음",
  medium: "보통",
  high: "높음"
};

export const STABILITY_LEVELS = ["instant", "sustained", "zoom_verified"];
export const STABILITY_LABEL = {
  instant: "즉시 반응",
  sustained: "연속 유지",
  zoom_verified: "줌인 재확인"
};

export const GUIDANCE_LABEL = {
  SILENT: "무음",
  STANDARD: "음성 안내"
};

export const SUPPRESS_AREA = { low: 0.28, medium: 0.16, high: 0.08 };

export const DEFAULT_SPACE_CONFIG = {
  mode: "general",
  palette: "THERMAL_IRON",
  optical: true,
  suppress: "high",
  stability: "sustained",
  guidance: "STANDARD",
  agreeJudgment: false,
  agreePortrait: false,
  agreeShutter: false
};

export function configReady(config) {
  return Boolean(config?.agreeJudgment && config?.agreePortrait && config?.agreeShutter);
}
