package kr.vlue.calloverlay.companion

import org.junit.Assert.assertEquals
import org.junit.Test

class OverlayPositionManagerTest {
    @Test
    fun bigPush_home_isBottom() {
        assertEquals(
            OverlayPosition.BOTTOM,
            OverlayPositionManager.resolve(OverlayContext.HOME_SCREEN, OverlayState.BIG_PUSH)
        )
    }

    @Test
    fun bigPush_otherApp_isBottom() {
        assertEquals(
            OverlayPosition.BOTTOM,
            OverlayPositionManager.resolve(OverlayContext.OTHER_APP, OverlayState.BIG_PUSH)
        )
    }

    @Test
    fun bigPush_incomingCallUi_isTop() {
        assertEquals(
            OverlayPosition.TOP,
            OverlayPositionManager.resolve(OverlayContext.INCOMING_CALL_UI, OverlayState.BIG_PUSH)
        )
    }

    @Test
    fun bigPush_inCall_isHidden() {
        assertEquals(
            OverlayPosition.HIDDEN,
            OverlayPositionManager.resolve(OverlayContext.IN_CALL, OverlayState.BIG_PUSH)
        )
    }

    @Test
    fun showcase_inCall_isTop() {
        assertEquals(
            OverlayPosition.TOP,
            OverlayPositionManager.resolve(OverlayContext.IN_CALL, OverlayState.SHOWCASE)
        )
    }

    @Test
    fun showcase_home_suggestsMini() {
        assertEquals(
            OverlayPosition.MINI_CASE,
            OverlayPositionManager.resolve(OverlayContext.HOME_SCREEN, OverlayState.SHOWCASE)
        )
    }

    @Test
    fun miniCase_alwaysMini() {
        assertEquals(
            OverlayPosition.MINI_CASE,
            OverlayPositionManager.resolve(OverlayContext.IN_CALL, OverlayState.MINI_CASE)
        )
    }

    @Test
    fun idle_isHidden() {
        assertEquals(
            OverlayPosition.HIDDEN,
            OverlayPositionManager.resolve(OverlayContext.HOME_SCREEN, OverlayState.IDLE)
        )
    }
}
