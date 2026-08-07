package kr.vlue.calloverlay.companion

/**
 * Overlay가 놓인 화면/통화 Context.
 * OverlayPositionManager 입력. 기준: docs/architecture/companion-overlay.md
 */
enum class OverlayContext {
    HOME_SCREEN,
    OTHER_APP,
    INCOMING_CALL_UI,
    IN_CALL,
    KEYPAD,
    MINIMIZED
}
