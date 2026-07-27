/** 쇼케이스 전체화면·미리보기 오버레이를 즉시 닫을 때 */
export const CLOSE_SHOWCASE_OVERLAYS_EVENT = "vlue-close-showcase-overlays";

/** 설정 등 BGM 소유 해제 후 케이스함/캐러셀이 재생을 이어가도록 */
export const SHOWCASE_BGM_OWNER_RELEASED_EVENT = "vlue-showcase-bgm-owner-released";

export function dispatchCloseShowcaseOverlays() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(CLOSE_SHOWCASE_OVERLAYS_EVENT));
}

export function dispatchShowcaseBgmOwnerReleased() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(SHOWCASE_BGM_OWNER_RELEASED_EVENT));
}
