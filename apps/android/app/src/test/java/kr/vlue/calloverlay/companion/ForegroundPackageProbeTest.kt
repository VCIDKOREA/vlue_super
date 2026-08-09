package kr.vlue.calloverlay.companion

import org.junit.Assert.assertEquals
import org.junit.Test

class ForegroundPackageProbeTest {
    @Test
    fun hun_usageInCallUi_tasksLauncher_prefersLauncher() {
        assertEquals(
            "com.sec.android.app.launcher",
            ForegroundPackageProbe.preferForegroundForOverlay(
                usagePkg = "com.samsung.android.incallui",
                tasksPkg = "com.sec.android.app.launcher"
            )
        )
    }

    @Test
    fun hun_usageInCallUi_tasksOtherApp_prefersOtherApp() {
        assertEquals(
            "com.kakao.talk",
            ForegroundPackageProbe.preferForegroundForOverlay(
                usagePkg = "com.samsung.android.incallui",
                tasksPkg = "com.kakao.talk"
            )
        )
    }

    @Test
    fun fullInCallUi_tasksInCall_keepsInCall() {
        assertEquals(
            "com.samsung.android.incallui",
            ForegroundPackageProbe.preferForegroundForOverlay(
                usagePkg = "com.samsung.android.incallui",
                tasksPkg = "com.samsung.android.incallui"
            )
        )
    }

    @Test
    fun classify_tasksInCall_isFullInCallTop() {
        assertEquals(
            ForegroundPackageProbe.RingingSurface.FULL_INCALL,
            ForegroundPackageProbe.classifyRingingSurface(
                tasksPkg = "com.samsung.android.incallui",
                recentUsage = emptyList()
            )
        )
    }

    @Test
    fun classify_tasksKakao_isHomeOrOtherBottom() {
        assertEquals(
            ForegroundPackageProbe.RingingSurface.HOME_OR_OTHER,
            ForegroundPackageProbe.classifyRingingSurface(
                tasksPkg = "com.kakao.talk",
                recentUsage = listOf("com.samsung.android.incallui" to 1000L)
            )
        )
    }

    @Test
    fun classify_tasksLauncher_isHomeOrOtherBottom() {
        assertEquals(
            ForegroundPackageProbe.RingingSurface.HOME_OR_OTHER,
            ForegroundPackageProbe.classifyRingingSurface(
                tasksPkg = "com.sec.android.app.launcher",
                recentUsage = listOf("com.samsung.android.incallui" to 2000L)
            )
        )
    }

    @Test
    fun classify_usageInCallOnly_isFullInCallTop() {
        assertEquals(
            ForegroundPackageProbe.RingingSurface.FULL_INCALL,
            ForegroundPackageProbe.classifyRingingSurface(
                tasksPkg = null,
                recentUsage = listOf("com.samsung.android.incallui" to 5_000L)
            )
        )
    }

    @Test
    fun classify_usageInCallWithRecentKakao_isHunBottom() {
        assertEquals(
            ForegroundPackageProbe.RingingSurface.HOME_OR_OTHER,
            ForegroundPackageProbe.classifyRingingSurface(
                tasksPkg = null,
                recentUsage = listOf(
                    "com.samsung.android.incallui" to 5_000L,
                    "com.kakao.talk" to 3_500L
                )
            )
        )
    }

    @Test
    fun classify_ourApp_isHomeOrOtherBottom() {
        assertEquals(
            ForegroundPackageProbe.RingingSurface.HOME_OR_OTHER,
            ForegroundPackageProbe.classifyRingingSurface(
                tasksPkg = "com.samsung.android.incallui",
                recentUsage = emptyList(),
                ourApp = true
            )
        )
    }

    @Test
    fun ringing_unknownForeground_defaultsToOtherAppBottom() {
        assertEquals(
            OverlayContext.OTHER_APP,
            OverlayContextDetector.detect(
                callPhase = OverlayContextDetector.CallPhase.RINGING
            )
        )
    }
}
