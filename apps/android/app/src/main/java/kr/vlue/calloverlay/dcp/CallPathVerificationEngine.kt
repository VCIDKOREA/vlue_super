package kr.vlue.calloverlay.dcp

import android.accessibilityservice.AccessibilityServiceInfo
import android.app.ActivityManager
import android.app.AppOpsManager
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import android.provider.Settings
import android.util.Log
import android.view.accessibility.AccessibilityManager
import kr.vlue.calloverlay.companion.ForegroundPackageProbe
import kr.vlue.calloverlay.companion.OverlayContextDetector
import kr.vlue.calloverlay.family.FamilyRemoteAppPackages

/**
 * 화이트리스트 번호 통화의 경로 검증.
 * 다른 앱의 오버레이·접근성·InCallUI 가림을 **탐지**만 한다 (공격 절차 없음).
 */
object CallPathVerificationEngine {
    private const val TAG = "CallPathVerify"

    fun evaluate(signals: CallPathSignals): CallPathVerdict {
        val reasons = mutableListOf<String>()
        if (signals.otherOverlayAppsInUse.isNotEmpty()) {
            reasons.add("overlay_in_use:${signals.otherOverlayAppsInUse.joinToString(",")}")
        }
        if (signals.suspiciousAccessibilityPackages.isNotEmpty()) {
            reasons.add(
                "accessibility_suspicious:${signals.suspiciousAccessibilityPackages.joinToString(",")}"
            )
        }
        if (signals.inCallUiOccludedByOtherApp) {
            reasons.add("incall_occluded:${signals.occludingPackage ?: "unknown"}")
        }
        return if (reasons.isEmpty()) {
            CallPathVerdict.normal()
        } else {
            CallPathVerdict.abnormal(reasons)
        }
    }

    fun verify(context: Context): CallPathVerdict {
        val app = context.applicationContext
        val signals = collectSignals(app)
        val verdict = evaluate(signals)
        Log.i(
            TAG,
            "verdict=${verdict.routeQuery} reasons=${verdict.reasons} " +
                "overlay=${signals.otherOverlayAppsInUse} a11y=${signals.suspiciousAccessibilityPackages} " +
                "occluded=${signals.inCallUiOccludedByOtherApp} pkg=${signals.occludingPackage}"
        )
        return verdict
    }

    fun collectSignals(context: Context): CallPathSignals {
        val overlayInUse = overlayAppsCurrentlyInUse(context)
        val a11y = suspiciousEnabledAccessibilityPackages(context)
        val occluder = occludingNonSystemPackage(context)
        return CallPathSignals(
            otherOverlayAppsInUse = overlayInUse,
            suspiciousAccessibilityPackages = a11y,
            inCallUiOccludedByOtherApp = occluder != null,
            occludingPackage = occluder
        )
    }

    internal fun isTrustedSystemOrSelf(packageName: String, selfPackage: String): Boolean {
        if (packageName == selfPackage) return true
        val p = packageName.lowercase()
        if (p.startsWith("kr.vlue")) return true
        if (OverlayContextDetector.isLikelyInCallUiPackage(p)) return true
        if (OverlayContextDetector.isLikelyLauncherPackage(p)) return true
        return p.startsWith("android") ||
            p.startsWith("com.android.") ||
            p.startsWith("com.google.android.") ||
            p.startsWith("com.samsung.") ||
            p.startsWith("com.sec.") ||
            p.contains("systemui") ||
            p.contains("permissioncontroller")
    }

    internal fun isSuspiciousAccessibilityPackage(packageName: String, selfPackage: String): Boolean {
        if (isTrustedSystemOrSelf(packageName, selfPackage)) return false
        if (FamilyRemoteAppPackages.matchesRemotePattern(packageName)) return true
        return true
    }

    private fun overlayAppsCurrentlyInUse(context: Context): List<String> {
        val self = context.packageName
        val running = runningPackageImportance(context)
        val hits = linkedSetOf<String>()
        for (pkg in overlayCandidatePackages()) {
            if (isTrustedSystemOrSelf(pkg, self)) continue
            if (!hasSystemAlertWindowGranted(context, pkg)) continue
            val imp = running[pkg] ?: continue
            val remote = FamilyRemoteAppPackages.matchesRemotePattern(pkg) ||
                FamilyRemoteAppPackages.KNOWN_PACKAGES.contains(pkg)
            val using =
                if (remote) {
                    imp <= ActivityManager.RunningAppProcessInfo.IMPORTANCE_FOREGROUND_SERVICE
                } else {
                    imp <= ActivityManager.RunningAppProcessInfo.IMPORTANCE_FOREGROUND
                }
            if (using) hits.add(pkg)
        }
        return hits.toList()
    }

    private fun overlayCandidatePackages(): List<String> {
        return (FamilyRemoteAppPackages.KNOWN_PACKAGES + listOf(
            "com.kakao.talk"
        )).distinct()
    }

    private fun hasSystemAlertWindowGranted(context: Context, packageName: String): Boolean {
        return try {
            val pm = context.packageManager
            val info = if (Build.VERSION.SDK_INT >= 33) {
                pm.getApplicationInfo(packageName, PackageManager.ApplicationInfoFlags.of(0))
            } else {
                @Suppress("DEPRECATION")
                pm.getApplicationInfo(packageName, 0)
            }
            val appOps = context.getSystemService(Context.APP_OPS_SERVICE) as? AppOpsManager
                ?: return false
            val mode = if (Build.VERSION.SDK_INT >= 29) {
                appOps.unsafeCheckOpNoThrow(
                    AppOpsManager.OPSTR_SYSTEM_ALERT_WINDOW,
                    info.uid,
                    packageName
                )
            } else {
                @Suppress("DEPRECATION")
                appOps.checkOpNoThrow(
                    AppOpsManager.OPSTR_SYSTEM_ALERT_WINDOW,
                    info.uid,
                    packageName
                )
            }
            mode == AppOpsManager.MODE_ALLOWED
        } catch (_: PackageManager.NameNotFoundException) {
            false
        } catch (_: Exception) {
            false
        }
    }

    private fun runningPackageImportance(context: Context): Map<String, Int> {
        val out = HashMap<String, Int>()
        try {
            val am = context.getSystemService(Context.ACTIVITY_SERVICE) as? ActivityManager
                ?: return out
            val procs = am.runningAppProcesses ?: return out
            for (proc in procs) {
                val pkgs = proc.pkgList ?: continue
                for (pkg in pkgs) {
                    if (pkg.isNullOrBlank()) continue
                    val prev = out[pkg]
                    if (prev == null || proc.importance < prev) {
                        out[pkg] = proc.importance
                    }
                }
            }
        } catch (_: Exception) {
        }
        return out
    }

    private fun suspiciousEnabledAccessibilityPackages(context: Context): List<String> {
        val self = context.packageName
        val enabled = linkedSetOf<String>()
        try {
            val am = context.getSystemService(Context.ACCESSIBILITY_SERVICE) as? AccessibilityManager
            val list = am?.getEnabledAccessibilityServiceList(AccessibilityServiceInfo.FEEDBACK_ALL_MASK)
            list?.forEach { info ->
                val pkg = info.resolveInfo?.serviceInfo?.packageName
                    ?: info.id.substringBefore('/')
                if (pkg.isNotBlank()) enabled.add(pkg)
            }
        } catch (_: Exception) {
        }
        try {
            val raw = Settings.Secure.getString(
                context.contentResolver,
                Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES
            ).orEmpty()
            raw.split(':', ';').forEach { token ->
                val pkg = token.substringBefore('/').trim()
                if (pkg.isNotBlank()) enabled.add(pkg)
            }
        } catch (_: Exception) {
        }
        val running = runningPackageImportance(context)
        return enabled.filter { pkg ->
            isSuspiciousAccessibilityPackage(pkg, self) &&
                (running[pkg] != null || FamilyRemoteAppPackages.matchesRemotePattern(pkg))
        }
    }

    /**
     * 기본 InCallUI 가 아닌 타 앱이 전면에 있으면 통화 UI가 가려진 것으로 본다.
     * 런처/홈/시스템 UI 는 정상(HUN)으로 취급.
     */
    private fun occludingNonSystemPackage(context: Context): String? {
        val self = context.packageName
        val last = ForegroundPackageProbe.lastResumedPackage(context)
        if (!last.isNullOrBlank() &&
            !isTrustedSystemOrSelf(last, self) &&
            !OverlayContextDetector.isLikelyLauncherPackage(last)
        ) {
            return last
        }
        val hints = ForegroundPackageProbe.processImportanceHints(context)
        val other = hints.otherForegroundPackages.firstOrNull { pkg ->
            !isTrustedSystemOrSelf(pkg, self) &&
                !OverlayContextDetector.isLikelyLauncherPackage(pkg)
        }
        return other
    }
}
