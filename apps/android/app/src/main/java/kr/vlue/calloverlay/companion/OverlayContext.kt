package kr.vlue.calloverlay.companion

/**
 * Overlay가 놓인 화면/통화 Context.
 * OverlayPositionManager 입력. 기준: docs/architecture/companion-overlay.md
 */
enum class OverlayContext {
    HOME_SCREEN,
    OTHER_APP,
    INCOMING_CALL_UI,
    /** 삼성 전화 앱 최근기록 위 미니 수신 팝업 — 빅푸시는 팝업 바로 아래 */
    COMPACT_INCOMING,
    IN_CALL,
    KEYPAD,
    MINIMIZED
}
