package kr.vlue.calloverlay.companion

import org.junit.Assert.assertEquals
import org.junit.Test

class OverlayContextDetectorTest {
    @Test
    fun ringing_outgoingDialing_isTopEvenIfUnknownForeground() {
        assertEquals(
            OverlayContext.INCOMING_CALL_UI,
            OverlayContextDetector.detect(
                callPhase = OverlayContextDetector.CallPhase.RINGING,
                outgoingDialing = true
            )
        )
    }

    @Test
    fun ringing_outgoingDialing_beatsKnownOtherApp() {
        assertEquals(
            OverlayContext.INCOMING_CALL_UI,
            OverlayContextDetector.detect(
                callPhase = OverlayContextDetector.CallPhase.RINGING,
                foregroundIsKnownOtherApp = true,
                outgoingDialing = true
            )
        )
    }

    @Test
    fun ringing_unknownForeground_defaultsToIncomingCallUiTop() {
        assertEquals(
            OverlayContext.INCOMING_CALL_UI,
            OverlayContextDetector.detect(
                callPhase = OverlayContextDetector.CallPhase.RINGING
            )
        )
    }

    @Test
    fun ringing_knownOtherApp_isCompactIncoming() {
        assertEquals(
            OverlayContext.COMPACT_INCOMING,
            OverlayContextDetector.detect(
                callPhase = OverlayContextDetector.CallPhase.RINGING,
                foregroundIsKnownOtherApp = true
            )
        )
    }

    @Test
    fun ringing_inCallUi_isIncomingCallUi() {
        assertEquals(
            OverlayContext.INCOMING_CALL_UI,
            OverlayContextDetector.detect(
                callPhase = OverlayContextDetector.CallPhase.RINGING,
                foregroundIsInCallUi = true
            )
        )
    }

    @Test
    fun ringing_inCallUi_beatsKnownOther() {
        assertEquals(
            OverlayContext.INCOMING_CALL_UI,
            OverlayContextDetector.detect(
                callPhase = OverlayContextDetector.CallPhase.RINGING,
                foregroundIsInCallUi = true,
                foregroundIsKnownOtherApp = true
            )
        )
    }

    @Test
    fun samsungIncallui_package_detected() {
        assertEquals(true, OverlayContextDetector.isLikelyInCallUiPackage("com.samsung.android.incallui"))
        assertEquals(true, OverlayContextDetector.isLikelyInCallUiPackage("com.samsung.android.dialer"))
        assertEquals(true, OverlayContextDetector.isLikelyFullInCallUiPackage("com.samsung.android.incallui"))
        assertEquals(false, OverlayContextDetector.isLikelyFullInCallUiPackage("com.samsung.android.dialer"))
        assertEquals(true, OverlayContextDetector.isLikelyDialerPackage("com.samsung.android.dialer"))
        assertEquals(false, OverlayContextDetector.isLikelyDialerPackage("com.samsung.android.incallui"))
    }

    @Test
    fun offhook_unknownForeground_staysInCall() {
        assertEquals(
            OverlayContext.IN_CALL,
            OverlayContextDetector.detect(
                callPhase = OverlayContextDetector.CallPhase.OFFHOOK
            )
        )
    }

    @Test
    fun ringing_launcher_isCompactIncoming() {
        assertEquals(
            OverlayContext.COMPACT_INCOMING,
            OverlayContextDetector.detect(
                callPhase = OverlayContextDetector.CallPhase.RINGING,
                foregroundIsLauncher = true
            )
        )
    }

    @Test
    fun ringing_compactDialer_isCompactIncoming() {
        assertEquals(
            OverlayContext.COMPACT_INCOMING,
            OverlayContextDetector.detect(
                callPhase = OverlayContextDetector.CallPhase.RINGING,
                foregroundIsCompactDialer = true
            )
        )
    }

    @Test
    fun ringing_inCallUi_beatsCompactDialer() {
        assertEquals(
            OverlayContext.INCOMING_CALL_UI,
            OverlayContextDetector.detect(
                callPhase = OverlayContextDetector.CallPhase.RINGING,
                foregroundIsInCallUi = true,
                foregroundIsCompactDialer = true
            )
        )
    }

    @Test
    fun ringing_ourApp_isIncomingCallUi() {
        /* VLUE 전면 + 삼성 전체 전화 UI → TOP (하단이면 응답/종료를 가림) */
        assertEquals(
            OverlayContext.INCOMING_CALL_UI,
            OverlayContextDetector.detect(
                callPhase = OverlayContextDetector.CallPhase.RINGING,
                foregroundIsOurApp = true
            )
        )
    }
}
