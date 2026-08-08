package kr.vlue.calloverlay.diagnostics

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

/**
 * Phase 6-G — Call session gate + stale event forensics.
 */
class CompanionRuntimeStabilityDiagTest {
    @Before
    fun setUp() {
        CompanionRuntimeStabilityDiag.reset()
    }

    @Test
    fun beginThenEnd_sessionInactiveAndIgnorePostEndStart() {
        CompanionRuntimeStabilityDiag.beginCallSession("test_ring")
        assertTrue(CompanionRuntimeStabilityDiag.isCallSessionActive())
        CompanionRuntimeStabilityDiag.endCallSession("test_end")
        assertFalse(CompanionRuntimeStabilityDiag.isCallSessionActive())
        assertTrue(CompanionRuntimeStabilityDiag.shouldIgnorePostEndOverlayStart())
    }

    @Test
    fun staleConnectedAfterEnd_recorded() {
        CompanionRuntimeStabilityDiag.beginCallSession("ring")
        CompanionRuntimeStabilityDiag.endCallSession("end")
        CompanionRuntimeStabilityDiag.noteStaleEvent("CONNECTED", "ACTION_CONNECTED")
        val snap = CompanionRuntimeStabilityDiag.snapshotJson()
        assertEquals(1, snap.getJSONObject("staleEvents").getInt("count"))
        val marks = snap.getJSONArray("marks")
        var found = false
        for (i in 0 until marks.length()) {
            if (marks.getJSONObject(i).optString("code") == "STALE_EVENT_IGNORED") {
                found = true
            }
        }
        assertTrue(found)
    }

    @Test
    fun endCallSession_idempotent() {
        CompanionRuntimeStabilityDiag.beginCallSession("ring")
        CompanionRuntimeStabilityDiag.endCallSession("end1")
        CompanionRuntimeStabilityDiag.endCallSession("end2")
        assertFalse(CompanionRuntimeStabilityDiag.isCallSessionActive())
        val snap = CompanionRuntimeStabilityDiag.snapshotJson()
        var idempotent = false
        val marks = snap.getJSONArray("marks")
        for (i in 0 until marks.length()) {
            if (marks.getJSONObject(i).optString("code") == "CALL_END_IDEMPOTENT") {
                idempotent = true
            }
        }
        assertTrue(idempotent)
    }

    @Test
    fun layoutCommit_rapidShowcaseThenMini_recordsDivergence() {
        CompanionRuntimeStabilityDiag.beginCallSession("ring")
        CompanionRuntimeStabilityDiag.noteLayoutCommit("SHOWCASE", "FULLSCREEN", "answer")
        CompanionRuntimeStabilityDiag.noteLayoutCommit("MINI_CASE", "MINI_CASE", "js.minimize")
        val snap = CompanionRuntimeStabilityDiag.snapshotJson()
        assertTrue(snap.getJSONObject("uiDivergence").getInt("count") >= 1)
    }
}
