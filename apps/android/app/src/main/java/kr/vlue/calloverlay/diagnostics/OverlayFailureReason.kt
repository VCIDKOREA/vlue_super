package kr.vlue.calloverlay.diagnostics

/**
 * Overlay 표시 실패 원인 (관찰 전용).
 * 모든 실패는 하나의 FailureReason으로 귀결된다.
 * Controller / OverlayState / Window를 바꾸지 않는다.
 */
enum class OverlayFailureReason {
    SUCCESS,
    PERMISSION_DENIED,
    BAD_TOKEN,
    WINDOW_REJECTED,
    SCREEN_OFF_POLICY,
    OEM_RESTRICTED,
    CALL_ENDED,
    UNKNOWN
}
