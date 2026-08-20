package kr.vlue.calloverlay.companion

import org.junit.Assert.assertEquals
import org.junit.Test

class OverlayPositionManagerTest {
    @Test
    fun bigPush_home_isBelowMiniPopup() {
        assertEquals(
            OverlayPosition.BELOW_COMPACT_INCOMING,
            OverlayPositionManager.resolve(
                OverlayContext.HOME_SCREEN,
                OverlayState.BIG_PUSH,
                ScreenState.SCREEN_ON
            )
        )
    }

    @Test
    fun bigPush_otherApp_isBelowMiniPopup() {
        assertEquals(
            OverlayPosition.BELOW_COMPACT_INCOMING,
            OverlayPositionManager.resolve(
                OverlayContext.OTHER_APP,
                OverlayState.BIG_PUSH,
                ScreenState.SCREEN_ON
            )
        )
    }

    @Test
    fun bigPush_incomingCallUi_isTop() {
        assertEquals(
            OverlayPosition.TOP,
            OverlayPositionManager.resolve(
                OverlayContext.INCOMING_CALL_UI,
                OverlayState.BIG_PUSH,
                ScreenState.SCREEN_ON
            )
        )
    }

    @Test
    fun bigPush_compactIncoming_isBelowMiniPopup() {
        assertEquals(
            OverlayPosition.BELOW_COMPACT_INCOMING,
            OverlayPositionManager.resolve(
                OverlayContext.COMPACT_INCOMING,
                OverlayState.BIG_PUSH,
                ScreenState.SCREEN_ON
            )
        )
    }

    @Test
    fun bigPush_compactIncoming_screenOff_isTop() {
        assertEquals(
            OverlayPosition.TOP,
            OverlayPositionManager.resolve(
                OverlayContext.COMPACT_INCOMING,
                OverlayState.BIG_PUSH,
                ScreenState.SCREEN_OFF
            )
        )
    }

    @Test
    fun bigPush_inCall_isHidden() {
        assertEquals(
            OverlayPosition.HIDDEN,
            OverlayPositionManager.resolve(
                OverlayContext.IN_CALL,
                OverlayState.BIG_PUSH,
                ScreenState.SCREEN_ON
            )
        )
    }

    @Test
    fun bigPush_screenOff_isTop_likeIncoming() {
        assertEquals(
            OverlayPosition.TOP,
            OverlayPositionManager.resolve(
                OverlayContext.HOME_SCREEN,
                OverlayState.BIG_PUSH,
                ScreenState.SCREEN_OFF
            )
        )
    }

    @Test
    fun bigPush_aod_isTop_likeIncoming() {
        assertEquals(
            OverlayPosition.TOP,
            OverlayPositionManager.resolve(
                OverlayContext.INCOMING_CALL_UI,
                OverlayState.BIG_PUSH,
                ScreenState.AOD
            )
        )
    }

    @Test
    fun showcase_inCall_isFullscreen() {
        assertEquals(
            OverlayPosition.FULLSCREEN,
            OverlayPositionManager.resolve(
                OverlayContext.IN_CALL,
                OverlayState.SHOWCASE,
                ScreenState.SCREEN_ON
            )
        )
    }

    @Test
    fun showcase_staysFullscreen_evenIfHomeContext() {
        /* Position 은 State 따름 — HOME 컨텍스트만으로 창을 줄이지 않음 */
        assertEquals(
            OverlayPosition.FULLSCREEN,
            OverlayPositionManager.resolve(
                OverlayContext.HOME_SCREEN,
                OverlayState.SHOWCASE,
                ScreenState.SCREEN_ON
            )
        )
    }

    @Test
    fun miniCase_alwaysMini() {
        assertEquals(
            OverlayPosition.MINI_CASE,
            OverlayPositionManager.resolve(
                OverlayContext.IN_CALL,
                OverlayState.MINI_CASE,
                ScreenState.SCREEN_ON
            )
        )
    }

    @Test
    fun idle_isHidden() {
        assertEquals(
            OverlayPosition.HIDDEN,
            OverlayPositionManager.resolve(
                OverlayContext.HOME_SCREEN,
                OverlayState.IDLE,
                ScreenState.SCREEN_ON
            )
        )
    }

    @Test
    fun ringing_keepsBelowHun_whenInCallResumeFlickers() {
        assertEquals(
            OverlayContext.COMPACT_INCOMING,
            OverlayPositionManager.holdBelowCompactIncoming(
                OverlayPosition.BELOW_COMPACT_INCOMING,
                OverlayContext.COMPACT_INCOMING,
                OverlayContext.INCOMING_CALL_UI,
                ringing = true
            )
        )
        assertEquals(
            OverlayContext.COMPACT_INCOMING,
            OverlayPositionManager.holdBelowCompactIncoming(
                OverlayPosition.TOP,
                OverlayContext.COMPACT_INCOMING,
                OverlayContext.INCOMING_CALL_UI,
                ringing = true
            )
        )
        assertEquals(
            OverlayContext.COMPACT_INCOMING,
            OverlayPositionManager.holdBelowCompactIncoming(
                OverlayPosition.HIDDEN,
                OverlayContext.HOME_SCREEN,
                OverlayContext.INCOMING_CALL_UI,
                ringing = true,
                ourAppForeground = true
            )
        )
        assertEquals(
            OverlayContext.INCOMING_CALL_UI,
            OverlayPositionManager.holdBelowCompactIncoming(
                OverlayPosition.TOP,
                OverlayContext.HOME_SCREEN,
                OverlayContext.INCOMING_CALL_UI,
                ringing = true
            )
        )
        assertEquals(
            OverlayContext.INCOMING_CALL_UI,
            OverlayPositionManager.holdBelowCompactIncoming(
                OverlayPosition.BELOW_COMPACT_INCOMING,
                OverlayContext.COMPACT_INCOMING,
                OverlayContext.INCOMING_CALL_UI,
                ringing = false
            )
        )
    }
}
