package kr.vlue.calloverlay.companion

/**
 * Context × State × ScreenState → Position (순수 함수).
 * docs/architecture/companion-overlay.md §10
 *
 * Single Companion Window: Position은 updateViewLayout 입력일 뿐,
 * Window를 추가로 만들지 않는다.
 */
object OverlayPositionManager {
    fun resolve(
        context: OverlayContext,
        state: OverlayState,
        screenState: ScreenState = ScreenState.SCREEN_ON
    ): OverlayPosition {
        return when (state) {
            OverlayState.IDLE -> OverlayPosition.HIDDEN
            OverlayState.BIG_PUSH -> resolveBigPush(context, screenState)
            OverlayState.SHOWCASE -> OverlayPosition.FULLSCREEN
            OverlayState.MINI_CASE -> OverlayPosition.MINI_CASE
        }
    }

    private fun resolveBigPush(
        context: OverlayContext,
        screenState: ScreenState
    ): OverlayPosition {
        if (screenState == ScreenState.SCREEN_OFF || screenState == ScreenState.AOD) {
            return OverlayPosition.HIDDEN
        }
        return when (context) {
            OverlayContext.HOME_SCREEN,
            OverlayContext.OTHER_APP -> OverlayPosition.BOTTOM
            OverlayContext.INCOMING_CALL_UI -> OverlayPosition.TOP
            OverlayContext.IN_CALL,
            OverlayContext.KEYPAD,
            OverlayContext.MINIMIZED -> OverlayPosition.HIDDEN
        }
    }
}
