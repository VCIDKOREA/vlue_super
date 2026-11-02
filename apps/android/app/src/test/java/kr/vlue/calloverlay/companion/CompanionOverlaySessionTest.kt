package kr.vlue.calloverlay.companion

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class CompanionOverlaySessionTest {
    private val session = CompanionOverlaySession()

    @Test
    fun measuredFullscreen_usesMeasuredHeight() {
        assertEquals(2000, session.fullscreenCssHeightPx(2200, 2000, false))
    }

    @Test
    fun compactMeasured_skipsUntilWindowGrows() {
        assertNull(session.fullscreenCssHeightPx(2200, 168, false))
    }

    @Test
    fun compactMeasured_usesScreenWhenLayoutAlreadyFullscreen() {
        assertEquals(2200, session.fullscreenCssHeightPx(2200, 168, true))
    }
}
