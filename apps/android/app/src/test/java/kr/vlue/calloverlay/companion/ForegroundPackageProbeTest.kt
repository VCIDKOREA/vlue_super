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
    fun noTasks_usageInCallUi_returnsNull_forBottomDefault() {
        assertEquals(
            null,
            ForegroundPackageProbe.preferForegroundForOverlay(
                usagePkg = "com.samsung.android.incallui",
                tasksPkg = null
            )
        )
    }

    @Test
    fun noTasks_usageOtherApp_usesUsage() {
        assertEquals(
            "com.kakao.talk",
            ForegroundPackageProbe.preferForegroundForOverlay(
                usagePkg = "com.kakao.talk",
                tasksPkg = null
            )
        )
    }

    @Test
    fun noTasksNoUsage_fallsBackToProcs() {
        assertEquals(
            "com.sec.android.app.launcher",
            ForegroundPackageProbe.preferForegroundForOverlay(
                usagePkg = null,
                tasksPkg = null,
                procsPkg = "com.sec.android.app.launcher"
            )
        )
    }

    @Test
    fun noTasks_procsInCallUi_returnsNull() {
        assertEquals(
            null,
            ForegroundPackageProbe.preferForegroundForOverlay(
                usagePkg = null,
                tasksPkg = null,
                procsPkg = "com.samsung.android.incallui"
            )
        )
    }
}
