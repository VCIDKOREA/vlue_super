package kr.vlue.calloverlay.companion

import org.json.JSONObject

data class CompanionOverlaySnapshot(
    val state: OverlayState,
    val context: OverlayContext,
    val position: OverlayPosition,
    val screenState: ScreenState,
    val miniCaseVisibility: MiniCaseVisibility,
    val lastTransition: String?,
    val rejectedTransition: String?
) {
    fun toJson(): JSONObject = JSONObject().apply {
        put("overlayState", state.name)
        put("overlayContext", context.name)
        put("overlayPosition", position.name)
        put("screenState", screenState.name)
        put("miniCaseVisibility", miniCaseVisibility.name)
        if (!lastTransition.isNullOrBlank()) put("lastTransition", lastTransition)
        if (!rejectedTransition.isNullOrBlank()) put("rejectedTransition", rejectedTransition)
    }
}

/**
 * Companion Overlay 허용 전이만 수행 (Event Driven).
 *
 * Answer Event는 BigPush attach / animation / timeout과 독립이다.
 * Window 적용(단일 TYPE_APPLICATION_OVERLAY + updateViewLayout)은 CallOverlayService 책임.
 */
class CompanionOverlayController {
    @Volatile
    var state: OverlayState = OverlayState.IDLE
        private set
    @Volatile
    var context: OverlayContext = OverlayContext.HOME_SCREEN
        private set
    @Volatile
    var screenState: ScreenState = ScreenState.SCREEN_ON
        private set
    @Volatile
    var position: OverlayPosition = OverlayPosition.HIDDEN
        private set
    @Volatile
    var miniCaseVisibility: MiniCaseVisibility = MiniCaseVisibility.VISIBLE
        private set
    @Volatile
    var lastTransition: String? = null
        private set
    @Volatile
    var rejectedTransition: String? = null
        private set

    /** Incoming 감지 — 아직 BigPush 전 */
    fun onIncoming(detectedContext: OverlayContext = OverlayContext.HOME_SCREEN) {
        context = detectedContext
        if (state == OverlayState.IDLE || state == OverlayState.BIG_PUSH) {
            refreshPosition()
            lastTransition = "onIncoming context=${context.name}"
            rejectedTransition = null
        }
    }

    /**
     * BigPush 표시 요청 (optional).
     * @return true면 BigPush 레이아웃 적용 허용, false면 스킵(이미 Answer / SCREEN_OFF 등)
     */
    fun requestBigPush(detectedContext: OverlayContext, callAlreadyAnswered: Boolean): Boolean {
        context = detectedContext
        /*
         * 이전 통화가 MINI/SHOWCASE 에 남아 있으면 수신 BigPush 가 스킵된다.
         * 새 RINGING(미응답)이면 IDLE 로 리셋 후 BigPush 허용.
         */
        if (!callAlreadyAnswered &&
            (state == OverlayState.SHOWCASE || state == OverlayState.MINI_CASE)
        ) {
            val prev = state
            state = OverlayState.IDLE
            context = detectedContext
            miniCaseVisibility = MiniCaseVisibility.VISIBLE
            lastTransition = "requestBigPush: stale ${prev.name}→IDLE for new ringing"
            rejectedTransition = null
        }
        if (callAlreadyAnswered || state == OverlayState.SHOWCASE || state == OverlayState.MINI_CASE) {
            rejectedTransition = "requestBigPush rejected: answeredOrShowcase state=$state"
            if (callAlreadyAnswered && state == OverlayState.IDLE) {
                lastTransition = "answerBeforeBigPush"
            }
            refreshPosition()
            return false
        }
        if (state != OverlayState.IDLE && state != OverlayState.BIG_PUSH) {
            rejectedTransition = "requestBigPush rejected: illegal from $state"
            return false
        }
        state = OverlayState.BIG_PUSH
        refreshPosition()
        if (position == OverlayPosition.HIDDEN) {
            rejectedTransition =
                "requestBigPush: position HIDDEN context=$context screen=${screenState.name}"
            state = OverlayState.IDLE
            return false
        }
        lastTransition = "requestBigPush → BIG_PUSH pos=${position.name}"
        rejectedTransition = null
        return true
    }

    /**
     * Call Answer Event → 즉시 SHOWCASE (FULLSCREEN).
     * BigPush lifecycle(attach / animation / timeout)을 기다리지 않는다.
     */
    fun onAnswer(detectedContext: OverlayContext = OverlayContext.IN_CALL) {
        val from = state
        context = detectedContext
        state = OverlayState.SHOWCASE
        miniCaseVisibility = MiniCaseVisibility.VISIBLE
        lastTransition =
            "onAnswer → SHOWCASE from=$from (event-driven, independent of BigPush)"
        rejectedTransition = null
        refreshPosition()
    }

    fun onMinimize(detectedContext: OverlayContext = OverlayContext.MINIMIZED) {
        if (state != OverlayState.SHOWCASE && state != OverlayState.MINI_CASE) {
            rejectedTransition = "onMinimize rejected: from $state"
            return
        }
        context = detectedContext
        state = OverlayState.MINI_CASE
        miniCaseVisibility = MiniCaseVisibility.VISIBLE
        lastTransition = "onMinimize → MINI_CASE"
        rejectedTransition = null
        refreshPosition()
    }

    fun onRestoreShowcase(detectedContext: OverlayContext = OverlayContext.IN_CALL) {
        if (state != OverlayState.MINI_CASE && state != OverlayState.SHOWCASE) {
            rejectedTransition = "onRestoreShowcase rejected: from $state"
            return
        }
        context = detectedContext
        state = OverlayState.SHOWCASE
        miniCaseVisibility = MiniCaseVisibility.VISIBLE
        lastTransition = "onRestoreShowcase → SHOWCASE"
        rejectedTransition = null
        refreshPosition()
    }

    /** Drag End — edge peek. EDGE_HIDDEN은 종료가 아님. */
    fun onMiniEdgeHidden() {
        onMiniVisibilityChanged(MiniCaseVisibility.EDGE_HIDDEN)
    }

    /** Edge peek Tap → VISIBLE (여전히 MINI_CASE). Showcase 복원은 별도 restore 요청. */
    fun onMiniEdgeReveal() {
        onMiniVisibilityChanged(MiniCaseVisibility.VISIBLE)
    }

    /**
     * MINI_CASE Visibility만 변경. OverlayState / Position은 유지.
     * 좌표(updateMiniOverlayFrame)와 분리된 Event.
     */
    fun onMiniVisibilityChanged(visibility: MiniCaseVisibility) {
        if (state != OverlayState.MINI_CASE) {
            rejectedTransition =
                "onMiniVisibilityChanged rejected: state=$state want=${visibility.name}"
            return
        }
        val from = miniCaseVisibility
        miniCaseVisibility = visibility
        lastTransition = "onMiniVisibilityChanged $from→${visibility.name} (state=MINI_CASE)"
        rejectedTransition = null
    }

    fun onKeypad(open: Boolean) {
        if (!open) {
            if (state == OverlayState.MINI_CASE) {
                context = OverlayContext.IN_CALL
                refreshPosition()
            }
            return
        }
        if (state == OverlayState.SHOWCASE || state == OverlayState.MINI_CASE) {
            context = OverlayContext.KEYPAD
            state = OverlayState.MINI_CASE
            miniCaseVisibility = MiniCaseVisibility.VISIBLE
            lastTransition = "onKeypad → MINI_CASE"
            rejectedTransition = null
            refreshPosition()
        } else {
            rejectedTransition = "onKeypad ignored: state=$state"
        }
    }

    fun onCallEnd() {
        state = OverlayState.IDLE
        context = OverlayContext.HOME_SCREEN
        position = OverlayPosition.HIDDEN
        miniCaseVisibility = MiniCaseVisibility.VISIBLE
        lastTransition = "onCallEnd → IDLE"
        rejectedTransition = null
    }

    /**
     * Screen On/Off/AOD — Position Context만 갱신.
     * OverlayState를 바꾸지 않는다 (IDLE/제거/통화종료 금지).
     * @return previous ScreenState
     */
    fun onScreenStateChanged(next: ScreenState): ScreenState {
        val previous = screenState
        if (previous == next) {
            refreshPosition()
            return previous
        }
        screenState = next
        refreshPosition()
        lastTransition =
            "onScreenStateChanged $previous→$next state=${state.name} pos=${position.name}"
        rejectedTransition = null
        return previous
    }

    fun updateContext(detectedContext: OverlayContext) {
        context = detectedContext
        /*
         * SHOWCASE→MINI 는 Service 가 onMinimize / onKeypad / minimizeForOtherApp 으로만.
         * 여기서 HOME/OTHER 를 받으면 Position 만 MINI 로 줄어 풀 쇼케이스가 110dp 에 잘린다.
         */
        if (state == OverlayState.BIG_PUSH && detectedContext == OverlayContext.IN_CALL) {
            state = OverlayState.SHOWCASE
            miniCaseVisibility = MiniCaseVisibility.VISIBLE
            lastTransition = "context IN_CALL while BIG_PUSH → SHOWCASE (no BigPush wait)"
        }
        refreshPosition()
    }

    /** 통화 중 다른 앱으로 나간 것이 확실할 때만 MINI (유예 후 Service에서 호출) */
    fun minimizeForOtherApp() {
        if (state != OverlayState.SHOWCASE) return
        context = OverlayContext.OTHER_APP
        state = OverlayState.MINI_CASE
        miniCaseVisibility = MiniCaseVisibility.VISIBLE
        lastTransition = "minimizeForOtherApp → MINI_CASE"
        refreshPosition()
    }

    fun snapshot(): CompanionOverlaySnapshot =
        CompanionOverlaySnapshot(
            state = state,
            context = context,
            position = position,
            screenState = screenState,
            miniCaseVisibility = miniCaseVisibility,
            lastTransition = lastTransition,
            rejectedTransition = rejectedTransition
        )

    private fun refreshPosition() {
        position = OverlayPositionManager.resolve(context, state, screenState)
    }
}
