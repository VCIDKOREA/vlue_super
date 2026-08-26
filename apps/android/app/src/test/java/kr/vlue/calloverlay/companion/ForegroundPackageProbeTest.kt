package kr.vlue.calloverlay.companion

import android.app.ActivityManager
import org.junit.Assert.assertEquals
import org.junit.Test

class ForegroundPackageProbeTest {
    private val fg = ActivityManager.RunningAppProcessInfo.IMPORTANCE_FOREGROUND
    private val fgs = ActivityManager.RunningAppProcessInfo.IMPORTANCE_FOREGROUND_SERVICE
    private val visible = ActivityManager.RunningAppProcessInfo.IMPORTANCE_VISIBLE

    @Test
    fun resumedInCall_isBottom_whenOtherAppTaskOnTop() {
        /* 미니 수신: 카톡/내비 위 팝업 — stale InCall resume 무시 */
        assertEquals(
            ForegroundPackageProbe.RingingSurface.HOME_OR_OTHER,
            ForegroundPackageProbe.classifyRingingSurface(
                tasksPkg = "com.kakao.talk",
                inCallImportance = fgs,
                otherForegroundPackages = listOf("com.kakao.talk"),
                lastResumedPkg = "com.samsung.android.incallui"
            )
        )
    }

    @Test
    fun consecutiveCall_kakaonavi_staleInCallResume_isBottom() {
        assertEquals(
            ForegroundPackageProbe.RingingSurface.HOME_OR_OTHER,
            ForegroundPackageProbe.classifyRingingSurface(
                tasksPkg = "com.locnall.KimGiSa",
                inCallImportance = fg,
                otherForegroundPackages = listOf("com.locnall.KimGiSa"),
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
    fun resumedDialer_isCompact_notFullInCall() {
        /* 전화 앱 최근기록 위 미니 수신 팝업 — 전체 InCallUI 가 아님 */
        assertEquals(
            ForegroundPackageProbe.RingingSurface.COMPACT_DIALER,
            ForegroundPackageProbe.classifyRingingSurface(
                tasksPkg = "com.samsung.android.dialer",
                inCallImportance = fgs,
                lastResumedPkg = "com.samsung.android.dialer"
            )
        )
    }

    @Test
    fun staleInCallResume_withDialerTask_isCompact() {
        assertEquals(
            ForegroundPackageProbe.RingingSurface.COMPACT_DIALER,
            ForegroundPackageProbe.classifyRingingSurface(
                tasksPkg = "com.samsung.android.dialer",
                inCallImportance = fg,
                lastResumedPkg = "com.samsung.android.incallui"
            )
        )
    }

    @Test
    fun tasksDialer_noResume_isCompact() {
        assertEquals(
            ForegroundPackageProbe.RingingSurface.COMPACT_DIALER,
            ForegroundPackageProbe.classifyRingingSurface(
                tasksPkg = "com.samsung.android.dialer",
                inCallImportance = fgs,
                lastResumedPkg = null
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
    fun noResume_inCallForeground_isBottomWhenOtherAppTask() {
        assertEquals(
            ForegroundPackageProbe.RingingSurface.HOME_OR_OTHER,
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
    fun ourApp_withInCallUi_isTop() {
        /* VLUE가 열려 있어도 삼성 전체 InCallActivity 가 그 위면 TOP */
        assertEquals(
            ForegroundPackageProbe.RingingSurface.FULL_INCALL,
            ForegroundPackageProbe.classifyRingingSurface(
                tasksPkg = "com.samsung.android.incallui",
                inCallImportance = fg,
                ourApp = true,
                lastResumedPkg = "com.samsung.android.incallui"
            )
        )
    }

    @Test
    fun ourApp_vlueForeground_inCallForeground_isBottom() {
        /* 2번째 수신: VLUE 전면 + InCall 프로세스 FG + stale resume 없음 → 미니 팝업 아래 */
        assertEquals(
            ForegroundPackageProbe.RingingSurface.HOME_OR_OTHER,
            ForegroundPackageProbe.classifyRingingSurface(
                tasksPkg = null,
                inCallImportance = fg,
                otherForegroundPackages = emptyList(),
                ourApp = true,
                lastResumedPkg = null
            )
        )
    }

    @Test
    fun ourApp_staleInCallResume_vlueForeground_isBottom() {
        assertEquals(
            ForegroundPackageProbe.RingingSurface.HOME_OR_OTHER,
            ForegroundPackageProbe.classifyRingingSurface(
                tasksPkg = null,
                inCallImportance = fg,
                ourApp = true,
                lastResumedPkg = "com.samsung.android.incallui"
            )
        )
    }

    @Test
    fun ourApp_staleInCallResume_withInCallTask_isTop() {
        assertEquals(
            ForegroundPackageProbe.RingingSurface.FULL_INCALL,
            ForegroundPackageProbe.classifyRingingSurface(
                tasksPkg = "com.samsung.android.incallui",
                inCallImportance = fg,
                ourApp = true,
                lastResumedPkg = "com.samsung.android.incallui"
            )
        )
    }

    @Test
    fun fullInCallUi_resumedInCall_nullTasks_isTop() {
        /* 전면 수신 UI: tasks 못 읽어도 InCall resume 이면 TOP (중앙 BELOW 금지) */
        assertEquals(
            ForegroundPackageProbe.RingingSurface.FULL_INCALL,
            ForegroundPackageProbe.classifyRingingSurface(
                tasksPkg = null,
                inCallImportance = fg,
                otherForegroundPackages = emptyList(),
                ourApp = false,
                lastResumedPkg = "com.samsung.android.incallui"
            )
        )
    }

    @Test
    fun inCallForegroundAlone_nullTasks_isBelow_notFull() {
        /* 미니 수신도 InCall FOREGROUND — FG alone ≠ 전체 UI */
        assertEquals(
            ForegroundPackageProbe.RingingSurface.HOME_OR_OTHER,
            ForegroundPackageProbe.classifyRingingSurface(
                tasksPkg = null,
                inCallImportance = fg,
                otherForegroundPackages = emptyList(),
                lastResumedPkg = null
            )
        )
    }

    @Test
    fun unknown_defaultsToTop() {
        assertEquals(
            ForegroundPackageProbe.RingingSurface.FULL_INCALL,
            ForegroundPackageProbe.classifyRingingSurface(
                tasksPkg = null,
                inCallImportance = null,
                otherForegroundPackages = emptyList(),
                lastResumedPkg = null
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
