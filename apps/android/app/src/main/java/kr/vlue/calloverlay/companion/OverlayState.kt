package kr.vlue.calloverlay.companion

/**
 * Companion Overlay 단일 상태.
 * 동시에 둘 이상 존재하면 안 된다. 기준: docs/architecture/companion-overlay.md
 */
enum class OverlayState {
    IDLE,
    BIG_PUSH,
    SHOWCASE,
    MINI_CASE
}
