package kr.vlue.calloverlay.companion

import org.junit.Assert.assertEquals
import org.junit.Test

class OverlayContextDetectorTest {
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
    fun ringing_knownOtherApp_isOtherApp() {
        assertEquals(
            OverlayContext.OTHER_APP,
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
    fun ringing_launcher_isHomeScreen() {
        assertEquals(
            OverlayContext.HOME_SCREEN,
            OverlayContextDetector.detect(
                callPhase = OverlayContextDetector.CallPhase.RINGING,
                foregroundIsLauncher = true
            )
        )
    }

    @Test
    fun ringing_ourApp_isHomeScreen() {
        assertEquals(
            OverlayContext.HOME_SCREEN,
            OverlayContextDetector.detect(
                callPhase = OverlayContextDetector.CallPhase.RINGING,
                foregroundIsOurApp = true
            )
        )
    }
}
