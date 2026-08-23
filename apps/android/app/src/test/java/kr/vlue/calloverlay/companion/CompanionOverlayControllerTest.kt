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
        assertEquals(OverlayPosition.BELOW_COMPACT_INCOMING, c.position)
    }

    @Test
    fun requestBigPush_incomingCallUi_top() {
        val c = CompanionOverlayController()
        assertTrue(c.requestBigPush(OverlayContext.INCOMING_CALL_UI, callAlreadyAnswered = false))
        assertEquals(OverlayPosition.TOP, c.position)
    }

    @Test
    fun requestBigPush_compactIncoming_belowMini() {
        val c = CompanionOverlayController()
        assertTrue(c.requestBigPush(OverlayContext.COMPACT_INCOMING, callAlreadyAnswered = false))
        assertEquals(OverlayPosition.BELOW_COMPACT_INCOMING, c.position)
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
        assertEquals(OverlayPosition.BELOW_COMPACT_INCOMING, c.position)
    }

    /** SCREEN_OFF + INCOMING → BigPush TOP (잠금화면 패리티) */
    @Test
    fun screenOff_incoming_bigPushTop() {
        val c = CompanionOverlayController()
        c.onScreenStateChanged(ScreenState.SCREEN_OFF)
        c.onIncoming(OverlayContext.HOME_SCREEN)
        assertTrue(c.requestBigPush(OverlayContext.HOME_SCREEN, callAlreadyAnswered = false))
        assertEquals(OverlayState.BIG_PUSH, c.state)
        assertEquals(OverlayPosition.TOP, c.position)
        assertEquals(ScreenState.SCREEN_OFF, c.screenState)
    }

    /** AOD + INCOMING → BigPush TOP */
    @Test
    fun aod_incoming_bigPushTop() {
        val c = CompanionOverlayController()
        c.onScreenStateChanged(ScreenState.AOD)
        assertTrue(c.requestBigPush(OverlayContext.INCOMING_CALL_UI, callAlreadyAnswered = false))
        assertEquals(OverlayPosition.TOP, c.position)
        assertEquals(OverlayState.BIG_PUSH, c.state)
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

    /** 이미 BIG_PUSH 중 SCREEN_OFF → state 유지, position TOP */
    @Test
    fun screenOff_whileBigPush_keepsState_staysTop() {
        val c = CompanionOverlayController()
        assertTrue(c.requestBigPush(OverlayContext.HOME_SCREEN, false))
        c.onScreenStateChanged(ScreenState.AOD)
        assertEquals(OverlayState.BIG_PUSH, c.state)
        assertEquals(OverlayPosition.TOP, c.position)
    }

    @Test
    fun screenOn_afterScreenOffBigPush_restoresBelowMiniOnHome() {
        val c = CompanionOverlayController()
        assertTrue(c.requestBigPush(OverlayContext.HOME_SCREEN, false))
        c.onScreenStateChanged(ScreenState.SCREEN_OFF)
        assertEquals(OverlayPosition.TOP, c.position)
        c.onScreenStateChanged(ScreenState.SCREEN_ON)
        assertEquals(OverlayState.BIG_PUSH, c.state)
        assertEquals(OverlayPosition.BELOW_COMPACT_INCOMING, c.position)
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
        assertEquals(OverlayPosition.BELOW_COMPACT_INCOMING, c.position)
    }

    /** BELOW 핀 후에도 풀 InCallUI 확정 시 TOP 복귀 */
    @Test
    fun bigPush_clearsBelowPin_whenFullIncomingCallUi() {
        val c = CompanionOverlayController()
        assertTrue(c.requestBigPush(OverlayContext.COMPACT_INCOMING, callAlreadyAnswered = false))
        assertEquals(OverlayPosition.BELOW_COMPACT_INCOMING, c.position)
        c.updateContext(OverlayContext.INCOMING_CALL_UI)
        assertEquals(OverlayPosition.TOP, c.position)
    }

    /** 미니 컨텍스트 유지 시 BELOW 유지 */
    @Test
    fun bigPush_staysBelow_whileCompactIncomingContext() {
        val c = CompanionOverlayController()
        assertTrue(c.requestBigPush(OverlayContext.COMPACT_INCOMING, callAlreadyAnswered = false))
        assertEquals(OverlayPosition.BELOW_COMPACT_INCOMING, c.position)
        c.updateContext(OverlayContext.HOME_SCREEN)
        assertEquals(OverlayPosition.BELOW_COMPACT_INCOMING, c.position)
        c.onCallEnd()
        assertTrue(c.requestBigPush(OverlayContext.INCOMING_CALL_UI, callAlreadyAnswered = false))
        assertEquals(OverlayPosition.TOP, c.position)
    }
}
