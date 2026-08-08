package kr.vlue.calloverlay.diagnostics

import kr.vlue.calloverlay.companion.CompanionOverlayController
import kr.vlue.calloverlay.companion.OverlayContext
import kr.vlue.calloverlay.companion.OverlayPosition
import kr.vlue.calloverlay.companion.OverlayPositionManager
import kr.vlue.calloverlay.companion.OverlayState
import kr.vlue.calloverlay.companion.ScreenState
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

/**
 * Phase 6-D — Companion BIG_PUSH Diagnosis (관찰 전용 · Architecture Freeze).
 */
class CompanionBigPushDiagTest {
    @Before
    fun setUp() {
        OverlayDiagTracker.resetAllForTest()
        CompanionBigPushDiag.reset()
    }

    @Test
    fun requestBigPush_accepted_recordsResult() {
        val c = CompanionOverlayController()
        c.onIncoming(OverlayContext.INCOMING_CALL_UI)
        CompanionBigPushDiag.noteShowOverlayEnter(
            answered = false,
            canDrawOverlays = true,
            attached = false,
            snap = c.snapshot()
        )
        CompanionBigPushDiag.noteBigPushRequestBegin(c.snapshot())
        val ok = c.requestBigPush(OverlayContext.INCOMING_CALL_UI, callAlreadyAnswered = false)
        assertTrue(ok)
        CompanionBigPushDiag.noteBigPushRequestResult(true, c.snapshot())
        val diag = CompanionBigPushDiag.diagnosisJson()
        assertEquals("PASS", diag.getJSONObject("checklist").getString("bigPushAccepted"))
        assertEquals(OverlayState.BIG_PUSH, c.state)
        assertEquals(OverlayPosition.TOP, c.position)
    }

    @Test
    fun requestBigPush_rejected_whenAlreadyAnsweredPath() {
        CompanionBigPushDiag.noteShowOverlayEnter(
            answered = true,
            canDrawOverlays = true,
            attached = false,
            snap = CompanionOverlayController().snapshot()
        )
        CompanionBigPushDiag.noteShowOverlayEarlyExit("ALREADY_ANSWERED")
        CompanionBigPushDiag.noteBigPushSkipped("ALREADY_ANSWERED")
        assertEquals(
            CompanionBigPushDiag.Breakpoint.SHOW_OVERLAY_EARLY_EXIT.name,
            CompanionBigPushDiag.diagnosisJson().getString("exactBreakpoint")
        )
    }

    @Test
    fun screenOff_rejection_mapsToPolicy() {
        val c = CompanionOverlayController()
        c.onScreenStateChanged(ScreenState.SCREEN_OFF)
        CompanionBigPushDiag.noteShowOverlayEnter(false, true, false, c.snapshot())
        CompanionBigPushDiag.noteBigPushRequestBegin(c.snapshot())
        val ok = c.requestBigPush(OverlayContext.HOME_SCREEN, callAlreadyAnswered = false)
        assertFalse(ok)
        CompanionBigPushDiag.noteBigPushRequestResult(
            false,
            c.snapshot(),
            rejectReason = c.rejectedTransition
        )
        CompanionBigPushDiag.noteShowOverlayEarlyExit("BIG_PUSH_REJECTED", c.snapshot())
        val diag = CompanionBigPushDiag.diagnosisJson()
        assertEquals(
            CompanionBigPushDiag.Breakpoint.BIG_PUSH_REQUEST_REJECTED.name,
            diag.getString("exactBreakpoint")
        )
        assertEquals(
            OverlayFailureReason.SCREEN_OFF_POLICY.name,
            diag.getString("failureReason")
        )
    }

    @Test
    fun addView_success_and_layout_visible() {
        val c = CompanionOverlayController()
        c.onIncoming(OverlayContext.INCOMING_CALL_UI)
        assertTrue(c.requestBigPush(OverlayContext.INCOMING_CALL_UI, false))
        CompanionBigPushDiag.noteShowOverlayEnter(false, true, false, c.snapshot())
        CompanionBigPushDiag.noteBigPushRequestBegin(c.snapshot())
        CompanionBigPushDiag.noteBigPushRequestResult(true, c.snapshot())
        CompanionBigPushDiag.noteAttachRequest(c.snapshot(), attached = false)
        CompanionBigPushDiag.noteAddViewBegin(c.snapshot(), 2038, 0, true)
        CompanionBigPushDiag.noteAddViewSuccess(c.snapshot())
        CompanionBigPushDiag.noteLayoutRequest(c.snapshot())
        CompanionBigPushDiag.noteLayoutApplied(c.snapshot())
        CompanionBigPushDiag.noteBigPushVisible(c.snapshot())
        val diag = CompanionBigPushDiag.diagnosisJson()
        assertEquals(
            CompanionBigPushDiag.Breakpoint.BIG_PUSH_SUCCESS.name,
            diag.getString("exactBreakpoint")
        )
        assertEquals("PASS", diag.getJSONObject("checklist").getString("bigPushVisible"))
    }

    @Test
    fun addView_failure_setsBreakpointAndEvidence() {
        val c = CompanionOverlayController()
        c.onIncoming(OverlayContext.INCOMING_CALL_UI)
        assertTrue(c.requestBigPush(OverlayContext.INCOMING_CALL_UI, false))
        CompanionBigPushDiag.noteShowOverlayEnter(false, true, false, c.snapshot())
        CompanionBigPushDiag.noteBigPushRequestResult(true, c.snapshot())
        CompanionBigPushDiag.noteAttachRequest(c.snapshot(), false)
        CompanionBigPushDiag.noteAddViewBegin(c.snapshot(), 2038, 0, true)
        CompanionBigPushDiag.noteAddViewFailed(
            snap = c.snapshot(),
            reason = OverlayFailureReason.OEM_RESTRICTED,
            error = RuntimeException("permission denied for window type"),
            windowType = 2038,
            layoutFlags = 0,
            canDrawOverlays = true,
            oemInfo = null
        )
        val diag = CompanionBigPushDiag.diagnosisJson()
        assertEquals(
            CompanionBigPushDiag.Breakpoint.BIG_PUSH_ADD_VIEW_FAILED.name,
            diag.getString("exactBreakpoint")
        )
        assertEquals(OverlayFailureReason.OEM_RESTRICTED.name, diag.getString("failureReason"))
        assertTrue(diag.has("samsungEvidence"))
        assertEquals(
            "RuntimeException",
            diag.getJSONObject("samsungEvidence").getString("exceptionClass").substringAfterLast('.')
        )
    }

    @Test
    fun layout_failure_breakpoint() {
        val c = CompanionOverlayController()
        assertTrue(c.requestBigPush(OverlayContext.HOME_SCREEN, false))
        CompanionBigPushDiag.noteShowOverlayEnter(false, true, false, c.snapshot())
        CompanionBigPushDiag.noteBigPushRequestResult(true, c.snapshot())
        CompanionBigPushDiag.noteAttachRequest(c.snapshot(), false)
        CompanionBigPushDiag.noteAddViewBegin(c.snapshot(), 2038, 0, true)
        CompanionBigPushDiag.noteAddViewSuccess(c.snapshot())
        CompanionBigPushDiag.noteLayoutRequest(c.snapshot())
        CompanionBigPushDiag.noteLayoutFailed(
            c.snapshot(),
            OverlayFailureReason.WINDOW_REJECTED,
            RuntimeException("layout fail")
        )
        assertEquals(
            CompanionBigPushDiag.Breakpoint.BIG_PUSH_LAYOUT_FAILED.name,
            CompanionBigPushDiag.diagnosisJson().getString("exactBreakpoint")
        )
    }

    @Test
    fun hun_is_not_companion_bigPush() {
        CompanionBigPushDiag.noteIncomingReceived("test")
        CompanionBigPushDiag.noteSystemHunPosted()
        val diag = CompanionBigPushDiag.diagnosisJson()
        assertTrue(diag.getBoolean("hunIsNotCompanionBigPush"))
        assertEquals("PASS", diag.getJSONObject("checklist").getString("systemHunPosted"))
        assertEquals("FAIL", diag.getJSONObject("checklist").getString("bigPushVisible"))
        assertNotEquals(
            CompanionBigPushDiag.Breakpoint.BIG_PUSH_SUCCESS.name,
            diag.getString("exactBreakpoint")
        )
    }

    @Test
    fun position_rules_screenOn() {
        assertEquals(
            OverlayPosition.TOP,
            OverlayPositionManager.resolve(
                OverlayContext.INCOMING_CALL_UI,
                OverlayState.BIG_PUSH,
                ScreenState.SCREEN_ON
            )
        )
        assertEquals(
            OverlayPosition.BOTTOM,
            OverlayPositionManager.resolve(
                OverlayContext.HOME_SCREEN,
                OverlayState.BIG_PUSH,
                ScreenState.SCREEN_ON
            )
        )
        assertEquals(
            OverlayPosition.HIDDEN,
            OverlayPositionManager.resolve(
                OverlayContext.INCOMING_CALL_UI,
                OverlayState.BIG_PUSH,
                ScreenState.SCREEN_OFF
            )
        )
    }

    @Test
    fun answer_showcase_regression_controller() {
        val c = CompanionOverlayController()
        c.onIncoming(OverlayContext.INCOMING_CALL_UI)
        c.requestBigPush(OverlayContext.INCOMING_CALL_UI, false)
        c.onAnswer(OverlayContext.IN_CALL)
        assertEquals(OverlayState.SHOWCASE, c.state)
        assertEquals(OverlayPosition.FULLSCREEN, c.position)
    }

    @Test
    fun single_window_diagnosis_in_snapshot() {
        CompanionBigPushDiag.noteIncomingReceived("t")
        val snap = OverlayDiagTracker.snapshotJson()
        assertTrue(snap.has("companionBigPushDiagnosis"))
        assertTrue(snap.getJSONObject("companionBigPushDiagnosis").getBoolean("architectureFreeze"))
    }

    @Test
    fun showOverlay_not_reached_breakpoint() {
        CompanionBigPushDiag.noteIncomingReceived("only")
        assertEquals(
            CompanionBigPushDiag.Breakpoint.SHOW_OVERLAY_NOT_REACHED.name,
            CompanionBigPushDiag.diagnosisJson().getString("exactBreakpoint")
        )
    }

    @Test
    fun attach_not_called_after_accept() {
        val c = CompanionOverlayController()
        assertTrue(c.requestBigPush(OverlayContext.INCOMING_CALL_UI, false))
        CompanionBigPushDiag.noteShowOverlayEnter(false, true, false, c.snapshot())
        CompanionBigPushDiag.noteBigPushRequestResult(true, c.snapshot())
        assertEquals(
            CompanionBigPushDiag.Breakpoint.BIG_PUSH_ATTACH_NOT_CALLED.name,
            CompanionBigPushDiag.diagnosisJson().getString("exactBreakpoint")
        )
    }
}
