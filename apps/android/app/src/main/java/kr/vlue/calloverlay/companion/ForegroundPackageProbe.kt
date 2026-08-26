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
 * - 미니 수신 팝업(전화 앱·카톡·홈·HUN 포함) → 팝업 바로 아래
 *
 * DUT(SM-A175N) usagestats 증거:
 * - 전체 UI: ACTIVITY_RESUMED com.samsung.android.incallui/.call.InCallActivity
 * - 미니 수신(전화 앱 위): last resume / task = com.samsung.android.dialer
 * - HUN/다른앱: FOREGROUND_SERVICE + NOTIFICATION 만 (ACTIVITY_RESUMED 없음)
 *
 * getRunningTasks / process importance 만으로는 Samsung 에서 둘을 구분하지 못함.
 */
object ForegroundPackageProbe {
    private const val TAG = "VlueOverlayCtx"

    enum class RingingSurface {
        FULL_INCALL,
        COMPACT_DIALER,
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
     * 1) 최근 resume 이 전화 앱(dialer) → 미니 수신 (팝업 바로 아래)
     * 2) 최근 resume 이 InCallUI + task 가 dialer → compact InCall (팝업 바로 아래)
     * 3) 최근 resume 이 InCallUI → TOP (전체 수신 UI)
     * 4) 최근 ACTIVITY_RESUMED 가 홈/타앱 → 미니 수신 (팝업 바로 아래)
     * 5) Tasks 가 dialer → 미니 수신
     * 6) Tasks 가 InCallUI → TOP
     * 7) InCall FOREGROUND → TOP
     * 8) 타 앱 FOREGROUND → 미니 수신 (팝업 바로 아래)
     * 9) InCall ≤ VISIBLE + 타앱 FG 없음 → TOP
     * 10) 그 외(미확인·VLUE 전면) → TOP — 삼성 전체 UI 응답/종료 가림 방지
     */
    @Suppress("UNUSED_PARAMETER")
    fun classifyRingingSurface(
        tasksPkg: String?,
        inCallImportance: Int?,
        otherForegroundPackages: List<String> = emptyList(),
        ourApp: Boolean = false,
        lastResumedPkg: String? = null
    ): RingingSurface {
        val resumedDialer = OverlayContextDetector.isLikelyDialerPackage(lastResumedPkg)
        val resumedFull = OverlayContextDetector.isLikelyFullInCallUiPackage(lastResumedPkg)
        val tasksDialer = OverlayContextDetector.isLikelyDialerPackage(tasksPkg)
        val tasksFull = OverlayContextDetector.isLikelyFullInCallUiPackage(tasksPkg)

        if (resumedDialer) return RingingSurface.COMPACT_DIALER
        /* 최근기록이 전면이면 미니 수신 — 이전 InCallActivity resume 가 남아도 TOP 금지 */
        if (tasksDialer) return RingingSurface.COMPACT_DIALER
        if (resumedFull && tasksDialer) return RingingSurface.COMPACT_DIALER
        /*
         * 타앱(카톡·카카오내비 등) 위 미니 수신 팝업 — task 가 전체 InCallUI 가 아니면 BELOW.
         * 직전 통화 InCallActivity resume(stale) 가 남아도 TOP 금지 → 2번째 수신 겹침 방지.
         */
        if (isKnownOtherAppPackage(tasksPkg) && !tasksFull) {
            return RingingSurface.HOME_OR_OTHER
        }
        if (otherForegroundPackages.isNotEmpty() && !tasksFull) {
            return RingingSurface.HOME_OR_OTHER
        }
        /*
         * 전체 InCallUI: resume 가 InCallActivity 이고 다이얼러/타앱 task 가 없으면 TOP.
         * tasks=null 만으로 BELOW 하면 전면 수신 UI 중앙에 빅푸시가 뜬다.
         * 연속·미니 수신은 tasksDialer / otherApp / ourApp 경로로 BELOW 유지.
         */
        if (resumedFull && ourApp && !tasksFull) return RingingSurface.HOME_OR_OTHER
        if (resumedFull && tasksFull) return RingingSurface.FULL_INCALL
        if (resumedFull && !tasksFull) return RingingSurface.FULL_INCALL

        if (OverlayContextDetector.isLikelyLauncherPackage(lastResumedPkg) ||
            isKnownOtherAppPackage(lastResumedPkg)
        ) {
            return RingingSurface.HOME_OR_OTHER
        }

        if (tasksDialer) return RingingSurface.COMPACT_DIALER
        if (tasksFull) return RingingSurface.FULL_INCALL

        /*
         * InCall 프로세스만 FOREGROUND — VLUE/홈 위 미니 팝업. ourApp 미사용 시 카톡 등 타앱 전면.
         */
        if (ourApp && !resumedFull && !tasksFull) {
            return RingingSurface.HOME_OR_OTHER
        }
        if (inCallImportance != null &&
            inCallImportance <= ActivityManager.RunningAppProcessInfo.IMPORTANCE_FOREGROUND
        ) {
            /* 미니 수신도 InCall FOREGROUND 유지 — tasksFull 없으면 FULL 금지 */
            if (tasksFull) return RingingSurface.FULL_INCALL
            return RingingSurface.HOME_OR_OTHER
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

        /* VLUE 전면 = 미니 팝업 위. 미확인(usage 없음)이어도 BELOW — TOP 이면 미니 UI 와 겹침 */
        if (ourApp) return RingingSurface.HOME_OR_OTHER
        /* 미확인 → TOP. 하단이면 Samsung 전체 수신 UI 버튼을 가린다. */
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
                    OverlayContextDetector.isLikelyFullInCallUiPackage(blob) ||
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
