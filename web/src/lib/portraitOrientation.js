/**
 * Orientation helpers.
 * 앱은 「세로로 돌려 주세요」 전면 차단을 쓰지 않음.
 * - Big Push: 기기 가로/세로 그대로
 * - Showcase: CSS 폰 프레임으로 세로 비율 유지 (가로로 안 늘어남)
 */
export function isPhoneLandscapeBlocked() {
  return false;
}

export function tryLockPortraitOrientation() {
  /* no-op — 가로 빅푸시·폴드 와이드를 막지 않음 */
}
