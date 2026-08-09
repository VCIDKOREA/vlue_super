package kr.vlue.calloverlay.companion

import android.app.ActivityManager
import android.app.usage.UsageStatsManager
import android.content.Context
import android.os.Build

/**
 * 전면 패키지 추정 — UsageStats / RunningTasks 가능 시만.
 * 권한 없으면 null (호출측이 RINGING 기본 정책을 적용).
 */
object ForegroundPackageProbe {
    fun topPackage(context: Context): String? {
        val app = context.applicationContext
        return resolveForCompanionOverlay(app)
    }

    /**
     * 삼성 홈/다른앱 + 상단 HUN: UsageStats 는 InCallUI 를 lastUsed 로 올리는 경우가 많다.
     * RunningTasks 가 런처·타앱이면 그걸 우선 — 하단 쇼케이스바(BOTTOM) 판정용.
     * 전체 InCallUI 전면이면 Tasks/Usage 모두 InCallUI → TOP.
     *
     * Pure — 단위 테스트용. Service 는 resolveForCompanionOverlay 경유.
     */
    fun preferForegroundForOverlay(usagePkg: String?, tasksPkg: String?, procsPkg: String? = null): String? {
        if (!tasksPkg.isNullOrBlank()) {
            val tasksInCall = OverlayContextDetector.isLikelyInCallUiPackage(tasksPkg)
            val usageInCall = OverlayContextDetector.isLikelyInCallUiPackage(usagePkg)
            /* HUN: Tasks=launcher/other, Usage=InCallUI → Tasks 유지 */
            if (!tasksInCall && (usageInCall || usagePkg.isNullOrBlank())) {
                return tasksPkg
            }
            if (!tasksInCall) return tasksPkg
            /* Tasks 도 InCallUI → 전체 전화 UI */
            return tasksPkg
        }
        /*
         * Tasks 불명 + Usage=InCallUI 만: 삼성 홈 HUN 과 전체 InCallUI 구분 불가.
         * TOP(상단 숨김) 오판 방지 → null → Detector OTHER_APP → BOTTOM.
         */
        if (OverlayContextDetector.isLikelyInCallUiPackage(usagePkg)) {
            return null
        }
        if (OverlayContextDetector.isLikelyInCallUiPackage(procsPkg)) {
            return null
        }
        return usagePkg?.takeIf { it.isNotBlank() } ?: procsPkg?.takeIf { it.isNotBlank() }
    }

    fun resolveForCompanionOverlay(context: Context): String? {
        val app = context.applicationContext
        return preferForegroundForOverlay(
            usagePkg = resolveViaUsageStats(app),
            tasksPkg = resolveViaRunningTasks(app),
            procsPkg = topPackageFromProcesses(app)
        )
    }

    private fun resolveViaUsageStats(context: Context): String? {
        return try {
            val usm = context.getSystemService(Context.USAGE_STATS_SERVICE) as? UsageStatsManager
                ?: return null
            val end = System.currentTimeMillis()
            val stats = usm.queryUsageStats(
                UsageStatsManager.INTERVAL_DAILY,
                end - 60_000L,
                end
            ) ?: return null
            val top = stats.maxByOrNull { it.lastTimeUsed } ?: return null
            top.packageName?.takeIf { it.isNotBlank() && it != context.packageName }
        } catch (_: Throwable) {
            null
        }
    }

    private fun resolveViaRunningTasks(context: Context): String? {
        return try {
            val am = context.getSystemService(Context.ACTIVITY_SERVICE) as? ActivityManager
                ?: return null
            @Suppress("DEPRECATION")
            val pkg = am.getRunningTasks(1)?.firstOrNull()?.topActivity?.packageName
            pkg?.takeIf { it.isNotBlank() && it != context.packageName }
        } catch (_: Throwable) {
            null
        }
    }

    /** Android 5+ 보조 — 프로세스 importance (불완전, null 가능) */
    fun topPackageFromProcesses(context: Context): String? {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.LOLLIPOP) return null
        return try {
            val am = context.getSystemService(Context.ACTIVITY_SERVICE) as? ActivityManager
                ?: return null
            val procs = am.runningAppProcesses ?: return null
            procs
                .filter {
                    it.importance <= ActivityManager.RunningAppProcessInfo.IMPORTANCE_FOREGROUND &&
                        it.pkgList != null
                }
                .flatMap { it.pkgList.toList() }
                .firstOrNull { it != context.packageName && it.isNotBlank() }
        } catch (_: Throwable) {
            null
        }
    }

    /** 삼성/시스템 InCallUI 프로세스가 떠 있으면 전체 수신 UI로 간주 */
    fun isInCallUiProcessRunning(context: Context): Boolean {
        return try {
            val am = context.getSystemService(Context.ACTIVITY_SERVICE) as? ActivityManager
                ?: return false
            val procs = am.runningAppProcesses ?: return false
            procs.any { proc ->
                val name = proc.processName.orEmpty().lowercase()
                val pkgs = proc.pkgList?.joinToString(" ").orEmpty().lowercase()
                val blob = "$name $pkgs"
                OverlayContextDetector.isLikelyInCallUiPackage(blob) ||
                    blob.contains("incallui") ||
                    blob.contains("com.samsung.android.incallui")
            }
        } catch (_: Throwable) {
            false
        }
    }
}
