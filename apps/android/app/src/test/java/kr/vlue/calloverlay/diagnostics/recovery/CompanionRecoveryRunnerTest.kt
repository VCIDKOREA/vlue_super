package kr.vlue.calloverlay.diagnostics.recovery

import android.content.ComponentCallbacks2
import kr.vlue.calloverlay.diagnostics.OverlayDiagTracker
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

/**
 * Phase 5-C — Recovery Hardening (Architecture Freeze · 관찰만).
 */
class CompanionRecoveryRunnerTest {
    @Before
    fun setUp() {
        OverlayDiagTracker.resetAllForTest()
    }

    @Test
    fun case1_fgsKillRestart_passes() {
        assertPass(CompanionRecoveryCaseId.CASE_1_FGS_KILL_RESTART)
    }

    @Test
    fun case2_lowMemoryTrim_passes() {
        assertPass(CompanionRecoveryCaseId.CASE_2_LOW_MEMORY_TRIM)
    }

    @Test
    fun case3_processDeath_passes() {
        assertPass(CompanionRecoveryCaseId.CASE_3_PROCESS_DEATH)
    }

    @Test
    fun case4_configurationChange_passes() {
        assertPass(CompanionRecoveryCaseId.CASE_4_CONFIGURATION_CHANGE)
    }

    @Test
    fun case5_packageUpdate_passes() {
        assertPass(CompanionRecoveryCaseId.CASE_5_PACKAGE_UPDATE)
    }

    @Test
    fun case6_bootCompleted_passes() {
        assertPass(CompanionRecoveryCaseId.CASE_6_BOOT_COMPLETED)
    }

    @Test
    fun case7_callEndThenKill_passes() {
        assertPass(CompanionRecoveryCaseId.CASE_7_CALL_END_THEN_KILL)
    }

    @Test
    fun allRecoveryCases_pass_andDashboard() {
        OverlayDiagTracker.resetAllForTest()
        CompanionRecoveryTracker.recordServiceLifecycle("ON_CREATE", "seed")
        CompanionRecoveryTracker.recordMemoryCallback(
            "onTrimMemory",
            ComponentCallbacks2.TRIM_MEMORY_RUNNING_LOW
        )
        CompanionRecoveryTracker.recordMemoryCallback("onLowMemory")

        val results = CompanionRecoveryRunner.runAll()
        assertEquals(7, results.size)
        results.forEach { r ->
            assertTrue("${r.id} FAIL: ${r.hint}\n${r.toJson()}", r.passed)
            assertFalse(r.stateLeak)
            assertFalse(r.windowLeak)
            assertEquals(0, r.unexpectedTransitionCount)
            assertTrue(r.totalRecoveryTimeMs >= 0)
            r.steps.forEach { step ->
                assertTrue(step.recoverySuccess)
                assertTrue(step.recoveryTimeMs >= 0)
            }
        }

        val dash = OverlayDiagTracker.snapshotJson().getJSONObject("recoveryDashboard")
        assertTrue(dash.getBoolean("architectureFreeze"))
        assertTrue(dash.has("recoveryTimeline"))
        assertTrue(dash.has("recoverySuccessRate"))
        assertTrue(dash.has("memoryCallbackHistory"))
        assertTrue(dash.has("serviceLifecycle"))
        assertEquals(7, dash.getJSONArray("recoveryCaseResults").length())
        assertEquals(1.0, dash.getDouble("recoverySuccessRate"), 0.001)
        assertTrue(dash.getJSONArray("memoryCallbackHistory").length() >= 2)
        assertTrue(dash.getJSONArray("serviceLifecycle").length() >= 1)
    }

    @Test
    fun recoveryDiagnostics_recordsExpectedFields() {
        val r = CompanionRecoveryRunner.run(CompanionRecoveryCaseId.CASE_1_FGS_KILL_RESTART)
        assertTrue(r.passed)
        val step = r.steps.first { it.event == "SERVICE_RESTART" }
        assertEquals("IDLE", step.expectedState.name)
        assertEquals("IDLE", step.recoveredState.name)
        assertTrue(step.recoverySuccess)
        val timeline = CompanionRecoveryTracker.dashboardJson().getJSONArray("recoveryTimeline")
        assertTrue(timeline.length() >= r.steps.size)
        val last = timeline.getJSONObject(timeline.length() - 1)
        assertTrue(last.has("recoveryEvent"))
        assertTrue(last.has("recoveryTimeMs"))
        assertTrue(last.has("recoveredState"))
        assertTrue(last.has("expectedState"))
        assertTrue(last.has("recoverySuccess"))
    }

    private fun assertPass(id: CompanionRecoveryCaseId): RecoveryCaseResult {
        OverlayDiagTracker.resetAllForTest()
        val result = CompanionRecoveryRunner.run(id)
        assertTrue("$id FAIL hint=${result.hint}\n${result.toJson()}", result.passed)
        return result
    }
}
