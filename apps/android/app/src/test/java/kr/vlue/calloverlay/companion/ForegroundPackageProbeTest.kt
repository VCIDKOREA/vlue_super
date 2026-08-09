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
    fun staleTasksKakao_inCallForeground_isTop() {
        /*
         * 전체 수신 UI: InCall FOREGROUND.
         * getRunningTasks 가 직전 카톡을 반환해도 TOP 유지 (기존 버그 회귀 방지).
         */
        assertEquals(
            ForegroundPackageProbe.RingingSurface.FULL_INCALL,
            ForegroundPackageProbe.classifyRingingSurface(
                tasksPkg = "com.kakao.talk",
                inCallImportance = fg,
                otherForegroundPackages = listOf("com.kakao.talk")
            )
        )
    }

    @Test
    fun staleTasksLauncher_inCallForeground_isTop() {
        assertEquals(
            ForegroundPackageProbe.RingingSurface.FULL_INCALL,
            ForegroundPackageProbe.classifyRingingSurface(
                tasksPkg = "com.sec.android.app.launcher",
                inCallImportance = fg,
                otherForegroundPackages = emptyList()
            )
        )
    }

    @Test
    fun hun_otherAppForeground_inCallServiceOnly_isBottom() {
        /* HUN: 카톡 FOREGROUND, InCall 은 FGS — tasks 유무와 무관하게 BOTTOM */
        assertEquals(
            ForegroundPackageProbe.RingingSurface.HOME_OR_OTHER,
            ForegroundPackageProbe.classifyRingingSurface(
                tasksPkg = "com.kakao.talk",
                inCallImportance = fgs,
                otherForegroundPackages = listOf("com.kakao.talk")
            )
        )
    }

    @Test
    fun home_launcherForeground_inCallServiceOnly_isBottom() {
        assertEquals(
            ForegroundPackageProbe.RingingSurface.HOME_OR_OTHER,
            ForegroundPackageProbe.classifyRingingSurface(
                tasksPkg = "com.sec.android.app.launcher",
                inCallImportance = fgs,
                otherForegroundPackages = listOf("com.sec.android.app.launcher")
            )
        )
    }

    @Test
    fun staleTasksKakao_inCallVisible_noOtherFg_isTop() {
        /* 타 앱이 더 이상 FOREGROUND 가 아닌데 tasks 만 stale */
        assertEquals(
            ForegroundPackageProbe.RingingSurface.FULL_INCALL,
            ForegroundPackageProbe.classifyRingingSurface(
                tasksPkg = "com.kakao.talk",
                inCallImportance = visible,
                otherForegroundPackages = emptyList()
            )
        )
    }

    @Test
    fun noTasks_inCallForeground_isTop_ignoresRecentOtherApp() {
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
