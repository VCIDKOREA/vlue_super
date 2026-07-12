/**
 * Lettering 빅푸시 — 웹 마케팅·홈 미리보기와 동일 레이아웃 (OS 구분 없음)
 */

export const LETTERING_PLATFORMS = ["android", "ios"];

/** 웹 기준 — 통화 화면 빅푸시 좌우 여백 없음 */
export const LETTERING_PUSH_WIDTH = "100%";

/** @deprecated 웹 통일 — Android도 동일 풀폭 */
export const LETTERING_PUSH_WIDTH_ANDROID = "100%";

/** 웹 쇼케이스 바 기준 토큰 (Galaxy / iPhone 동일) */
const WEB_LAYOUT = {
  overlayPaddingTop: "calc(max(env(safe-area-inset-top, 0px), 4.5%) + 2px)",
  pushWidth: LETTERING_PUSH_WIDTH,
  dragInitialY: 0,
  dragMaxY: 280,
  liveBarPadding: "7px 12px",
  summaryPadding: "10px 12px",
  statusFontSize: "10px",
  brandFontSize: "10px",
  cardRadius: "16px"
};

/** @param {"android"|"ios"} platform */
export function getLetteringLayout(platform = "android") {
  return {
    platform: platform === "ios" ? "ios" : "android",
    ...WEB_LAYOUT
  };
}

/** CSS custom properties for .lettering-call-screen--photo */
export function letteringLayoutStyle(platform = "android") {
  const L = getLetteringLayout(platform);
  return {
    "--lettering-overlay-top": L.overlayPaddingTop,
    "--lettering-push-width": L.pushWidth,
    "--lettering-live-bar-padding": L.liveBarPadding,
    "--lettering-summary-padding": L.summaryPadding,
    "--lettering-status-font-size": L.statusFontSize,
    "--lettering-brand-font-size": L.brandFontSize,
    "--lettering-card-radius": L.cardRadius
  };
}
