package kr.vlue.calloverlay.diagnostics.perf

import kr.vlue.calloverlay.companion.CompanionOverlaySnapshot
import kr.vlue.calloverlay.companion.MiniCaseVisibility
import kr.vlue.calloverlay.companion.OverlayContext
import kr.vlue.calloverlay.companion.OverlayPosition
import kr.vlue.calloverlay.companion.OverlayState
import kr.vlue.calloverlay.companion.OverlayTriggerEvent
import kr.vlue.calloverlay.companion.ScreenState
import kr.vlue.calloverlay.diagnostics.OverlayDiagTracker
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

/**
 * Phase 5-B — Performance / Memory / CPU / Battery / Rendering (Architecture Freeze).
 */
class CompanionPerfTrackerTest {
    @Before
    fun setUp() {
        OverlayDiagTracker.resetAllForTest()
        CompanionPerfTracker.resetAllForTest()
    }

    @Test
    fun performanceMetrics_attachAndLayout_underKpi() {
        OverlayDiagTracker.beginAttach("PERF")
        OverlayDiagTracker.markAddViewBegin()
        OverlayDiagTracker.markAddViewSuccess()
        OverlayDiagTracker.beginLayout("FULLSCREEN")
        OverlayDiagTracker.markLayoutApplied("FULLSCREEN", "FULLSCREEN")

        CompanionPerfTracker.recordUpdateViewLayoutMs(5)
        CompanionPerfTracker.recordJsBridgeCallMs("answerCall", 3)
        CompanionPerfTracker.recordControllerProcessingMs("ANSWER", 2)
        CompanionPerfTracker.noteWebViewLoadStart()
        CompanionPerfTracker.noteWebViewReady()

        val perf = CompanionPerfTracker.performanceMetricsJson()
        assertTrue(perf.getLong("overlayAttachMs") <= CompanionPerfTracker.KPI_OVERLAY_ATTACH_MS)
        assertTrue(perf.getLong("layoutCommitMs") <= CompanionPerfTracker.KPI_LAYOUT_COMMIT_MS)
        assertTrue(perf.has("updateViewLayoutMs"))
        assertTrue(perf.has("jsBridgeCallMs"))
        assertTrue(perf.has("controllerProcessingMs"))
        assertTrue(perf.has("frameCommitMs"))
    }

    @Test
    fun memoryAudit_windowCountOne_noLeak() {
        CompanionPerfTracker.captureMemorySample("baseline")
        CompanionPerfTracker.noteOverlayAttached(1)
        val mid = CompanionPerfTracker.memoryAuditJson()
        assertEquals(1, mid.getInt("windowCount"))
        assertTrue(mid.getBoolean("windowCountPass"))
        assertFalse(mid.getBoolean("leakDetected"))

        CompanionPerfTracker.noteOverlayDetached()
        val end = CompanionPerfTracker.memoryAuditJson()
        assertEquals(0, end.getInt("windowCount"))
        assertFalse(end.getBoolean("leakDetected"))
        assertTrue(end.has("gcCount"))
        assertTrue(end.has("viewCount"))
        assertTrue(end.has("bitmapBytes"))
    }

    @Test
    fun cpuAudit_incomingAnswerMiniRestoreCallEnd() {
        listOf("INCOMING", "ANSWER", "MINI", "RESTORE", "CALL_END").forEach { ev ->
            CompanionPerfTracker.beginEventCpu(ev)
            CompanionPerfTracker.endEventCpu(ev)
        }
        val cpu = CompanionPerfTracker.cpuAuditJson()
        listOf("INCOMING", "ANSWER", "MINI", "RESTORE", "CALL_END").forEach { ev ->
            assertTrue(cpu.has(ev))
            assertTrue(cpu.getJSONObject(ev).getInt("count") >= 1)
        }
    }

    @Test
    fun batteryAudit_fgsAndOverlayDuration() {
        CompanionPerfTracker.noteForegroundStarted()
        CompanionPerfTracker.noteOverlayAttached()
        CompanionPerfTracker.noteWakeLock(false)
        CompanionPerfTracker.noteScreenOn(true)
        val bat = CompanionPerfTracker.batteryAuditJson()
        assertTrue(bat.getLong("foregroundServiceDurationMs") >= 0)
        assertTrue(bat.getLong("overlayAliveDurationMs") >= 0)
        assertFalse(bat.getBoolean("wakeLockHeld"))
        assertTrue(bat.getBoolean("screenOn"))
        assertTrue(bat.has("estimatedBatteryCostScore"))
    }

    @Test
    fun renderingAudit_frameDropAndLayoutPass() {
        CompanionPerfTracker.recordLayoutCommitMs(5)
        CompanionPerfTracker.recordAnimationMs(40)
        CompanionPerfTracker.noteDroppedFrames(1)
        val render = CompanionPerfTracker.renderingAuditJson()
        assertTrue(render.getInt("layoutPassCount") >= 1)
        assertTrue(render.getInt("measureCount") >= 1)
        assertTrue(render.getInt("droppedFrames") >= 1)
        assertTrue(render.getLong("animationTimeMs") >= 40)
        assertEquals(CompanionPerfTracker.FRAME_BUDGET_MS, render.getLong("frameBudgetMs"))
    }

    @Test
    fun passEvaluation_meetsKpis() {
        CompanionPerfTracker.recordOverlayAttachMs(50)
        CompanionPerfTracker.noteOverlayAttached(1)
        CompanionPerfTracker.noteOverlayDetached()
        val pass = CompanionPerfTracker.passEvaluationJson(answerToShowcaseMs = 120)
        assertTrue(pass.getBoolean("passed"))
        assertEquals("PASS", pass.getString("verdict"))
        assertTrue(pass.getBoolean("overlayAttachPass"))
        assertTrue(pass.getBoolean("answerToShowcasePass"))
        assertTrue(pass.getBoolean("windowCountPass"))
        assertTrue(pass.getBoolean("leakPass"))
    }

    @Test
    fun passEvaluation_failsWhenAttachTooSlow() {
        CompanionPerfTracker.recordOverlayAttachMs(500)
        val pass = CompanionPerfTracker.passEvaluationJson(answerToShowcaseMs = 100)
        assertFalse(pass.getBoolean("overlayAttachPass"))
        assertFalse(pass.getBoolean("passed"))
    }

    @Test
    fun dashboard_inOverlayDiagSnapshot() {
        CompanionPerfTracker.recordOverlayAttachMs(30)
        CompanionPerfTracker.recordLayoutCommitMs(10)
        CompanionPerfTracker.noteOverlayAttached(1)
        OverlayDiagTracker.publishCompanion(
            CompanionOverlaySnapshot(
                state = OverlayState.SHOWCASE,
                context = OverlayContext.IN_CALL,
                position = OverlayPosition.FULLSCREEN,
                screenState = ScreenState.SCREEN_ON,
                miniCaseVisibility = MiniCaseVisibility.VISIBLE,
                lastTransition = null,
                rejectedTransition = null
            ),
            OverlayTriggerEvent.ANSWER
        )
        OverlayDiagTracker.markShowcaseFullscreenCommit()

        val dash = OverlayDiagTracker.snapshotJson().getJSONObject("performanceDashboard")
        assertTrue(dash.getBoolean("architectureFreeze"))
        assertTrue(dash.has("performance"))
        assertTrue(dash.has("memory"))
        assertTrue(dash.has("cpu"))
        assertTrue(dash.has("battery"))
        assertTrue(dash.has("rendering"))
        assertTrue(dash.has("pass"))
        assertTrue(dash.getJSONObject("cpu").has("ANSWER") || dash.getJSONObject("cpu").has("byEvent"))
    }

    @Test
    fun measureHelpers_recordTimings() {
        val v = CompanionPerfTracker.measureUpdateViewLayout { 42 }
        assertEquals(42, v)
        CompanionPerfTracker.measureJsBridge("test") { Unit }
        val perf = CompanionPerfTracker.performanceMetricsJson()
        assertTrue(perf.getLong("updateViewLayoutMs") >= 0)
        assertTrue(perf.getLong("jsBridgeCallMs") >= 0)
    }
}
