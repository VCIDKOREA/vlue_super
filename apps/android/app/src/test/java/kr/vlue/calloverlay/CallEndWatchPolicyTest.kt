package kr.vlue.calloverlay

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class CallEndWatchPolicyTest {

    @Test
    fun outgoingGrace_doesNotDismissBriefIdle() {
        val decision = CallEndWatchPolicy.decide(
            CallEndWatchPolicy.Sample(
                callIdle = true,
                telecomInCall = false,
                audioInCall = false,
                sawLiveCall = false,
                overlayAgeMs = 800L,
                priorIdleStreak = 2
            )
        )
        assertFalse(decision.dismiss)
    }

    @Test
    fun audioInCall_keepsOverlay() {
        val decision = CallEndWatchPolicy.decide(
            CallEndWatchPolicy.Sample(
                callIdle = true,
                telecomInCall = false,
                audioInCall = true,
                sawLiveCall = true,
                overlayAgeMs = 20_000L,
                priorIdleStreak = 5
            )
        )
        assertFalse(decision.dismiss)
    }

    @Test
    fun hangupAfterLiveCall_dismissesOnThirdQuietTick() {
        val first = CallEndWatchPolicy.decide(quiet(sawLiveCall = true, streak = 0))
        val second = CallEndWatchPolicy.decide(quiet(sawLiveCall = true, streak = first.nextIdleStreak))
        val third = CallEndWatchPolicy.decide(quiet(sawLiveCall = true, streak = second.nextIdleStreak))
        assertFalse(first.dismiss)
        assertFalse(second.dismiss)
        assertTrue(third.dismiss)
    }

    private fun quiet(sawLiveCall: Boolean, streak: Int) = CallEndWatchPolicy.Sample(
        callIdle = true,
        telecomInCall = false,
        audioInCall = false,
        sawLiveCall = sawLiveCall,
        overlayAgeMs = 1_000L,
        priorIdleStreak = streak
    )
}
