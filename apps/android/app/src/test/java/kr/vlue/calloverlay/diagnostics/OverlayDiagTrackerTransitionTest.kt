package kr.vlue.calloverlay.diagnostics

import kr.vlue.calloverlay.companion.CompanionOverlaySnapshot
import kr.vlue.calloverlay.companion.MiniCaseVisibility
import kr.vlue.calloverlay.companion.OverlayContext
import kr.vlue.calloverlay.companion.OverlayPosition
import kr.vlue.calloverlay.companion.OverlayState
import kr.vlue.calloverlay.companion.OverlayTriggerEvent
import kr.vlue.calloverlay.companion.ScreenState
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

class OverlayDiagTrackerTransitionTest {
    @Before
    fun setUp() {
        OverlayDiagTracker.resetAllForTest()
    }

    private fun snap(
        state: OverlayState,
        position: OverlayPosition = OverlayPosition.HIDDEN,
        vis: MiniCaseVisibility = MiniCaseVisibility.VISIBLE,
        screen: ScreenState = ScreenState.SCREEN_ON
    ) = CompanionOverlaySnapshot(
        state = state,
        context = when (state) {
            OverlayState.SHOWCASE -> OverlayContext.IN_CALL
            OverlayState.MINI_CASE -> OverlayContext.MINIMIZED
            OverlayState.BIG_PUSH -> OverlayContext.HOME_SCREEN
            OverlayState.IDLE -> OverlayContext.HOME_SCREEN
        },
        position = position,
        screenState = screen,
        miniCaseVisibility = vis,
        lastTransition = null,
        rejectedTransition = null
    )

    @Test
    fun incoming_to_bigPush_recordsTransition() {
        OverlayDiagTracker.publishCompanion(snap(OverlayState.IDLE), OverlayTriggerEvent.INCOMING)
        OverlayDiagTracker.publishCompanion(
            snap(OverlayState.BIG_PUSH, OverlayPosition.BOTTOM),
            OverlayTriggerEvent.INCOMING
        )
        val last = OverlayDiagTracker.snapshotJson().getJSONObject("lastOverlayTransition")
        assertEquals("OVERLAY_TRANSITION", last.getString("eventType"))
        assertEquals("IDLE", last.getString("previousState"))
        assertEquals("BIG_PUSH", last.getString("nextState"))
        assertEquals("INCOMING", last.getString("triggerEvent"))
        assertEquals("BOTTOM", last.getString("overlayPosition"))
    }

    @Test
    fun answer_to_showcase_recordsTransition_andKpi() {
        OverlayDiagTracker.publishCompanion(
            snap(OverlayState.BIG_PUSH, OverlayPosition.TOP),
            OverlayTriggerEvent.INCOMING
        )
        OverlayDiagTracker.markBigPushVisibleCommit()
        OverlayDiagTracker.publishCompanion(
            snap(OverlayState.SHOWCASE, OverlayPosition.FULLSCREEN),
            OverlayTriggerEvent.ANSWER
        )
        OverlayDiagTracker.markShowcaseFullscreenCommit()
        val last = OverlayDiagTracker.snapshotJson().getJSONObject("lastOverlayTransition")
        assertEquals("SHOWCASE", last.getString("nextState"))
        assertEquals("ANSWER", last.getString("triggerEvent"))
        assertEquals("FULLSCREEN", last.getString("overlayPosition"))
        val kpi = OverlayDiagTracker.snapshotJson().getJSONObject("companionKpi")
        assertTrue(kpi.has("answerToShowcaseMs"))
        assertTrue(kpi.has("bigPushToShowcaseMs"))
        assertEquals(
            OverlayDiagTracker.KPI_ANSWER_TO_SHOWCASE_LAYOUT_MS,
            kpi.getInt("kpiAnswerToShowcaseMs")
        )
    }

    @Test
    fun showcase_to_mini_recordsTransition() {
        OverlayDiagTracker.publishCompanion(
            snap(OverlayState.SHOWCASE, OverlayPosition.FULLSCREEN),
            OverlayTriggerEvent.ANSWER
        )
        OverlayDiagTracker.publishCompanion(
            snap(OverlayState.MINI_CASE, OverlayPosition.MINI_CASE),
            OverlayTriggerEvent.HOME_CHANGED,
            userAction = true
        )
        val last = OverlayDiagTracker.snapshotJson().getJSONObject("lastOverlayTransition")
        assertEquals("MINI_CASE", last.getString("nextState"))
        assertEquals("HOME_CHANGED", last.getString("triggerEvent"))
        assertTrue(last.getBoolean("userAction"))
    }

    @Test
    fun mini_edgeHide_then_restore_recordsVisibilityTransitions() {
        OverlayDiagTracker.publishCompanion(
            snap(OverlayState.MINI_CASE, OverlayPosition.MINI_CASE),
            OverlayTriggerEvent.HOME_CHANGED
        )
        OverlayDiagTracker.publishCompanion(
            snap(
                OverlayState.MINI_CASE,
                OverlayPosition.MINI_CASE,
                vis = MiniCaseVisibility.EDGE_HIDDEN
            ),
            OverlayTriggerEvent.MINI_EDGE_HIDE,
            userAction = true
        )
        var last = OverlayDiagTracker.snapshotJson().getJSONObject("lastOverlayTransition")
        assertEquals("MINI_CASE/EDGE_HIDDEN", last.getString("nextState"))
        assertEquals("MINI_EDGE_HIDE", last.getString("triggerEvent"))

        OverlayDiagTracker.publishCompanion(
            snap(
                OverlayState.MINI_CASE,
                OverlayPosition.MINI_CASE,
                vis = MiniCaseVisibility.VISIBLE
            ),
            OverlayTriggerEvent.MINI_RESTORE,
            userAction = true
        )
        last = OverlayDiagTracker.snapshotJson().getJSONObject("lastOverlayTransition")
        assertEquals("MINI_CASE/VISIBLE", last.getString("nextState"))
        assertEquals("MINI_RESTORE", last.getString("triggerEvent"))
    }

    @Test
    fun callEnd_to_idle_recordsTransition() {
        OverlayDiagTracker.publishCompanion(
            snap(OverlayState.SHOWCASE, OverlayPosition.FULLSCREEN),
            OverlayTriggerEvent.ANSWER
        )
        OverlayDiagTracker.publishCompanion(
            snap(OverlayState.IDLE),
            OverlayTriggerEvent.CALL_END
        )
        val last = OverlayDiagTracker.snapshotJson().getJSONObject("lastOverlayTransition")
        assertEquals("IDLE", last.getString("nextState"))
        assertEquals("CALL_END", last.getString("triggerEvent"))
        val arr = OverlayDiagTracker.snapshotJson().getJSONArray("overlayTransitions")
        assertTrue(arr.length() >= 1)
    }
}
