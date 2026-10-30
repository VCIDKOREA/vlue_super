/**
 * 전화부(통화목록) 행 포인터 제스처 분류 — 순수 함수(DOM 비의존, 테스트 대상).
 *
 * `CallHistorySwipeRow` 의 좌우 스와이프 / 탭 / 드래그 판정 단일 소스.
 * 탭(행 열기)은 컴포넌트에서 브라우저 네이티브 `click` 으로 실행하고, 이 모듈은
 * 스와이프/드래그를 식별해 그 뒤 따라오는 click 을 억제할지 결정한다.
 */

export const ROW_GESTURE = Object.freeze({
  /** 우로 스와이프 → 기본 전화앱 발신 */
  SWIPE_DIAL: "swipe-dial",
  /** 좌로 스와이프 → 카톡 · SMS 전달 */
  SWIPE_SHARE: "swipe-share",
  /** 스크롤/미달 이동 — 아무 동작 없음, click 억제 */
  DRAG: "drag",
  /** 제자리 탭 — 행 열기(openCall) */
  TAP: "tap"
});

/** 좌우 스와이프 액션 확정 임계 (px) */
export const ROW_SWIPE_THRESHOLD_PX = 72;
/** 이동(드래그/스크롤) 판정 임계 (px) */
export const ROW_DRAG_THRESHOLD_PX = 10;
/** 수평 우세 비율 — 세로보다 이만큼 더 커야 수평 스와이프 */
export const ROW_SWIPE_AXIS_RATIO = 1.15;

/**
 * @param {{ dx?: number, dy?: number, moved?: boolean }} delta
 * @returns {string} ROW_GESTURE 값
 */
export function decideCallHistoryRowGesture({ dx = 0, dy = 0, moved = false } = {}) {
  const ax = Math.abs(Number(dx) || 0);
  const ay = Math.abs(Number(dy) || 0);
  if (ax > ROW_SWIPE_THRESHOLD_PX && ax > ay * ROW_SWIPE_AXIS_RATIO) {
    return dx > 0 ? ROW_GESTURE.SWIPE_DIAL : ROW_GESTURE.SWIPE_SHARE;
  }
  if (moved || ax > ROW_DRAG_THRESHOLD_PX || ay > ROW_DRAG_THRESHOLD_PX) {
    return ROW_GESTURE.DRAG;
  }
  return ROW_GESTURE.TAP;
}

/** 이 제스처 직후의 click 으로 행을 열면 안 되는가 (스와이프·드래그) */
export function rowGestureSuppressesClick(gesture) {
  return (
    gesture === ROW_GESTURE.SWIPE_DIAL ||
    gesture === ROW_GESTURE.SWIPE_SHARE ||
    gesture === ROW_GESTURE.DRAG
  );
}
