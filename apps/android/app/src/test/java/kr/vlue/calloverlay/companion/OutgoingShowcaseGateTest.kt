package kr.vlue.calloverlay.companion

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class OutgoingShowcaseGateTest {

    @Test
    fun outgoingOffhookAlone_staysOnBigPush() {
        assertFalse(
            OutgoingShowcaseGate.shouldEnterShowcaseNow(
                outgoing = true,
                remoteConnected = false,
                inCallOverlayState = false,
                telephonyOffhook = true
            )
        )
    }

    @Test
    fun outgoingRemoteConnected_entersShowcase() {
        assertTrue(
            OutgoingShowcaseGate.shouldEnterShowcaseNow(
                outgoing = true,
                remoteConnected = true,
                inCallOverlayState = false,
                telephonyOffhook = true
            )
        )
    }

    @Test
    fun incomingOffhook_entersShowcase() {
        assertTrue(
            OutgoingShowcaseGate.shouldEnterShowcaseNow(
                outgoing = false,
                remoteConnected = false,
                inCallOverlayState = false,
                telephonyOffhook = true
            )
        )
    }

    @Test
    fun alreadyInShowcaseOrMini_entersShowcase() {
        assertTrue(
            OutgoingShowcaseGate.shouldEnterShowcaseNow(
                outgoing = true,
                remoteConnected = false,
                inCallOverlayState = true,
                telephonyOffhook = false
            )
        )
    }
}
