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
        resolveViaUsageStats(app)?.let { return it }
        resolveViaRunningTasks(app)?.let { return it }
        return null
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
