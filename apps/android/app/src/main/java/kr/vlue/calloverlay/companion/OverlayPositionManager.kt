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
        /*
         * 화면 꺼짐/AOD/잠금에서도 시스템 전화처럼 BigPush 표시.
         * (이전: HIDDEN → requestBigPush 거부 → 잠금 시 미표시)
         */
        if (screenState == ScreenState.SCREEN_OFF || screenState == ScreenState.AOD) {
            return OverlayPosition.TOP
        }
        return when (context) {
            OverlayContext.HOME_SCREEN,
            OverlayContext.OTHER_APP,
            OverlayContext.COMPACT_INCOMING -> OverlayPosition.BELOW_COMPACT_INCOMING
            OverlayContext.INCOMING_CALL_UI -> OverlayPosition.TOP
            OverlayContext.IN_CALL,
            OverlayContext.KEYPAD,
            OverlayContext.MINIMIZED -> OverlayPosition.HIDDEN
        }
    }

    /**
     * 링잉 빅푸시가 미니 수신 팝업 아래에 붙은 뒤에는 상단(TOP)으로 올리지 않는다.
     * 조회가 끝나 상호가 채워질 때 InCallUI resume 오판으로 HUN 을 가리는 것을 막는다.
     */
    fun holdBelowCompactIncoming(
        previous: OverlayPosition,
        previousContext: OverlayContext,
        nextContext: OverlayContext,
        ringing: Boolean,
        ourAppForeground: Boolean = false
    ): OverlayContext {
        if (!ringing) return nextContext
        if (nextContext != OverlayContext.INCOMING_CALL_UI) return nextContext
        if (previous == OverlayPosition.BELOW_COMPACT_INCOMING ||
            previousContext == OverlayContext.COMPACT_INCOMING ||
            ourAppForeground
        ) {
            return OverlayContext.COMPACT_INCOMING
        }
        return nextContext
    }
}
