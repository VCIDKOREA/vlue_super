package kr.vlue.calloverlay.companion

import android.app.ActivityManager
import android.app.usage.UsageStatsManager
import android.content.Context
import android.os.Build

/**
 * 전면 패키지 추정 — UsageStats / RunningTasks.
 *
 * RINGING 위치 규칙:
 * - 전체 InCallUI → TOP
 * - 홈 / 다른 앱(+HUN) → BOTTOM
 */
object ForegroundPackageProbe {
    enum class RingingSurface {
        /** 삼성 전체 수신 UI → BigPush TOP */
        FULL_INCALL,
        /** 홈·다른 앱·HUN → BigPush BOTTOM */
        HOME_OR_OTHER
    }

    fun topPackage(context: Context): String? {
        val app = context.applicationContext
        return resolveForCompanionOverlay(app)
    }

    fun runningTaskPackage(context: Context): String? =
        resolveViaRunningTasks(context.applicationContext)

    /**
     * Pure — unit test용.
     * Tasks 우선. Tasks 없을 때 Usage 경쟁으로 HUN vs 전체 InCallUI 구분.
     */
    fun classifyRingingSurface(
        tasksPkg: String?,
        recentUsage: List<Pair<String, Long>>,
        ourApp: Boolean = false
    ): RingingSurface {
        if (ourApp) return RingingSurface.HOME_OR_OTHER
        if (OverlayContextDetector.isLikelyLauncherPackage(tasksPkg)) {
            return RingingSurface.HOME_OR_OTHER
        }
        if (isKnownOtherAppPackage(tasksPkg)) return RingingSurface.HOME_OR_OTHER
        if (OverlayContextDetector.isLikelyInCallUiPackage(tasksPkg)) {
            return RingingSurface.FULL_INCALL
        }

        val ranked = recentUsage
            .filter { (pkg, _) ->
                pkg.isNotBlank() &&
                    !pkg.contains("kr.vlue", ignoreCase = true) &&
                    !isSystemNoisePackage(pkg)
            }
            .sortedByDescending { it.second }
        val top = ranked.firstOrNull() ?: return RingingSurface.HOME_OR_OTHER

        if (OverlayContextDetector.isLikelyInCallUiPackage(top.first)) {
            /* HUN: InCallUI 직전(≤4s)에 홈/타앱 사용 흔적 → BOTTOM */
            val competitor = ranked.drop(1).firstOrNull { (pkg, used) ->
                !OverlayContextDetector.isLikelyInCallUiPackage(pkg) &&
                    (top.second - used) in 0..4_000L
            }
            return if (competitor != null) {
                RingingSurface.HOME_OR_OTHER
            } else {
                RingingSurface.FULL_INCALL
            }
        }

        if (OverlayContextDetector.isLikelyLauncherPackage(top.first) ||
            isKnownOtherAppPackage(top.first)
        ) {
            return RingingSurface.HOME_OR_OTHER
        }
        return RingingSurface.HOME_OR_OTHER
    }

    fun classifyRingingSurface(context: Context, ourApp: Boolean): RingingSurface {
        val app = context.applicationContext
        return classifyRingingSurface(
            tasksPkg = resolveViaRunningTasks(app),
            recentUsage = recentUsagePackages(app, windowMs = 20_000L),
            ourApp = ourApp
        )
    }

    fun preferForegroundForOverlay(
        usagePkg: String?,
        tasksPkg: String?,
        procsPkg: String? = null
    ): String? {
        if (!tasksPkg.isNullOrBlank()) {
            val tasksInCall = OverlayContextDetector.isLikelyInCallUiPackage(tasksPkg)
            val usageInCall = OverlayContextDetector.isLikelyInCallUiPackage(usagePkg)
            if (!tasksInCall && (usageInCall || usagePkg.isNullOrBlank())) {
                return tasksPkg
            }
            if (!tasksInCall) return tasksPkg
            return tasksPkg
        }
        if (OverlayContextDetector.isLikelyInCallUiPackage(usagePkg)) {
            return usagePkg
        }
        if (OverlayContextDetector.isLikelyInCallUiPackage(procsPkg)) {
            return procsPkg
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

    private fun isKnownOtherAppPackage(pkg: String?): Boolean {
        if (pkg.isNullOrBlank()) return false
        if (OverlayContextDetector.isLikelyInCallUiPackage(pkg)) return false
        if (OverlayContextDetector.isLikelyLauncherPackage(pkg)) return false
        if (pkg.contains("kr.vlue", ignoreCase = true)) return false
        if (isSystemNoisePackage(pkg)) return false
        return true
    }

    private fun isSystemNoisePackage(pkg: String): Boolean {
        val p = pkg.lowercase()
        return p.contains("systemui") ||
            p.contains("permissioncontroller") ||
            p.contains("packageinstaller") ||
            p == "android" ||
            p.startsWith("com.android.systemui")
    }

    private fun recentUsagePackages(context: Context, windowMs: Long): List<Pair<String, Long>> {
        return try {
            val usm = context.getSystemService(Context.USAGE_STATS_SERVICE) as? UsageStatsManager
                ?: return emptyList()
            val end = System.currentTimeMillis()
            val stats = usm.queryUsageStats(
                UsageStatsManager.INTERVAL_DAILY,
                end - windowMs.coerceAtLeast(5_000L),
                end
            ) ?: return emptyList()
            stats.mapNotNull { s ->
                val pkg = s.packageName?.takeIf { it.isNotBlank() && it != context.packageName }
                    ?: return@mapNotNull null
                pkg to s.lastTimeUsed
            }
        } catch (_: Throwable) {
            emptyList()
        }
    }

    private fun resolveViaUsageStats(context: Context): String? {
        return recentUsagePackages(context, 60_000L)
            .maxByOrNull { it.second }
            ?.first
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
