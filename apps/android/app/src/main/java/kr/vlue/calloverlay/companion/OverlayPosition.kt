package kr.vlue.calloverlay.companion

/**
 * Single Companion Window 내부 배치 결과.
 * BigPush: TOP | BOTTOM | HIDDEN
 * Showcase: FULLSCREEN (TOP/BOTTOM 아님)
 * Mini: MINI_CASE
 * 기준: docs/architecture/companion-overlay.md
 */
enum class OverlayPosition {
    TOP,
    BOTTOM,
    FULLSCREEN,
    MINI_CASE,
    HIDDEN
}
