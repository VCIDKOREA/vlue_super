package kr.vlue.calloverlay.dcp

import kr.vlue.calloverlay.companion.OverlayState
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class DcpPopupPolicyTest {
    @Test
    fun ringingBigPush_doesNotShowPopup() {
        assertFalse(
            DcpPopupPolicy.shouldShow(
                route = "normal",
                overlayState = OverlayState.BIG_PUSH,
                popupOnlyTest = false
            )
        )
        assertFalse(
            DcpPopupPolicy.shouldShow(
                route = "abnormal",
                overlayState = OverlayState.BIG_PUSH,
                popupOnlyTest = false
            )
        )
    }

    @Test
    fun answeredShowcase_showsPopup() {
        assertTrue(
            DcpPopupPolicy.shouldShow(
                route = "normal",
                overlayState = OverlayState.SHOWCASE,
                popupOnlyTest = false,
                callAnswered = true
            )
        )
        assertTrue(
            DcpPopupPolicy.shouldShow(
                route = "abnormal",
                overlayState = OverlayState.SHOWCASE,
                popupOnlyTest = false,
                callAnswered = true
            )
        )
    }

    @Test
    fun answeredBigPush_allowsAtomicPopupTransition() {
        assertTrue(
            DcpPopupPolicy.shouldShow(
                route = "abnormal",
                overlayState = OverlayState.BIG_PUSH,
                popupOnlyTest = false,
                pathVerifyAbnormal = true,
                callAnswered = true
            )
        )
    }

    @Test
    fun miniCase_doesNotLockOtherApps() {
        assertFalse(
            DcpPopupPolicy.shouldShow(
                route = "normal",
                overlayState = OverlayState.MINI_CASE,
                popupOnlyTest = false
            )
        )
    }

    @Test
    fun settingsTest_showsPopupOnly() {
        assertTrue(
            DcpPopupPolicy.shouldShow(
                route = "normal",
                overlayState = OverlayState.IDLE,
                popupOnlyTest = true
            )
        )
    }

    @Test
    fun nonDcpRoute_neverShows() {
        assertFalse(
            DcpPopupPolicy.shouldShow(
                route = "",
                overlayState = OverlayState.SHOWCASE,
                popupOnlyTest = true
            )
        )
    }

    @Test
    fun pathVerifyAbnormal_doesNotOverlapRingingBigPush() {
        assertFalse(
            DcpPopupPolicy.shouldShow(
                route = "abnormal",
                overlayState = OverlayState.BIG_PUSH,
                popupOnlyTest = false,
                pathVerifyAbnormal = true,
                callAnswered = false
            )
        )
        assertFalse(
            DcpPopupPolicy.shouldShow(
                route = "abnormal",
                overlayState = OverlayState.BIG_PUSH,
                popupOnlyTest = false,
                pathVerifyAbnormal = false
            )
        )
    }
}
