package kr.vlue.calloverlay

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Locks [CALL_OVERLAY_CONTRACT.md]. Behavior changes must update this test first.
 */
class CallUiPhasePolicyTest {

    @Test
    fun dialingOutgoing_mustNotAdvancePastBigPush() {
        assertFalse(
            CallUiPhasePolicy.mayAdvancePastBigPush(
                outgoing = true,
                remoteConnected = false,
                dialingOrConnecting = true,
                hasActiveConnectedCall = false,
                trustedPeerConnected = false
            )
        )
    }

    @Test
    fun audioInCallWhileDialing_stillBlockedWithoutActive() {
        assertFalse(
            CallUiPhasePolicy.mayAdvancePastBigPush(
                outgoing = true,
                remoteConnected = false,
                dialingOrConnecting = true,
                hasActiveConnectedCall = false,
                trustedPeerConnected = true
            )
        )
    }

    @Test
    fun activeCall_allowsAdvanceEvenIfOutgoing() {
        assertTrue(
            CallUiPhasePolicy.mayAdvancePastBigPush(
                outgoing = true,
                remoteConnected = false,
                dialingOrConnecting = false,
                hasActiveConnectedCall = true,
                trustedPeerConnected = false
            )
        )
    }

    @Test
    fun trustedPeerConnected_allowsAdvanceWhenNotDialing() {
        assertTrue(
            CallUiPhasePolicy.mayAdvancePastBigPush(
                outgoing = true,
                remoteConnected = false,
                dialingOrConnecting = false,
                hasActiveConnectedCall = false,
                trustedPeerConnected = true
            )
        )
    }

    @Test
    fun notDialing_withoutTrustedOrActive_staysBlocked() {
        assertFalse(
            CallUiPhasePolicy.mayAdvancePastBigPush(
                outgoing = true,
                remoteConnected = false,
                dialingOrConnecting = false,
                hasActiveConnectedCall = false,
                trustedPeerConnected = false
            )
        )
    }

    @Test
    fun unanswered_neverShowsCenterPopup() {
        assertFalse(CallUiPhasePolicy.mayShowCenterPopupWhileUnanswered())
    }

    @Test
    fun afterAnswer_safeCare_isCenterPopup() {
        assertEquals(
            CallUiPhasePolicy.Phase.CENTER_SAFE_POPUP,
            CallUiPhasePolicy.decideAfterAnswer(
                CallUiPhasePolicy.AnswerInput(
                    alreadyMiniOrAuthConfirmed = false,
                    isContactSafeCare = true,
                    isAuthMemberOnly = false,
                    hasBroadcastShowcaseContent = false,
                    canPromoteContactSafeCare = false
                )
            )
        )
    }

    @Test
    fun afterAnswer_authOnly_isCenterAuthPopup() {
        assertEquals(
            CallUiPhasePolicy.Phase.CENTER_AUTH_POPUP,
            CallUiPhasePolicy.decideAfterAnswer(
                CallUiPhasePolicy.AnswerInput(
                    alreadyMiniOrAuthConfirmed = false,
                    isContactSafeCare = false,
                    isAuthMemberOnly = true,
                    hasBroadcastShowcaseContent = false,
                    canPromoteContactSafeCare = false
                )
            )
        )
    }

    @Test
    fun afterAnswer_broadcastContent_isFullShowcase() {
        assertEquals(
            CallUiPhasePolicy.Phase.FULL_SHOWCASE,
            CallUiPhasePolicy.decideAfterAnswer(
                CallUiPhasePolicy.AnswerInput(
                    alreadyMiniOrAuthConfirmed = false,
                    isContactSafeCare = false,
                    isAuthMemberOnly = false,
                    hasBroadcastShowcaseContent = true,
                    canPromoteContactSafeCare = false
                )
            )
        )
    }

    @Test
    fun afterAnswer_empty_keepsBigPush_neverBlankFullscreen() {
        assertEquals(
            CallUiPhasePolicy.Phase.KEEP_BIG_PUSH,
            CallUiPhasePolicy.decideAfterAnswer(
                CallUiPhasePolicy.AnswerInput(
                    alreadyMiniOrAuthConfirmed = false,
                    isContactSafeCare = false,
                    isAuthMemberOnly = false,
                    hasBroadcastShowcaseContent = false,
                    canPromoteContactSafeCare = false,
                    isUnverifiedResolved = false
                )
            )
        )
    }

    @Test
    fun afterAnswer_unverifiedResolved_isFullShowcase() {
        assertEquals(
            CallUiPhasePolicy.Phase.FULL_SHOWCASE,
            CallUiPhasePolicy.decideAfterAnswer(
                CallUiPhasePolicy.AnswerInput(
                    alreadyMiniOrAuthConfirmed = false,
                    isContactSafeCare = false,
                    isAuthMemberOnly = false,
                    hasBroadcastShowcaseContent = false,
                    canPromoteContactSafeCare = false,
                    isUnverifiedResolved = true
                )
            )
        )
    }

    @Test
    fun afterAnswer_contactPromote_isSafeCarePopup() {
        assertEquals(
            CallUiPhasePolicy.Phase.CENTER_SAFE_POPUP,
            CallUiPhasePolicy.decideAfterAnswer(
                CallUiPhasePolicy.AnswerInput(
                    alreadyMiniOrAuthConfirmed = false,
                    isContactSafeCare = false,
                    isAuthMemberOnly = false,
                    hasBroadcastShowcaseContent = false,
                    canPromoteContactSafeCare = true
                )
            )
        )
    }

    @Test
    fun afterAnswer_alreadyMini_staysMini() {
        assertEquals(
            CallUiPhasePolicy.Phase.MINI_CASE,
            CallUiPhasePolicy.decideAfterAnswer(
                CallUiPhasePolicy.AnswerInput(
                    alreadyMiniOrAuthConfirmed = true,
                    isContactSafeCare = true,
                    isAuthMemberOnly = true,
                    hasBroadcastShowcaseContent = true,
                    canPromoteContactSafeCare = true
                )
            )
        )
    }
}
