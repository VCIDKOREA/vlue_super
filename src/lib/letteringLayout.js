/**
 * Lettering 빅푸시 — 플랫폼별 레이아웃
 *
 * Android: Ongoing 커스텀 알림 + 통화 화면 오버레이 (apps/android-call-overlay)
 * iOS: Live Activity(ActivityKit) + Call Directory(차단) — 통화 UI 상단 밴드가 더 좁음
 */

export const LETTERING_PLATFORMS = ["android", "ios"];

/** iOS 기준 빅푸시 가로 폭 */
export const LETTERING_PUSH_WIDTH = "calc(74.5% + 15px)";

/** Android — iOS 대비 가로 +6px */
export const LETTERING_PUSH_WIDTH_ANDROID = "calc(74.5% + 21px)";

/** @param {"android"|"ios"} platform */
export function getLetteringLayout(platform = "android") {
  if (platform === "ios") {
    return {
      platform: "ios",
      /** iOS — 상태바 바로 아래(빨간 선). 114 번호 영역과 겹치지 않게 ~7.5% */
      overlayPaddingTop: "calc(max(env(safe-area-inset-top, 0px), 7.5%) + 2px)",
      pushWidth: LETTERING_PUSH_WIDTH,
      dragInitialY: 0,
      dragMaxY: 320,
      liveBarPadding: "5px 10px",
      summaryPadding: "8px 12px",
      statusFontSize: "9px",
      brandFontSize: "9px",
      cardRadius: "14px"
    };
  }

  return {
    platform: "android",
    overlayPaddingTop: "6px",
    pushWidth: LETTERING_PUSH_WIDTH_ANDROID,
    dragInitialY: 0,
    dragMaxY: 420,
    liveBarPadding: "7px 12px",
    summaryPadding: "10px 12px",
    statusFontSize: "10px",
    brandFontSize: "10px",
    cardRadius: "16px"
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
