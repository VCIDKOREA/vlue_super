package kr.vlue.calloverlay.dcp

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class CallPathVerificationEngineTest {
    @Test
    fun all_clear_is_normal() {
        val v = CallPathVerificationEngine.evaluate(CallPathSignals())
        assertFalse(v.isAbnormal)
        assertEquals("normal", v.routeQuery)
    }

    @Test
    fun overlay_in_use_is_abnormal() {
        val v = CallPathVerificationEngine.evaluate(
            CallPathSignals(otherOverlayAppsInUse = listOf("com.anydesk.anydeskandroid"))
        )
        assertTrue(v.isAbnormal)
        assertTrue(v.reasons.any { it.startsWith("overlay_in_use:") })
    }

    @Test
    fun suspicious_accessibility_is_abnormal() {
        val v = CallPathVerificationEngine.evaluate(
            CallPathSignals(suspiciousAccessibilityPackages = listOf("com.teamviewer.host.market"))
        )
        assertTrue(v.isAbnormal)
        assertTrue(v.reasons.any { it.startsWith("accessibility_suspicious:") })
    }

    @Test
    fun incall_occluded_is_abnormal() {
        val v = CallPathVerificationEngine.evaluate(
            CallPathSignals(
                inCallUiOccludedByOtherApp = true,
                occludingPackage = "com.evil.overlay"
            )
        )
        assertTrue(v.isAbnormal)
        assertTrue(v.reasons.any { it.contains("incall_occluded") })
    }

    @Test
    fun trusted_packages_are_not_suspicious() {
        assertTrue(
            CallPathVerificationEngine.isTrustedSystemOrSelf(
                "com.samsung.android.incallui",
                "kr.vlue.calloverlay"
            )
        )
        assertFalse(
            CallPathVerificationEngine.isSuspiciousAccessibilityPackage(
                "com.google.android.marvin.talkback",
                "kr.vlue.calloverlay"
            )
        )
        assertTrue(
            CallPathVerificationEngine.isSuspiciousAccessibilityPackage(
                "com.anydesk.anydeskandroid",
                "kr.vlue.calloverlay"
            )
        )
    }

    @Test
    fun mock_session_overrides_live_verify() {
        CallPathSession.clear()
        CallPathSession.armMock(abnormal = true)
        val abnormal = CallPathSession.consumeMock()
        assertTrue(abnormal != null && abnormal.isAbnormal)
        assertTrue(abnormal!!.fromMock)

        CallPathSession.armMock(abnormal = false)
        val normal = CallPathSession.consumeMock()
        assertTrue(normal != null && !normal.isAbnormal)
        CallPathSession.clear()
    }
}
