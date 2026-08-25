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

    /**
     * 링잉 BigPush 가 한 번 BELOW(미니 수신 UI 아래)로 붙으면,
     * 재평가로 TOP(겹침)으로 올리지 않는다. 통화 종료 시 해제.
     */
    @Volatile
    private var ringingBelowMiniPinned = false

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
            /*
             * 연속 수신·통화 중 재수신: 직전 MINI/SHOWCASE 잔존 시 TOP 으로 올리면
             * 삼성 미니 수신 UI 와 BigPush 가 겹친다 — BELOW 로 시작 후 풀 InCallUI 확정 시만 TOP.
             */
            context = OverlayContext.COMPACT_INCOMING
            ringingBelowMiniPinned = true
            miniCaseVisibility = MiniCaseVisibility.VISIBLE
            lastTransition = "requestBigPush: stale ${prev.name}→IDLE below-first for new ringing"
            rejectedTransition = null
        } else if (!callAlreadyAnswered && state == OverlayState.BIG_PUSH) {
            /*
             * 창 재사용 연속 수신: 직전 TOP/미니 좌표가 남아 삼성 미니 UI 와 겹침 —
             * BELOW 핀으로 재시작(풀 InCallUI 확정 시 refreshPosition 이 핀 해제).
             */
            ringingBelowMiniPinned = true
            if (context == OverlayContext.INCOMING_CALL_UI) {
                context = OverlayContext.COMPACT_INCOMING
            }
            miniCaseVisibility = MiniCaseVisibility.VISIBLE
            lastTransition = "requestBigPush: re-ring pin BELOW (reuse)"
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
        ringingBelowMiniPinned = false
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
         * BIG_PUSH→SHOWCASE 는 Service.enterShowcaseFromAnswer / onAnswer 단일 경로.
         * 여기서 IN_CALL 로 올리면 통화 중 하단 쇼케이스 바가 다시 풀스크린으로 깨진다.
         */
        refreshPosition()
    }

    /**
     * 다른 앱·홈·삼성 미니푸시 — 풀 쇼케이스 대신 하단 쇼케이스 바(BigPush chrome).
     * MiniCase 타원이 아님.
     */
    fun collapseToBottomShowcaseBar(detected: OverlayContext = OverlayContext.OTHER_APP) {
        if (state != OverlayState.SHOWCASE && state != OverlayState.MINI_CASE) return
        context =
            if (detected == OverlayContext.HOME_SCREEN) OverlayContext.HOME_SCREEN
            else OverlayContext.OTHER_APP
        state = OverlayState.BIG_PUSH
        miniCaseVisibility = MiniCaseVisibility.VISIBLE
        lastTransition = "collapseToBottomShowcaseBar → BIG_PUSH pos=BOTTOM"
        refreshPosition()
    }

    /** @deprecated 하단 바 경로 — collapseToBottomShowcaseBar 사용 */
    fun minimizeForOtherApp() {
        collapseToBottomShowcaseBar(OverlayContext.OTHER_APP)
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
        val resolved = OverlayPositionManager.resolve(context, state, screenState)
        /*
         * 풀 InCallUI(TOP)가 확정되면 핀 해제 — 이전 미니 수신 BELOW 핀이
         * 전체 전화 UI 중앙에 빅푸시를 남기는 것을 막는다.
         */
        if (state == OverlayState.BIG_PUSH &&
            context == OverlayContext.INCOMING_CALL_UI &&
            resolved == OverlayPosition.TOP
        ) {
            ringingBelowMiniPinned = false
            position = OverlayPosition.TOP
            return
        }
        position =
            if (ringingBelowMiniPinned &&
                state == OverlayState.BIG_PUSH &&
                resolved == OverlayPosition.TOP &&
                screenState == ScreenState.SCREEN_ON
            ) {
                OverlayPosition.BELOW_COMPACT_INCOMING
            } else {
                if (resolved == OverlayPosition.BELOW_COMPACT_INCOMING &&
                    state == OverlayState.BIG_PUSH &&
                    screenState == ScreenState.SCREEN_ON
                ) {
                    ringingBelowMiniPinned = true
                }
                resolved
            }
    }
}
