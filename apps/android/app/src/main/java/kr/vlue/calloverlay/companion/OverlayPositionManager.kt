package kr.vlue.calloverlay.companion

/**
 * Context × State → Position (순수 함수).
 * docs/architecture/companion-overlay.md §6
 */
object OverlayPositionManager {
    fun resolve(context: OverlayContext, state: OverlayState): OverlayPosition {
        return when (state) {
            OverlayState.IDLE -> OverlayPosition.HIDDEN
            OverlayState.BIG_PUSH -> when (context) {
                OverlayContext.HOME_SCREEN,
                OverlayContext.OTHER_APP -> OverlayPosition.BOTTOM
                OverlayContext.INCOMING_CALL_UI -> OverlayPosition.TOP
                OverlayContext.IN_CALL,
                OverlayContext.KEYPAD,
                OverlayContext.MINIMIZED -> OverlayPosition.HIDDEN
            }
            OverlayState.SHOWCASE -> when (context) {
                OverlayContext.IN_CALL -> OverlayPosition.TOP
                OverlayContext.KEYPAD,
                OverlayContext.MINIMIZED,
                OverlayContext.HOME_SCREEN,
                OverlayContext.OTHER_APP,
                OverlayContext.INCOMING_CALL_UI -> OverlayPosition.MINI_CASE
            }
            OverlayState.MINI_CASE -> OverlayPosition.MINI_CASE
        }
    }
}
