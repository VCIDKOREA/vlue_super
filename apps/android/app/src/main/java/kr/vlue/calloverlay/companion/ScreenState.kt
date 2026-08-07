package kr.vlue.calloverlay.companion

/**
 * 화면 전원/표시 상태. BigPush BOTTOM 정책 입력.
 * SCREEN_OFF / AOD에서는 Bottom Overlay 정책을 적용하지 않는다.
 * 기준: docs/architecture/companion-overlay.md §6
 */
enum class ScreenState {
    SCREEN_ON,
    SCREEN_OFF,
    AOD
}
