package kr.vlue.calloverlay.companion

/**
 * 화면 전원/표시 상태. BigPush 위치 정책 입력.
 * SCREEN_OFF / AOD 에서도 BigPush 는 TOP 으로 표시 (잠금화면 패리티).
 */
enum class ScreenState {
    SCREEN_ON,
    SCREEN_OFF,
    AOD
}
