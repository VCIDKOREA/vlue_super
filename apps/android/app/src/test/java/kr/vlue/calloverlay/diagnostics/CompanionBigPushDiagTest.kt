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
 * Phase 6-D/E — Companion BIG_PUSH + Permission Gate Diagnosis.
 */
class CompanionBigPushDiagTest {
    @Before
    fun setUp() {
        OverlayDiagTracker.resetAllForTest()
        CompanionBigPushDiag.reset()
    }

    @Test
    fun permissionFalse_showOverlayNotReached_isPermissionBlocked() {
        CompanionBigPushDiag.noteIncomingReceived("test")
        CompanionBigPushDiag.noteOverlayPermissionCheck(
            source = CompanionBigPushDiag.SOURCE_INCOMING_GATE,
            canDrawOverlays = false,
            callPhase = "RINGING"
        )
        val diag = CompanionBigPushDiag.diagnosisJson()
        assertEquals(
            CompanionBigPushDiag.Breakpoint.PERMISSION_BLOCKED.name,
            diag.getString("exactBreakpoint")
        )
        assertEquals("BLOCKED", diag.getJSONObject("gates").getString("permissionGate"))
        assertEquals("NOT_REACHED", diag.getJSONObject("gates").getString("showOverlayGate"))
        assertEquals("NOT_REACHED", diag.getJSONObject("gates").getString("bigPushGate"))
    }

    @Test
    fun permissionFalse_noBigPushRequestBegin() {
        CompanionBigPushDiag.noteOverlayPermissionCheck(
            source = CompanionBigPushDiag.SOURCE_INCOMING_GATE,
            canDrawOverlays = false
        )
        val codes = eventCodes()
        assertTrue(codes.contains("OVERLAY_PERMISSION_CHECK"))
        assertFalse(codes.contains("BIG_PUSH_REQUEST_BEGIN"))
        assertFalse(codes.contains("SHOW_OVERLAY_ENTER"))
    }

    @Test
    fun permissionTrue_showOverlayEnter_and_requestBegin() {
        val c = CompanionOverlayController()
        CompanionBigPushDiag.noteOverlayPermissionCheck(
            source = CompanionBigPushDiag.SOURCE_SHOW_OVERLAY_GATE,
            canDrawOverlays = true,
            callPhase = "RINGING"
        )
        CompanionBigPushDiag.noteShowOverlayEnter(false, true, false, c.snapshot())
        CompanionBigPushDiag.noteBigPushRequestBegin(c.snapshot())
        val diag = CompanionBigPushDiag.diagnosisJson()
        assertEquals("PASS", diag.getJSONObject("checklist").getString("showOverlayEnter"))
        assertEquals("PASS", diag.getJSONObject("checklist").getString("bigPushRequest"))
        assertEquals("REACHED", diag.getJSONObject("gates").getString("showOverlayGate"))
        assertEquals("PASS", diag.getJSONObject("gates").getString("permissionGate"))
    }

    @Test
    fun bigPush_acceptedFalse() {
        val c = CompanionOverlayController()
        c.onScreenStateChanged(ScreenState.SCREEN_OFF)
        CompanionBigPushDiag.noteShowOverlayEnter(false, true, false, c.snapshot())
        CompanionBigPushDiag.noteBigPushRequestBegin(c.snapshot())
        assertFalse(c.requestBigPush(OverlayContext.HOME_SCREEN, false))
        CompanionBigPushDiag.noteBigPushRequestResult(false, c.snapshot(), c.rejectedTransition)
        CompanionBigPushDiag.noteShowOverlayEarlyExit("BIG_PUSH_REJECTED", c.snapshot())
        val diag = CompanionBigPushDiag.diagnosisJson()
        assertEquals(
            CompanionBigPushDiag.Breakpoint.BIG_PUSH_REJECTED.name,
            diag.getString("exactBreakpoint")
        )
        assertEquals("REJECTED", diag.getJSONObject("gates").getString("bigPushGate"))
    }

    @Test
    fun bigPush_acceptedTrue() {
        val c = CompanionOverlayController()
        c.onIncoming(OverlayContext.INCOMING_CALL_UI)
        CompanionBigPushDiag.noteShowOverlayEnter(false, true, false, c.snapshot())
        CompanionBigPushDiag.noteBigPushRequestBegin(c.snapshot())
        assertTrue(c.requestBigPush(OverlayContext.INCOMING_CALL_UI, false))
        CompanionBigPushDiag.noteBigPushRequestResult(true, c.snapshot())
        assertEquals(
            "ACCEPTED",
            CompanionBigPushDiag.diagnosisJson().getJSONObject("gates").getString("bigPushGate")
        )
        assertEquals(OverlayPosition.TOP, c.position)
    }

    @Test
    fun attachFailure_withPermissionTrue() {
        val c = CompanionOverlayController()
        assertTrue(c.requestBigPush(OverlayContext.INCOMING_CALL_UI, false))
        CompanionBigPushDiag.noteOverlayPermissionCheck(
            source = CompanionBigPushDiag.SOURCE_ATTACH_GATE,
            canDrawOverlays = true
        )
        CompanionBigPushDiag.noteShowOverlayEnter(false, true, false, c.snapshot())
        CompanionBigPushDiag.noteBigPushRequestResult(true, c.snapshot())
        CompanionBigPushDiag.noteAttachRequest(c.snapshot(), false)
        CompanionBigPushDiag.noteAddViewBegin(c.snapshot(), 2038, 0, true)
        CompanionBigPushDiag.noteAddViewFailed(
            c.snapshot(),
            OverlayFailureReason.OEM_RESTRICTED,
            RuntimeException("denied"),
            2038,
            0,
            canDrawOverlays = true,
            oemInfo = null
        )
        val diag = CompanionBigPushDiag.diagnosisJson()
        assertEquals(
            CompanionBigPushDiag.Breakpoint.ATTACH_FAILED.name,
            diag.getString("exactBreakpoint")
        )
        assertEquals(OverlayFailureReason.OEM_RESTRICTED.name, diag.getString("failureReason"))
    }

    @Test
    fun oemRestricted_notKeptWhenPermissionFalse() {
        val c = CompanionOverlayController()
        CompanionBigPushDiag.noteShowOverlayEnter(false, true, false, c.snapshot())
        CompanionBigPushDiag.noteBigPushRequestResult(true, c.snapshot())
        CompanionBigPushDiag.noteAttachRequest(c.snapshot(), false)
        CompanionBigPushDiag.noteAddViewBegin(c.snapshot(), 2038, 0, false)
        CompanionBigPushDiag.noteAddViewFailed(
            c.snapshot(),
            OverlayFailureReason.OEM_RESTRICTED,
            RuntimeException("x"),
            2038,
            0,
            canDrawOverlays = false,
            oemInfo = null
        )
        assertEquals(
            OverlayFailureReason.PERMISSION_DENIED.name,
            CompanionBigPushDiag.diagnosisJson().getString("failureReason")
        )
    }

    @Test
    fun probeTrue_incomingFalse_keptSeparate() {
        CompanionBigPushDiag.noteOverlayPermissionCheck(
            source = CompanionBigPushDiag.SOURCE_DIAGNOSTIC_PROBE,
            canDrawOverlays = true
        )
        CompanionBigPushDiag.noteOverlayPermissionCheck(
            source = CompanionBigPushDiag.SOURCE_INCOMING_GATE,
            canDrawOverlays = false
        )
        val hist = CompanionBigPushDiag.diagnosisJson().getJSONObject("permissionHistory")
        assertTrue(hist.getJSONObject("DIAGNOSTIC_PROBE").getBoolean("canDrawOverlays"))
        assertFalse(hist.getJSONObject("INCOMING_GATE").getBoolean("canDrawOverlays"))
        assertEquals(
            CompanionBigPushDiag.Breakpoint.PERMISSION_BLOCKED.name,
            CompanionBigPushDiag.diagnosisJson().getString("exactBreakpoint")
        )
    }

    @Test
    fun probeFalse_incomingTrue_keptSeparate() {
        CompanionBigPushDiag.noteOverlayPermissionCheck(
            source = CompanionBigPushDiag.SOURCE_DIAGNOSTIC_PROBE,
            canDrawOverlays = false
        )
        CompanionBigPushDiag.noteOverlayPermissionCheck(
            source = CompanionBigPushDiag.SOURCE_INCOMING_GATE,
            canDrawOverlays = true
        )
        val c = CompanionOverlayController()
        CompanionBigPushDiag.noteShowOverlayEnter(false, true, false, c.snapshot())
        val hist = CompanionBigPushDiag.diagnosisJson().getJSONObject("permissionHistory")
        assertFalse(hist.getJSONObject("DIAGNOSTIC_PROBE").getBoolean("canDrawOverlays"))
        assertTrue(hist.getJSONObject("INCOMING_GATE").getBoolean("canDrawOverlays"))
        assertNotEquals(
            CompanionBigPushDiag.Breakpoint.PERMISSION_BLOCKED.name,
            CompanionBigPushDiag.diagnosisJson().getString("exactBreakpoint")
        )
    }

    @Test
    fun success_visible_breakpoint() {
        val c = CompanionOverlayController()
        assertTrue(c.requestBigPush(OverlayContext.INCOMING_CALL_UI, false))
        CompanionBigPushDiag.noteShowOverlayEnter(false, true, false, c.snapshot())
        CompanionBigPushDiag.noteBigPushRequestResult(true, c.snapshot())
        CompanionBigPushDiag.noteAttachRequest(c.snapshot(), false)
        CompanionBigPushDiag.noteAddViewBegin(c.snapshot(), 2038, 0, true)
        CompanionBigPushDiag.noteAddViewSuccess(c.snapshot())
        CompanionBigPushDiag.noteLayoutRequest(c.snapshot())
        CompanionBigPushDiag.noteLayoutApplied(c.snapshot())
        CompanionBigPushDiag.noteBigPushVisible(c.snapshot())
        val diag = CompanionBigPushDiag.diagnosisJson()
        assertEquals(
            CompanionBigPushDiag.Breakpoint.BIG_PUSH_VISIBLE.name,
            diag.getString("exactBreakpoint")
        )
        assertEquals("PASS", diag.getJSONObject("gates").getString("visible"))
    }

    @Test
    fun alreadyAnswered_earlyExit() {
        CompanionBigPushDiag.noteShowOverlayEnter(
            true,
            true,
            false,
            CompanionOverlayController().snapshot()
        )
        CompanionBigPushDiag.noteShowOverlayEarlyExit("ALREADY_ANSWERED")
        assertEquals(
            CompanionBigPushDiag.Breakpoint.SHOW_OVERLAY_EARLY_EXIT.name,
            CompanionBigPushDiag.diagnosisJson().getString("exactBreakpoint")
        )
    }

    @Test
    fun answer_showcase_regression() {
        val c = CompanionOverlayController()
        c.onIncoming(OverlayContext.INCOMING_CALL_UI)
        c.requestBigPush(OverlayContext.INCOMING_CALL_UI, false)
        c.onAnswer(OverlayContext.IN_CALL)
        assertEquals(OverlayState.SHOWCASE, c.state)
        assertEquals(OverlayPosition.FULLSCREEN, c.position)
    }

    @Test
    fun position_rules_unchanged() {
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
    }

    @Test
    fun snapshot_includes_permission_gate() {
        CompanionBigPushDiag.noteOverlayPermissionCheck(
            source = CompanionBigPushDiag.SOURCE_INCOMING_GATE,
            canDrawOverlays = true
        )
        val snap = OverlayDiagTracker.snapshotJson().getJSONObject("companionBigPushDiagnosis")
        assertTrue(snap.has("permissionGate"))
        assertTrue(snap.has("permissionHistory"))
        assertTrue(snap.has("gates"))
        assertTrue(snap.getBoolean("architectureFreeze"))
    }

    private fun eventCodes(): List<String> {
        val arr = CompanionBigPushDiag.diagnosisJson().getJSONArray("events")
        return (0 until arr.length()).map { arr.getJSONObject(it).getString("code") }
    }
}
