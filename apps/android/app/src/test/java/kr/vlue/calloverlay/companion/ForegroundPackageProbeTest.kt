package kr.vlue.calloverlay.companion

import android.app.ActivityManager
import org.junit.Assert.assertEquals
import org.junit.Test

class ForegroundPackageProbeTest {
    private val fg = ActivityManager.RunningAppProcessInfo.IMPORTANCE_FOREGROUND
    private val fgs = ActivityManager.RunningAppProcessInfo.IMPORTANCE_FOREGROUND_SERVICE
    private val visible = ActivityManager.RunningAppProcessInfo.IMPORTANCE_VISIBLE

    @Test
    fun resumedInCall_isTop_evenIfKakaoStillForeground() {
        /* DUT: 전체 UI = InCallActivity ACTIVITY_RESUMED */
        assertEquals(
            ForegroundPackageProbe.RingingSurface.FULL_INCALL,
            ForegroundPackageProbe.classifyRingingSurface(
                tasksPkg = "com.kakao.talk",
                inCallImportance = fgs,
                otherForegroundPackages = listOf("com.kakao.talk"),
                lastResumedPkg = "com.samsung.android.incallui"
            )
        )
    }

    @Test
    fun resumedKakao_isBottom_hunWithoutInCallActivity() {
        /* DUT: HUN = FGS+알림만, last resume 는 카톡 */
        assertEquals(
            ForegroundPackageProbe.RingingSurface.HOME_OR_OTHER,
            ForegroundPackageProbe.classifyRingingSurface(
                tasksPkg = "com.kakao.talk",
                inCallImportance = fgs,
                otherForegroundPackages = listOf("com.kakao.talk"),
                lastResumedPkg = "com.kakao.talk"
            )
        )
    }

    @Test
    fun resumedLauncher_isBottom() {
        assertEquals(
            ForegroundPackageProbe.RingingSurface.HOME_OR_OTHER,
            ForegroundPackageProbe.classifyRingingSurface(
                tasksPkg = "com.sec.android.app.launcher",
                inCallImportance = fgs,
                otherForegroundPackages = listOf("com.sec.android.app.launcher"),
                lastResumedPkg = "com.sec.android.app.launcher"
            )
        )
    }

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
    fun noResume_inCallForeground_isTop() {
        assertEquals(
            ForegroundPackageProbe.RingingSurface.FULL_INCALL,
            ForegroundPackageProbe.classifyRingingSurface(
                tasksPkg = "com.kakao.talk",
                inCallImportance = fg,
                otherForegroundPackages = listOf("com.kakao.talk"),
                lastResumedPkg = null
            )
        )
    }

    @Test
    fun noResume_otherAppForeground_inCallServiceOnly_isBottom() {
        assertEquals(
            ForegroundPackageProbe.RingingSurface.HOME_OR_OTHER,
            ForegroundPackageProbe.classifyRingingSurface(
                tasksPkg = null,
                inCallImportance = fgs,
                otherForegroundPackages = listOf("com.kakao.talk"),
                lastResumedPkg = null
            )
        )
    }

    @Test
    fun noResume_inCallVisible_noOther_isTop() {
        assertEquals(
            ForegroundPackageProbe.RingingSurface.FULL_INCALL,
            ForegroundPackageProbe.classifyRingingSurface(
                tasksPkg = null,
                inCallImportance = visible,
                otherForegroundPackages = emptyList(),
                lastResumedPkg = null
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
                ourApp = true,
                lastResumedPkg = "com.samsung.android.incallui"
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
