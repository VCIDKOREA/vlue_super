package kr.vlue.calloverlay

/**
 * Frozen call-overlay UX decision table.
 * Spec: [CALL_OVERLAY_CONTRACT.md]
 *
 * Call sites must follow [decideAfterAnswer] / [mayShowCenterPopupWhileUnanswered]
 * instead of ad-hoc if-branches.
 */
object CallUiPhasePolicy {

    enum class Phase {
        /** Compact bar only */
        BIG_PUSH,

        /** 안심케어 중앙 팝업 */
        CENTER_SAFE_POPUP,

        /** 인증 회원 · 송출 OFF 중앙 팝업 */
        CENTER_AUTH_POPUP,

        /** 송출 ON + 실콘텐츠 풀 쇼케이스 */
        FULL_SHOWCASE,

        /** 팝업 확인 후 / 사용자 Mini */
        MINI_CASE,

        /** 수화했지만 빈 FULLSCREEN 금지 — 바 유지 */
        KEEP_BIG_PUSH
    }

    data class AnswerInput(
        val alreadyMiniOrAuthConfirmed: Boolean,
        val isContactSafeCare: Boolean,
        val isAuthMemberOnly: Boolean,
        val hasBroadcastShowcaseContent: Boolean,
        val canPromoteContactSafeCare: Boolean
    )

    /**
     * 발신 미수화(다이얼링) 중 중앙 팝업·쇼케이스 금지.
     *
     * @param trustedPeerConnected 프로브가 확인한 상대 응답
     *   (다이얼링 종료 후 MODE_IN_CALL 연속 확인 등 — OFFHOOK 단독 아님)
     */
    fun mayAdvancePastBigPush(
        outgoing: Boolean,
        remoteConnected: Boolean,
        dialingOrConnecting: Boolean,
        hasActiveConnectedCall: Boolean,
        trustedPeerConnected: Boolean = false
    ): Boolean {
        if (!outgoing || remoteConnected) return true
        if (hasActiveConnectedCall) return true
        if (dialingOrConnecting) return false
        return trustedPeerConnected
    }

    /** 미수화 상태에서 중앙 팝업 허용 여부 — 항상 false (규격 §2). */
    fun mayShowCenterPopupWhileUnanswered(): Boolean = false

    /**
     * 수화 확정 후 UI. first-match 규격 §3.
     */
    fun decideAfterAnswer(input: AnswerInput): Phase {
        if (input.alreadyMiniOrAuthConfirmed) return Phase.MINI_CASE
        if (input.isContactSafeCare) return Phase.CENTER_SAFE_POPUP
        if (input.isAuthMemberOnly) return Phase.CENTER_AUTH_POPUP
        if (input.hasBroadcastShowcaseContent) return Phase.FULL_SHOWCASE
        if (input.canPromoteContactSafeCare) return Phase.CENTER_SAFE_POPUP
        return Phase.KEEP_BIG_PUSH
    }
}
