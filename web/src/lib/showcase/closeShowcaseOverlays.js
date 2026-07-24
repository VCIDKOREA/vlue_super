/** 쇼케이스 전체화면·미리보기 오버레이를 즉시 닫을 때 */
export const CLOSE_SHOWCASE_OVERLAYS_EVENT = "vlue-close-showcase-overlays";

export function dispatchCloseShowcaseOverlays() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(CLOSE_SHOWCASE_OVERLAYS_EVENT));
}
