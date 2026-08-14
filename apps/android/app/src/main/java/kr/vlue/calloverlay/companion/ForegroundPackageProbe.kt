package kr.vlue.calloverlay.companion

import android.app.ActivityManager
import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.Context
import android.os.Build
import android.util.Log

/**
 * 전면 패키지 추정.
 *
 * RINGING BigPush 위치 (서로 독립):
 * - 전체 InCallUI → TOP
 * - 홈 / 다른 앱 / HUN → BOTTOM
 *
 * DUT(SM-A175N) usagestats 증거:
 * - 전체 UI: ACTIVITY_RESUMED com.samsung.android.incallui/.call.InCallActivity
 * - HUN/다른앱: FOREGROUND_SERVICE + NOTIFICATION 만 (ACTIVITY_RESUMED 없음)
 *
 * getRunningTasks / process importance 만으로는 Samsung 에서 둘을 구분하지 못함.
 */
object ForegroundPackageProbe {
    private const val TAG = "VlueOverlayCtx"

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
     * 우선순위 (DUT usagestats):
     * 1) 최근 ACTIVITY_RESUMED 가 InCallUI → TOP (전체 수신 UI)
     * 2) 최근 ACTIVITY_RESUMED 가 홈/타앱 → BOTTOM (HUN·다른앱)
     * 3) Tasks 가 InCallUI → TOP
     * 4) InCall FOREGROUND → TOP
     * 5) 타 앱 FOREGROUND → BOTTOM
     * 6) InCall ≤ VISIBLE + 타앱 FG 없음 → TOP
     * 7) 그 외(미확인·VLUE 전면) → TOP — 삼성 전체 UI 응답/종료 가림 방지
     */
    @Suppress("UNUSED_PARAMETER")
    fun classifyRingingSurface(
        tasksPkg: String?,
        inCallImportance: Int?,
        otherForegroundPackages: List<String> = emptyList(),
        ourApp: Boolean = false,
        lastResumedPkg: String? = null
    ): RingingSurface {
        /*
         * VLUE가 열려 있어도 삼성 전체 InCallActivity 가 그 위에 뜬다.
         * ourApp 을 먼저 BOTTOM 처리하면 응답/종료 버튼을 가린다.
         */
        if (OverlayContextDetector.isLikelyInCallUiPackage(lastResumedPkg)) {
            return RingingSurface.FULL_INCALL
        }
        if (OverlayContextDetector.isLikelyLauncherPackage(lastResumedPkg) ||
            isKnownOtherAppPackage(lastResumedPkg)
        ) {
            return RingingSurface.HOME_OR_OTHER
        }

        if (OverlayContextDetector.isLikelyInCallUiPackage(tasksPkg)) {
            return RingingSurface.FULL_INCALL
        }

        if (inCallImportance != null &&
            inCallImportance <= ActivityManager.RunningAppProcessInfo.IMPORTANCE_FOREGROUND
        ) {
            return RingingSurface.FULL_INCALL
        }

        if (otherForegroundPackages.isNotEmpty()) {
            return RingingSurface.HOME_OR_OTHER
        }

        if (inCallImportance != null &&
            inCallImportance <= ActivityManager.RunningAppProcessInfo.IMPORTANCE_VISIBLE
        ) {
            return RingingSurface.FULL_INCALL
        }

        if (OverlayContextDetector.isLikelyLauncherPackage(tasksPkg) ||
            isKnownOtherAppPackage(tasksPkg)
        ) {
            return RingingSurface.HOME_OR_OTHER
        }

        /* 미확인(사용정보 접근 없음·VLUE 전면) → TOP. 하단이면 전체 UI 버튼을 가린다. */
        return RingingSurface.FULL_INCALL
    }

    fun classifyRingingSurface(context: Context, ourApp: Boolean): RingingSurface {
        val app = context.applicationContext
        val hints = processImportanceHints(app)
        val lastResumed = lastResumedPackage(app)
        val tasksPkg = resolveViaRunningTasks(app)
        val surface = classifyRingingSurface(
            tasksPkg = tasksPkg,
            inCallImportance = hints.inCallImportance,
            otherForegroundPackages = hints.otherForegroundPackages,
            ourApp = ourApp,
            lastResumedPkg = lastResumed
        )
        Log.i(
            TAG,
            "classify surface=$surface tasks=$tasksPkg resumed=$lastResumed " +
                "inCallImp=${hints.inCallImportance} otherFg=${hints.otherForegroundPackages}"
        )
        return surface
    }

    /**
     * UsageEvents 최근 ACTIVITY_RESUMED / MOVE_TO_FOREGROUND 패키지.
     * Samsung 전체 InCallUI vs HUN 구분의 1차 신호.
     */
    fun lastResumedPackage(context: Context, windowMs: Long = 15_000L): String? {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.LOLLIPOP) return null
        return try {
            val usm = context.getSystemService(Context.USAGE_STATS_SERVICE) as? UsageStatsManager
                ?: return null
            val end = System.currentTimeMillis()
            val begin = end - windowMs.coerceAtLeast(3_000L)
            val events = usm.queryEvents(begin, end) ?: return null
            val ev = UsageEvents.Event()
            var lastPkg: String? = null
            var lastTime = 0L
            while (events.hasNextEvent()) {
                events.getNextEvent(ev)
                val type = ev.eventType
                val isResume =
                    type == UsageEvents.Event.ACTIVITY_RESUMED ||
                        type == UsageEvents.Event.MOVE_TO_FOREGROUND
                if (!isResume) continue
                val pkg = ev.packageName?.takeIf { it.isNotBlank() && it != context.packageName }
                    ?: continue
                if (isSystemNoisePackage(pkg)) continue
                if (ev.timeStamp >= lastTime) {
                    lastTime = ev.timeStamp
                    lastPkg = pkg
                }
            }
            lastPkg
        } catch (_: Throwable) {
            null
        }
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
