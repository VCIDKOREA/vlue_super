package kr.vlue.calloverlay.companion

/**
 * Window 배치 결과.
 * BigPush: TOP | BOTTOM | HIDDEN
 * Showcase fullscreen은 TOP(전체)로 표기, Mini는 MINI_CASE.
 */
enum class OverlayPosition {
    TOP,
    BOTTOM,
    MINI_CASE,
    HIDDEN
}
