/**
 * Lettering 빅푸시 — 플랫폼별 레이아웃
 *
 * Android: Ongoing 커스텀 알림 + 통화 화면 오버레이 (apps/android-call-overlay)
 * iOS: Live Activity(ActivityKit) + Call Directory(차단) — 통화 UI 상단 밴드가 더 좁음
 */

export const LETTERING_PLATFORMS = ["android", "ios"];

/** iOS/Android 공통 — 통화 화면 빅푸시 좌우 여백 없음 */
export const LETTERING_PUSH_WIDTH = "100%";

/** Android — iOS와 동일 풀폭 */
export const LETTERING_PUSH_WIDTH_ANDROID = "100%";

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
    /** 상태바 아래 — 통화 번호와 겹치지 않게 상단 고정 */
    overlayPaddingTop: "calc(max(env(safe-area-inset-top, 0px), 4.5%) + 2px)",
    pushWidth: LETTERING_PUSH_WIDTH_ANDROID,
    dragInitialY: 0,
    dragMaxY: 280,
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
