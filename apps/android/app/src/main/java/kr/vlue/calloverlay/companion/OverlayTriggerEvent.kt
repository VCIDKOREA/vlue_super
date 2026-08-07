package kr.vlue.calloverlay.companion

/**
 * Overlay 전이를 일으킨 시스템/사용자 이벤트 (Diagnostics 관찰용).
 * Controller 상태를 바꾸지 않는다 — 기록 메타데이터만.
 */
enum class OverlayTriggerEvent {
    INCOMING,
    ANSWER,
    REJECT,
    CALL_END,
    SCREEN_CHANGED,
    HOME_CHANGED,
    KEYPAD_OPEN,
    KEYPAD_CLOSE,
    MINI_DRAG,
    MINI_EDGE_HIDE,
    MINI_RESTORE,
    USER_RESTORE,
    /** 내부 레이아웃 재확인 등 — 전이 없을 때 스냅샷만 */
    INTERNAL
}
