package kr.vlue.calloverlay.companion

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class CompanionOverlayControllerTest {
    @Test
    fun requestBigPush_whileRinging_allows() {
        val c = CompanionOverlayController()
        c.onIncoming(OverlayContext.HOME_SCREEN)
        assertTrue(c.requestBigPush(OverlayContext.HOME_SCREEN, callAlreadyAnswered = false))
        assertEquals(OverlayState.BIG_PUSH, c.state)
        assertEquals(OverlayPosition.BOTTOM, c.position)
    }

    @Test
    fun requestBigPush_incomingCallUi_top() {
        val c = CompanionOverlayController()
        assertTrue(c.requestBigPush(OverlayContext.INCOMING_CALL_UI, callAlreadyAnswered = false))
        assertEquals(OverlayPosition.TOP, c.position)
    }

    @Test
    fun answerBeforeBigPush_rejectsBigPush() {
        val c = CompanionOverlayController()
        assertFalse(c.requestBigPush(OverlayContext.HOME_SCREEN, callAlreadyAnswered = true))
        assertEquals(OverlayState.IDLE, c.state)
    }

    /** SCREEN_ON + INCOMING → BigPush 가능 */
    @Test
    fun screenOn_incoming_allowsBigPush() {
        val c = CompanionOverlayController()
        c.onScreenStateChanged(ScreenState.SCREEN_ON)
        c.onIncoming(OverlayContext.HOME_SCREEN)
        assertTrue(c.requestBigPush(OverlayContext.HOME_SCREEN, callAlreadyAnswered = false))
        assertEquals(OverlayState.BIG_PUSH, c.state)
        assertEquals(OverlayPosition.BOTTOM, c.position)
    }

    /** SCREEN_OFF + INCOMING → BigPush HIDDEN (생성 거부, state IDLE) */
    @Test
    fun screenOff_incoming_bigPushHidden() {
        val c = CompanionOverlayController()
        c.onScreenStateChanged(ScreenState.SCREEN_OFF)
        c.onIncoming(OverlayContext.HOME_SCREEN)
        assertFalse(c.requestBigPush(OverlayContext.HOME_SCREEN, callAlreadyAnswered = false))
        assertEquals(OverlayState.IDLE, c.state)
        assertEquals(OverlayPosition.HIDDEN, c.position)
        assertEquals(ScreenState.SCREEN_OFF, c.screenState)
    }

    /** AOD + INCOMING → BigPush HIDDEN */
    @Test
    fun aod_incoming_bigPushHidden() {
        val c = CompanionOverlayController()
        c.onScreenStateChanged(ScreenState.AOD)
        assertFalse(c.requestBigPush(OverlayContext.INCOMING_CALL_UI, callAlreadyAnswered = false))
        assertEquals(OverlayPosition.HIDDEN, c.position)
        assertEquals(OverlayState.IDLE, c.state)
    }

    /** SCREEN_OFF + SHOWCASE → state 유지, FULLSCREEN position 유지 */
    @Test
    fun screenOff_whileShowcase_keepsShowcase() {
        val c = CompanionOverlayController()
        c.onAnswer(OverlayContext.IN_CALL)
        assertEquals(OverlayState.SHOWCASE, c.state)
        c.onScreenStateChanged(ScreenState.SCREEN_OFF)
        assertEquals(OverlayState.SHOWCASE, c.state)
        assertEquals(OverlayPosition.FULLSCREEN, c.position)
        assertEquals(ScreenState.SCREEN_OFF, c.screenState)
    }

    /** SCREEN_OFF + MINI_CASE → state 유지 */
    @Test
    fun screenOff_whileMini_keepsMini() {
        val c = CompanionOverlayController()
        c.onAnswer(OverlayContext.IN_CALL)
        c.onMinimize(OverlayContext.MINIMIZED)
        c.onScreenStateChanged(ScreenState.SCREEN_OFF)
        assertEquals(OverlayState.MINI_CASE, c.state)
        assertEquals(OverlayPosition.MINI_CASE, c.position)
    }

    /** 이미 BIG_PUSH 중 SCREEN_OFF → state 유지, position만 HIDDEN (IDLE 전이 금지) */
    @Test
    fun screenOff_whileBigPush_keepsState_hidesPosition() {
        val c = CompanionOverlayController()
        assertTrue(c.requestBigPush(OverlayContext.HOME_SCREEN, false))
        c.onScreenStateChanged(ScreenState.AOD)
        assertEquals(OverlayState.BIG_PUSH, c.state)
        assertEquals(OverlayPosition.HIDDEN, c.position)
    }

    @Test
    fun screenOn_afterHiddenBigPush_restoresBottom() {
        val c = CompanionOverlayController()
        assertTrue(c.requestBigPush(OverlayContext.HOME_SCREEN, false))
        c.onScreenStateChanged(ScreenState.SCREEN_OFF)
        assertEquals(OverlayPosition.HIDDEN, c.position)
        c.onScreenStateChanged(ScreenState.SCREEN_ON)
        assertEquals(OverlayState.BIG_PUSH, c.state)
        assertEquals(OverlayPosition.BOTTOM, c.position)
    }

    @Test
    fun onAnswer_fromBigPush_goesShowcaseFullscreen_immediately() {
        val c = CompanionOverlayController()
        c.requestBigPush(OverlayContext.INCOMING_CALL_UI, false)
        c.onAnswer(OverlayContext.IN_CALL)
        assertEquals(OverlayState.SHOWCASE, c.state)
        assertEquals(OverlayPosition.FULLSCREEN, c.position)
        assertTrue(c.lastTransition!!.contains("independent of BigPush"))
    }

    @Test
    fun onAnswer_fromIdle_goesShowcase_skipBigPush() {
        val c = CompanionOverlayController()
        c.onAnswer(OverlayContext.IN_CALL)
        assertEquals(OverlayState.SHOWCASE, c.state)
        assertEquals(OverlayPosition.FULLSCREEN, c.position)
    }

    @Test
    fun minimize_and_restore() {
        val c = CompanionOverlayController()
        c.onAnswer(OverlayContext.IN_CALL)
        c.onMinimize(OverlayContext.MINIMIZED)
        assertEquals(OverlayState.MINI_CASE, c.state)
        assertEquals(MiniCaseVisibility.VISIBLE, c.miniCaseVisibility)
        c.onRestoreShowcase(OverlayContext.IN_CALL)
        assertEquals(OverlayState.SHOWCASE, c.state)
        assertEquals(OverlayPosition.FULLSCREEN, c.position)
    }

    @Test
    fun mini_visible_default_onMinimize() {
        val c = CompanionOverlayController()
        c.onAnswer(OverlayContext.IN_CALL)
        c.onMinimize(OverlayContext.MINIMIZED)
        assertEquals(OverlayState.MINI_CASE, c.state)
        assertEquals(OverlayPosition.MINI_CASE, c.position)
        assertEquals(MiniCaseVisibility.VISIBLE, c.miniCaseVisibility)
    }

    @Test
    fun dragEnd_edgeHidden_keepsMiniCase() {
        val c = CompanionOverlayController()
        c.onAnswer(OverlayContext.IN_CALL)
        c.onMinimize(OverlayContext.MINIMIZED)
        c.onMiniVisibilityChanged(MiniCaseVisibility.EDGE_HIDDEN)
        assertEquals(OverlayState.MINI_CASE, c.state)
        assertEquals(OverlayPosition.MINI_CASE, c.position)
        assertEquals(MiniCaseVisibility.EDGE_HIDDEN, c.miniCaseVisibility)
    }

    @Test
    fun edgeHidden_tap_toVisible() {
        val c = CompanionOverlayController()
        c.onAnswer(OverlayContext.IN_CALL)
        c.onMinimize(OverlayContext.MINIMIZED)
        c.onMiniEdgeHidden()
        c.onMiniEdgeReveal()
        assertEquals(MiniCaseVisibility.VISIBLE, c.miniCaseVisibility)
        assertEquals(OverlayState.MINI_CASE, c.state)
    }

    @Test
    fun edgeHidden_callEnd_clearsToIdle() {
        val c = CompanionOverlayController()
        c.onAnswer(OverlayContext.IN_CALL)
        c.onMinimize(OverlayContext.MINIMIZED)
        c.onMiniVisibilityChanged(MiniCaseVisibility.EDGE_HIDDEN)
        c.onCallEnd()
        assertEquals(OverlayState.IDLE, c.state)
        assertEquals(OverlayPosition.HIDDEN, c.position)
        assertEquals(MiniCaseVisibility.VISIBLE, c.miniCaseVisibility)
    }

    @Test
    fun miniVisibility_ignored_whenNotMini() {
        val c = CompanionOverlayController()
        c.onAnswer(OverlayContext.IN_CALL)
        c.onMiniVisibilityChanged(MiniCaseVisibility.EDGE_HIDDEN)
        assertEquals(OverlayState.SHOWCASE, c.state)
        assertEquals(MiniCaseVisibility.VISIBLE, c.miniCaseVisibility)
        assertTrue(c.rejectedTransition!!.contains("onMiniVisibilityChanged rejected"))
    }

    @Test
    fun callEnd_clearsToIdle() {
        val c = CompanionOverlayController()
        c.requestBigPush(OverlayContext.HOME_SCREEN, false)
        c.onAnswer(OverlayContext.IN_CALL)
        c.onCallEnd()
        assertEquals(OverlayState.IDLE, c.state)
        assertEquals(OverlayPosition.HIDDEN, c.position)
    }

    @Test
    fun keypad_forcesMiniFromShowcase() {
        val c = CompanionOverlayController()
        c.onAnswer(OverlayContext.IN_CALL)
        c.onKeypad(true)
        assertEquals(OverlayState.MINI_CASE, c.state)
        assertEquals(OverlayContext.KEYPAD, c.context)
    }

    /** 이전 통화 MINI 잔존 → 새 RINGING 시 BigPush 허용 */
    @Test
    fun requestBigPush_resetsStaleMiniForNewRinging() {
        val c = CompanionOverlayController()
        c.onAnswer(OverlayContext.IN_CALL)
        c.onMinimize(OverlayContext.MINIMIZED)
        assertEquals(OverlayState.MINI_CASE, c.state)
        assertTrue(c.requestBigPush(OverlayContext.INCOMING_CALL_UI, callAlreadyAnswered = false))
        assertEquals(OverlayState.BIG_PUSH, c.state)
        assertEquals(OverlayPosition.TOP, c.position)
    }
}
