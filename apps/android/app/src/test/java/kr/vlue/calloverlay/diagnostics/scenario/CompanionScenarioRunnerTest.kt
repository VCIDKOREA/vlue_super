package kr.vlue.calloverlay.diagnostics.scenario

import kr.vlue.calloverlay.diagnostics.OverlayDiagTracker
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

/**
 * Phase 4-C — Companion E2E Scenario 1~8.
 * Architecture / Controller / Window 변경 없이 기대 State 비교만 수행.
 */
class CompanionScenarioRunnerTest {
    @Before
    fun setUp() {
        OverlayDiagTracker.resetAllForTest()
    }

    @Test
    fun scenario1_fullFlow_passes() {
        assertPass(CompanionScenarioId.SCENARIO_1_FULL_FLOW)
    }

    @Test
    fun scenario2_answerSkipBigPush_passes() {
        assertPass(CompanionScenarioId.SCENARIO_2_ANSWER_SKIP_BIG_PUSH)
    }

    @Test
    fun scenario3_reject_passes() {
        assertPass(CompanionScenarioId.SCENARIO_3_REJECT)
    }

    @Test
    fun scenario4_screenOffReeval_passes() {
        assertPass(CompanionScenarioId.SCENARIO_4_SCREEN_OFF_REEVAL)
    }

    @Test
    fun scenario5_keypad_passes() {
        assertPass(CompanionScenarioId.SCENARIO_5_KEYPAD)
    }

    @Test
    fun scenario6_homeRestore_passes() {
        assertPass(CompanionScenarioId.SCENARIO_6_HOME_RESTORE)
    }

    @Test
    fun scenario7_edgeScreenRestore_passes() {
        assertPass(CompanionScenarioId.SCENARIO_7_EDGE_SCREEN_RESTORE)
    }

    @Test
    fun scenario8_callEndIdle_passes() {
        assertPass(CompanionScenarioId.SCENARIO_8_CALL_END_IDLE)
    }

    @Test
    fun allScenarios_pass_andRecordedInDiag() {
        val results = CompanionScenarioRunner.runAll()
        assertEquals(8, results.size)
        results.forEach { r ->
            assertTrue(
                "${r.id} FAIL: ${r.missingTransitionHint}\n${r.toJson()}",
                r.passed
            )
            assertEquals(0, r.unexpectedStateCount)
            assertEquals(0, r.failureCount)
        }
        val snap = OverlayDiagTracker.snapshotJson()
        assertTrue(snap.has("lastScenarioResult"))
        assertEquals(8, snap.getJSONArray("scenarioResults").length())
        val last = snap.getJSONObject("lastScenarioResult")
        assertEquals("PASS", last.getString("verdict"))
        assertTrue(last.has("timeline"))
        assertTrue(last.has("stateFlow"))
        assertTrue(last.has("kpi"))
    }

    @Test
    fun catalog_definesEightScenarios() {
        assertEquals(8, CompanionScenarioCatalog.all.size)
        CompanionScenarioId.entries.forEach { id ->
            val def = CompanionScenarioCatalog.byId(id)
            assertTrue(def.steps.isNotEmpty())
            assertFalse(def.name.isBlank())
        }
    }

    @Test
    fun timeline_recordsExpectedActualElapsedAndVerdict() {
        val result = CompanionScenarioRunner.run(CompanionScenarioId.SCENARIO_2_ANSWER_SKIP_BIG_PUSH)
        assertTrue(result.passed)
        result.steps.forEach { step ->
            assertEquals(ScenarioStepVerdict.PASS, step.verdict)
            assertTrue(step.elapsedMs >= 0)
            assertTrue(step.actualState.name.isNotBlank())
            assertTrue(step.actualPosition.isNotBlank())
            assertTrue(step.actualScreenState.isNotBlank())
            assertTrue(step.actualMiniVisibility.isNotBlank())
            assertTrue(step.failReasons.isEmpty())
        }
        val json = result.toJson()
        assertEquals("PASS", json.getString("verdict"))
        assertTrue(json.getJSONArray("timeline").length() >= 3)
        assertTrue(json.getJSONObject("kpi").getInt("passCount") >= 3)
    }

    private fun assertPass(id: CompanionScenarioId) {
        val result = CompanionScenarioRunner.run(id)
        assertTrue(
            "$id FAIL unexpected=${result.unexpectedStateCount} " +
                "hint=${result.missingTransitionHint}\n${result.toJson()}",
            result.passed
        )
        result.steps.forEach { step ->
            assertEquals(
                "step ${step.index} ${step.event} ${step.failReasons}",
                ScenarioStepVerdict.PASS,
                step.verdict
            )
        }
    }
}
