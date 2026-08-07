package kr.vlue.calloverlay.companion

import org.json.JSONObject

data class CompanionOverlaySnapshot(
    val state: OverlayState,
    val context: OverlayContext,
    val position: OverlayPosition,
    val lastTransition: String?,
    val rejectedTransition: String?
) {
    fun toJson(): JSONObject = JSONObject().apply {
        put("overlayState", state.name)
        put("overlayContext", context.name)
        put("overlayPosition", position.name)
        if (!lastTransition.isNullOrBlank()) put("lastTransition", lastTransition)
        if (!rejectedTransition.isNullOrBlank()) put("rejectedTransition", rejectedTransition)
    }
}

/**
 * Companion Overlay 허용 전이만 수행.
 * CallOverlayService는 이 Controller의 state/position을 따른다.
 */
class CompanionOverlayController {
    @Volatile
    var state: OverlayState = OverlayState.IDLE
        private set
    @Volatile
    var context: OverlayContext = OverlayContext.HOME_SCREEN
        private set
    @Volatile
    var position: OverlayPosition = OverlayPosition.HIDDEN
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
            /* Incoming 은 내부 phase — state는 BigPush 요청 시 확정 */
            refreshPosition()
            lastTransition = "onIncoming context=${context.name}"
            rejectedTransition = null
        }
    }

    /**
     * BigPush 표시 요청.
     * @return true면 BigPush 생성 허용, false면 스킵(이미 Answer 등)
     */
    fun requestBigPush(detectedContext: OverlayContext, callAlreadyAnswered: Boolean): Boolean {
        context = detectedContext
        if (callAlreadyAnswered || state == OverlayState.SHOWCASE || state == OverlayState.MINI_CASE) {
            rejectedTransition = "requestBigPush rejected: answeredOrShowcase state=$state"
            if (callAlreadyAnswered && state == OverlayState.IDLE) {
                /* Answer-before-BigPush → Showcase로 바로 갈 준비 */
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
            rejectedTransition = "requestBigPush: position HIDDEN for context=$context"
            state = OverlayState.IDLE
            return false
        }
        lastTransition = "requestBigPush → BIG_PUSH pos=${position.name}"
        rejectedTransition = null
        return true
    }

    /** Answer — BigPush 제거 후 Showcase */
    fun onAnswer(detectedContext: OverlayContext = OverlayContext.IN_CALL) {
        context = detectedContext
        when (state) {
            OverlayState.BIG_PUSH,
            OverlayState.IDLE,
            OverlayState.SHOWCASE -> {
                state = OverlayState.SHOWCASE
                lastTransition = "onAnswer → SHOWCASE (from was cleared)"
                rejectedTransition = null
            }
            OverlayState.MINI_CASE -> {
                /* Answer 중 Mini 유지 가능하나 정책상 통화 직후는 Showcase 우선 */
                state = OverlayState.SHOWCASE
                lastTransition = "onAnswer MiniCase→SHOWCASE"
                rejectedTransition = null
            }
        }
        refreshPosition()
    }

    fun onMinimize(detectedContext: OverlayContext = OverlayContext.MINIMIZED) {
        if (state != OverlayState.SHOWCASE && state != OverlayState.MINI_CASE) {
            rejectedTransition = "onMinimize rejected: from $state"
            return
        }
        context = detectedContext
        state = OverlayState.MINI_CASE
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
        lastTransition = "onRestoreShowcase → SHOWCASE"
        rejectedTransition = null
        refreshPosition()
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
        lastTransition = "onCallEnd → IDLE"
        rejectedTransition = null
    }

    fun updateContext(detectedContext: OverlayContext) {
        context = detectedContext
        /* Showcase가 HOME/OTHER로 바뀌면 Mini로 유도 */
        if (state == OverlayState.SHOWCASE &&
            (detectedContext == OverlayContext.HOME_SCREEN ||
                detectedContext == OverlayContext.OTHER_APP ||
                detectedContext == OverlayContext.KEYPAD ||
                detectedContext == OverlayContext.MINIMIZED)
        ) {
            state = OverlayState.MINI_CASE
            lastTransition = "context→MINI_CASE ($detectedContext)"
        }
        if (state == OverlayState.BIG_PUSH &&
            (detectedContext == OverlayContext.IN_CALL)
        ) {
            /* Answer race: context만 IN_CALL이 된 경우 BigPush 금지 */
            state = OverlayState.SHOWCASE
            lastTransition = "context IN_CALL while BIG_PUSH → SHOWCASE"
        }
        refreshPosition()
    }

    fun snapshot(): CompanionOverlaySnapshot =
        CompanionOverlaySnapshot(state, context, position, lastTransition, rejectedTransition)

    private fun refreshPosition() {
        position = OverlayPositionManager.resolve(context, state)
    }
}
