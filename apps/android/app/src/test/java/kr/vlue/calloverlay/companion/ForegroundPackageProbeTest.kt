package kr.vlue.calloverlay.companion

import android.app.ActivityManager
import org.junit.Assert.assertEquals
import org.junit.Test

class ForegroundPackageProbeTest {
    private val fg = ActivityManager.RunningAppProcessInfo.IMPORTANCE_FOREGROUND
    private val fgs = ActivityManager.RunningAppProcessInfo.IMPORTANCE_FOREGROUND_SERVICE
    private val visible = ActivityManager.RunningAppProcessInfo.IMPORTANCE_VISIBLE

    @Test
    fun tasksInCall_isFullInCallTop() {
        assertEquals(
            ForegroundPackageProbe.RingingSurface.FULL_INCALL,
            ForegroundPackageProbe.classifyRingingSurface(
                tasksPkg = "com.samsung.android.incallui",
                inCallImportance = null,
                otherForegroundPackages = listOf("com.kakao.talk")
            )
        )
    }

    @Test
    fun tasksKakao_isBottom_evenIfInCallForeground() {
        assertEquals(
            ForegroundPackageProbe.RingingSurface.HOME_OR_OTHER,
            ForegroundPackageProbe.classifyRingingSurface(
                tasksPkg = "com.kakao.talk",
                inCallImportance = fg,
                otherForegroundPackages = listOf("com.kakao.talk")
            )
        )
    }

    @Test
    fun tasksLauncher_isBottom() {
        assertEquals(
            ForegroundPackageProbe.RingingSurface.HOME_OR_OTHER,
            ForegroundPackageProbe.classifyRingingSurface(
                tasksPkg = "com.sec.android.app.launcher",
                inCallImportance = fgs,
                otherForegroundPackages = emptyList()
            )
        )
    }

    @Test
    fun noTasks_inCallForeground_isTop_ignoresRecentOtherApp() {
        /* 전체 UI: InCall FOREGROUND — 직전 카톡이 있어도 TOP */
        assertEquals(
            ForegroundPackageProbe.RingingSurface.FULL_INCALL,
            ForegroundPackageProbe.classifyRingingSurface(
                tasksPkg = null,
                inCallImportance = fg,
                otherForegroundPackages = listOf("com.kakao.talk")
            )
        )
    }

    @Test
    fun noTasks_otherAppForeground_inCallServiceOnly_isBottom() {
        /* HUN: 카톡 FOREGROUND, InCall 은 FGS */
        assertEquals(
            ForegroundPackageProbe.RingingSurface.HOME_OR_OTHER,
            ForegroundPackageProbe.classifyRingingSurface(
                tasksPkg = null,
                inCallImportance = fgs,
                otherForegroundPackages = listOf("com.kakao.talk")
            )
        )
    }

    @Test
    fun noTasks_inCallVisible_noOther_isTop() {
        assertEquals(
            ForegroundPackageProbe.RingingSurface.FULL_INCALL,
            ForegroundPackageProbe.classifyRingingSurface(
                tasksPkg = null,
                inCallImportance = visible,
                otherForegroundPackages = emptyList()
            )
        )
    }

    @Test
    fun ourApp_isBottom() {
        assertEquals(
            ForegroundPackageProbe.RingingSurface.HOME_OR_OTHER,
            ForegroundPackageProbe.classifyRingingSurface(
                tasksPkg = "com.samsung.android.incallui",
                inCallImportance = fg,
                ourApp = true
            )
        )
    }

    @Test
    fun prefer_hun_tasksOther_keepsOther() {
        assertEquals(
            "com.kakao.talk",
            ForegroundPackageProbe.preferForegroundForOverlay(
                usagePkg = "com.samsung.android.incallui",
                tasksPkg = "com.kakao.talk"
            )
        )
    }
}
