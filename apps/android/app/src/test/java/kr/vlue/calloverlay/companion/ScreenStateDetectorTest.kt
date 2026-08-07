package kr.vlue.calloverlay.companion

import org.junit.Assert.assertEquals
import org.junit.Test

class ScreenStateDetectorTest {
    @Test
    fun interactive_isScreenOn() {
        assertEquals(
            ScreenState.SCREEN_ON,
            ScreenStateDetector.resolve(interactive = true, dreaming = false)
        )
        assertEquals(
            ScreenState.SCREEN_ON,
            ScreenStateDetector.resolve(interactive = true, dreaming = true)
        )
    }

    @Test
    fun notInteractive_notDreaming_isScreenOff() {
        assertEquals(
            ScreenState.SCREEN_OFF,
            ScreenStateDetector.resolve(interactive = false, dreaming = false)
        )
    }

    @Test
    fun notInteractive_dreaming_isAod() {
        assertEquals(
            ScreenState.AOD,
            ScreenStateDetector.resolve(interactive = false, dreaming = true)
        )
    }
}
