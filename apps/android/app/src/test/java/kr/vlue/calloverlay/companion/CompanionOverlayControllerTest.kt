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

    @Test
    fun onAnswer_fromBigPush_goesShowcase() {
        val c = CompanionOverlayController()
        c.requestBigPush(OverlayContext.INCOMING_CALL_UI, false)
        c.onAnswer(OverlayContext.IN_CALL)
        assertEquals(OverlayState.SHOWCASE, c.state)
        assertEquals(OverlayPosition.TOP, c.position)
    }

    @Test
    fun onAnswer_fromIdle_goesShowcase_skipBigPush() {
        val c = CompanionOverlayController()
        c.onAnswer(OverlayContext.IN_CALL)
        assertEquals(OverlayState.SHOWCASE, c.state)
    }

    @Test
    fun minimize_and_restore() {
        val c = CompanionOverlayController()
        c.onAnswer(OverlayContext.IN_CALL)
        c.onMinimize(OverlayContext.MINIMIZED)
        assertEquals(OverlayState.MINI_CASE, c.state)
        c.onRestoreShowcase(OverlayContext.IN_CALL)
        assertEquals(OverlayState.SHOWCASE, c.state)
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
}
