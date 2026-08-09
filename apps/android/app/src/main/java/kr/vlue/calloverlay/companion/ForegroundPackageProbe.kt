package kr.vlue.calloverlay.companion

import android.app.ActivityManager
import android.app.usage.UsageStatsManager
import android.content.Context
import android.os.Build

/**
 * 전면 패키지 추정.
 *
 * RINGING BigPush 위치 (서로 독립):
 * - 전체 InCallUI (InCall 액티비티 FOREGROUND) → TOP
 * - 홈 / 다른 앱 / HUN (타 앱이 FOREGROUND) → BOTTOM
 *
 * 주의: Samsung 전체 수신 UI 에서도 getRunningTasks(1) 이 직전 앱(카톡/런처)을
 * 반환하는 경우가 많다. tasks 의 "타앱"을 InCall FOREGROUND 보다 먼저 보면
 * 전체 UI 가 항상 BOTTOM 으로 고정된다.
 */
object ForegroundPackageProbe {
    enum class RingingSurface {
        FULL_INCALL,
        HOME_OR_OTHER
    }

    data class ProcessImportanceHints(
        val inCallImportance: Int?,
        val otherForegroundPackages: List<String>
    )

    fun topPackage(context: Context): String? {
        val app = context.applicationContext
        return resolveForCompanionOverlay(app)
    }

    fun runningTaskPackage(context: Context): String? =
        resolveViaRunningTasks(context.applicationContext)

    /**
     * Pure — 단위 테스트용.
     *
     * 우선순위 (증거: getRunningTasks 는 InCallUI 전체화면에서 stale 가능):
     * 1) InCall importance ≤ FOREGROUND → TOP (전체 수신 UI; stale tasks 무시)
     * 2) Tasks 가 InCallUI → TOP
     * 3) 다른 앱이 FOREGROUND → BOTTOM (HUN / 백그라운드 수신)
     * 4) InCall ≤ VISIBLE 이고 타 앱 FOREGROUND 없음 → TOP (stale tasks 보정)
     * 5) Tasks 가 홈/타앱 → BOTTOM
     * 6) 그 외 → BOTTOM
     */
    fun classifyRingingSurface(
        tasksPkg: String?,
        inCallImportance: Int?,
        otherForegroundPackages: List<String> = emptyList(),
        ourApp: Boolean = false
    ): RingingSurface {
        if (ourApp) return RingingSurface.HOME_OR_OTHER

        /* 전체 수신 UI: InCall 액티비티가 전면 — stale tasks(직전 카톡/런처)와 무관 */
        if (inCallImportance != null &&
            inCallImportance <= ActivityManager.RunningAppProcessInfo.IMPORTANCE_FOREGROUND
        ) {
            return RingingSurface.FULL_INCALL
        }

        if (OverlayContextDetector.isLikelyInCallUiPackage(tasksPkg)) {
            return RingingSurface.FULL_INCALL
        }

        /* HUN/다른앱: 타 앱이 진짜 FOREGROUND — InCall 은 보통 FGS 만 */
        if (otherForegroundPackages.isNotEmpty()) {
            return RingingSurface.HOME_OR_OTHER
        }

        /*
         * InCall 이 VISIBLE/FGS 이고 타 앱 FOREGROUND 가 없으면 전체 UI.
         * (tasks 가 직전 앱을 가리켜도 otherFg 비어 있으면 stale 로 본다)
         */
        if (inCallImportance != null &&
            inCallImportance <= ActivityManager.RunningAppProcessInfo.IMPORTANCE_VISIBLE
        ) {
            return RingingSurface.FULL_INCALL
        }

        if (OverlayContextDetector.isLikelyLauncherPackage(tasksPkg)) {
            return RingingSurface.HOME_OR_OTHER
        }
        if (isKnownOtherAppPackage(tasksPkg)) return RingingSurface.HOME_OR_OTHER

        return RingingSurface.HOME_OR_OTHER
    }

    fun classifyRingingSurface(context: Context, ourApp: Boolean): RingingSurface {
        val app = context.applicationContext
        val hints = processImportanceHints(app)
        return classifyRingingSurface(
            tasksPkg = resolveViaRunningTasks(app),
            inCallImportance = hints.inCallImportance,
            otherForegroundPackages = hints.otherForegroundPackages,
            ourApp = ourApp
        )
    }

    fun processImportanceHints(context: Context): ProcessImportanceHints {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.LOLLIPOP) {
            return ProcessImportanceHints(null, emptyList())
        }
        return try {
            val am = context.getSystemService(Context.ACTIVITY_SERVICE) as? ActivityManager
                ?: return ProcessImportanceHints(null, emptyList())
            val procs = am.runningAppProcesses ?: return ProcessImportanceHints(null, emptyList())
            var inCallImp: Int? = null
            val others = linkedSetOf<String>()
            for (proc in procs) {
                val pkgs = proc.pkgList?.toList().orEmpty()
                if (pkgs.isEmpty()) continue
                val blob = (proc.processName.orEmpty() + " " + pkgs.joinToString(" ")).lowercase()
                val isInCall =
                    OverlayContextDetector.isLikelyInCallUiPackage(blob) ||
                        blob.contains("incallui") ||
                        blob.contains("com.samsung.android.incallui")
                if (isInCall) {
                    val imp = proc.importance
                    val prev = inCallImp
                    if (prev == null || imp < prev) inCallImp = imp
                    continue
                }
                if (proc.importance > ActivityManager.RunningAppProcessInfo.IMPORTANCE_FOREGROUND) {
                    continue
                }
                for (pkg in pkgs) {
                    if (pkg.isBlank() || pkg == context.packageName) continue
                    if (isSystemNoisePackage(pkg)) continue
                    if (OverlayContextDetector.isLikelyInCallUiPackage(pkg)) continue
                    others.add(pkg)
                }
            }
            ProcessImportanceHints(inCallImp, others.toList())
        } catch (_: Throwable) {
            ProcessImportanceHints(null, emptyList())
        }
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
        return processImportanceHints(context).inCallImportance != null
    }
}
