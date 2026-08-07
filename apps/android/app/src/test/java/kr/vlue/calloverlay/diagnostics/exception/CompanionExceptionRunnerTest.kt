package kr.vlue.calloverlay.diagnostics.exception

import kr.vlue.calloverlay.diagnostics.OverlayDiagTracker
import kr.vlue.calloverlay.diagnostics.OverlayFailureReason
import kr.vlue.calloverlay.diagnostics.scenario.ScenarioStepVerdict
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

/**
 * Phase 4-D — Exception / Stress / Memory (관찰 전용).
 */
class CompanionExceptionRunnerTest {
    @Before
    fun setUp() {
        OverlayDiagTracker.resetAllForTest()
    }

    @Test
    fun case1_endBeforeBigPush_passes() {
        assertPass(CompanionExceptionCaseId.CASE_1_END_BEFORE_BIG_PUSH)
    }

    @Test
    fun case2_processPauseResume_passes() {
        assertPass(CompanionExceptionCaseId.CASE_2_PROCESS_PAUSE_RESUME)
    }

    @Test
    fun case3_permissionRevoked_passes() {
        val r = assertPass(CompanionExceptionCaseId.CASE_3_PERMISSION_REVOKED)
        assertTrue(
            r.steps.any { it.actualFailureReason == OverlayFailureReason.PERMISSION_DENIED }
        )
    }

    @Test
    fun case4_rotationLayout_passes() {
        assertPass(CompanionExceptionCaseId.CASE_4_ROTATION_LAYOUT)
    }

    @Test
    fun case5_edgeHideCallEnd_passes() {
        assertPass(CompanionExceptionCaseId.CASE_5_EDGE_HIDE_CALL_END)
    }

    @Test
    fun case6_appKillReturn_passes() {
        assertPass(CompanionExceptionCaseId.CASE_6_APP_KILL_RETURN)
    }

    @Test
    fun case7_secondCallCleanup_passes() {
        assertPass(CompanionExceptionCaseId.CASE_7_SECOND_CALL_CLEANUP)
    }

    @Test
    fun case8_debounceSingleBigPush_passes() {
        assertPass(CompanionExceptionCaseId.CASE_8_DEBOUNCE_SINGLE_BIG_PUSH)
    }

    @Test
    fun allExceptionCases_pass() {
        OverlayDiagTracker.resetAllForTest()
        val results = CompanionExceptionRunner.runAll()
        assertEquals(8, results.size)
        results.forEach { r ->
            assertTrue("${r.id} FAIL: ${r.hint}\n${r.toJson()}", r.passed)
            assertFalse(r.stateLeak)
            assertFalse(r.overlayLeak)
            assertFalse(r.windowDuplicate)
            assertEquals(0, r.unexpectedTransitionCount)
        }
        val snap = OverlayDiagTracker.snapshotJson()
        assertTrue(snap.has("lastExceptionCase"))
        assertEquals(8, snap.getJSONArray("exceptionCaseResults").length())
        assertTrue(snap.getJSONArray("exceptionTimeline").length() > 0)
    }

    @Test
    fun stress_100_incomingAnswerEnd_noLeak() {
        OverlayDiagTracker.resetAllForTest()
        val result = CompanionStressRunner.runIncomingAnswerEnd(100)
        assertTrue(result.hint ?: "ok", result.passed)
        assertFalse(result.stateLeak)
        assertFalse(result.overlayLeak)
        assertFalse(result.windowDuplicate)
        assertEquals(0, result.unexpectedTransitionCount)
        assertEquals(100, result.completedCycles)
        assertEquals(result.attachCount, result.removeCount)
        assertEquals("IDLE", result.finalState)

        val snap = OverlayDiagTracker.snapshotJson()
        assertTrue(snap.has("lastStressResult"))
        assertTrue(snap.has("stressTimeline"))
        assertEquals(100, snap.getJSONArray("stressTimeline").length())
        assertTrue(snap.has("memorySummary"))
        assertTrue(snap.has("failureMatrix"))

        val mem = snap.getJSONObject("memorySummary")
        assertEquals("PASS", mem.getString("verdict"))
        assertFalse(mem.getBoolean("leak"))
        assertTrue(mem.getBoolean("balanceOk"))
        assertEquals(100, mem.getInt("overlayAttachCount"))
        assertEquals(100, mem.getInt("overlayRemoveCount"))
    }

    @Test
    fun memorySummary_and_failureMatrix_recorded() {
        OverlayDiagTracker.resetAllForTest()
        OverlayDiagTracker.recordOverlayFailure(
            OverlayFailureReason.PERMISSION_DENIED,
            phase = "TEST"
        )
        OverlayDiagTracker.recordOverlayFailure(
            OverlayFailureReason.CALL_ENDED,
            phase = "TEST"
        )
        CompanionStressRunner.runIncomingAnswerEnd(3)
        val matrix = OverlayDiagTracker.snapshotJson().getJSONObject("failureMatrix")
        assertTrue(matrix.getInt("totalFailures") >= 2)
        assertTrue(matrix.getInt(OverlayFailureReason.PERMISSION_DENIED.name) >= 1)
        assertTrue(matrix.getInt(OverlayFailureReason.CALL_ENDED.name) >= 1)
        val mem = CompanionStressRunner.memorySummary()
        assertEquals(3, mem.overlayAttachCount)
        assertEquals(3, mem.overlayRemoveCount)
        assertFalse(mem.leak)
    }

    @Test
    fun case1_recordsCallEndedFailureReason() {
        val r = CompanionExceptionRunner.run(CompanionExceptionCaseId.CASE_1_END_BEFORE_BIG_PUSH)
        assertTrue(r.passed)
        val step = r.steps.last { it.event == "BIG_PUSH_ATTEMPT_AFTER_END" }
        assertEquals(OverlayFailureReason.CALL_ENDED, step.actualFailureReason)
        assertEquals(ScenarioStepVerdict.PASS, step.verdict)
    }

    private fun assertPass(id: CompanionExceptionCaseId): ExceptionCaseResult {
        OverlayDiagTracker.resetAllForTest()
        val result = CompanionExceptionRunner.run(id)
        assertTrue(
            "$id FAIL hint=${result.hint}\n${result.toJson()}",
            result.passed
        )
        result.steps.forEach { step ->
            assertEquals(
                "step ${step.index} ${step.event} ${step.failReasons}",
                ScenarioStepVerdict.PASS,
                step.verdict
            )
        }
        return result
    }
}
