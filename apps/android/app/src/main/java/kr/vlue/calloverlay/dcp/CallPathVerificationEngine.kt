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
 * 화이트리스트·안심케어 경로 검증.
 * 변작기·원격제어·악성 오버레이만 비정상. 페이스북 등 일반 앱이 앞에 있는 것은 정상.
 */
object CallPathVerificationEngine {
    private const val TAG = "CallPathVerify"

    private val VOICE_MODULATOR_PATTERNS = listOf(
        "voicechanger",
        "voice.changer",
        "voicechanger",
        "fakecall",
        "fake.call",
        "calleridspoof",
        "numberchanger",
        "변작"
    )

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

    internal fun isVoiceModulatorOrFakeCallPackage(packageName: String): Boolean {
        val p = packageName.lowercase()
        return VOICE_MODULATOR_PATTERNS.any { p.contains(it) }
    }

    internal fun isMaliciousCallPathPackage(packageName: String, selfPackage: String): Boolean {
        if (isTrustedSystemOrSelf(packageName, selfPackage)) return false
        if (FamilyRemoteAppPackages.matchesRemotePattern(packageName)) return true
        if (FamilyRemoteAppPackages.KNOWN_PACKAGES.contains(packageName)) return true
        return isVoiceModulatorOrFakeCallPackage(packageName)
    }

    /** 접근성 — 원격제어·변작기만. LastPass 등 일반 접근성은 정상. */
    internal fun isSuspiciousAccessibilityPackage(packageName: String, selfPackage: String): Boolean {
        return isMaliciousCallPathPackage(packageName, selfPackage)
    }

    /** 통화 화면을 가리는 것으로 볼 앱 — 원격제어·변작기만. 페이스북·카카오는 해당 없음. */
    internal fun isCallScreenOccluder(packageName: String, selfPackage: String): Boolean {
        if (packageName.isBlank()) return false
        if (OverlayContextDetector.isLikelyLauncherPackage(packageName)) return false
        return isMaliciousCallPathPackage(packageName, selfPackage)
    }

    private fun overlayAppsCurrentlyInUse(context: Context): List<String> {
        val self = context.packageName
        val running = runningPackageImportance(context)
        val hits = linkedSetOf<String>()
        for (pkg in overlayCandidatePackages()) {
            if (!isMaliciousCallPathPackage(pkg, self)) continue
            if (!hasSystemAlertWindowGranted(context, pkg)) continue
            val imp = running[pkg] ?: continue
            if (imp <= ActivityManager.RunningAppProcessInfo.IMPORTANCE_FOREGROUND_SERVICE) {
                hits.add(pkg)
            }
        }
        return hits.toList()
    }

    private fun overlayCandidatePackages(): List<String> {
        return FamilyRemoteAppPackages.KNOWN_PACKAGES.distinct()
    }

    /**
     * 벨이 울릴 때 직전 앱(페이스북 등)이 아직 resumed 로 남는 것은 정상.
     * 원격제어·변작기가 전면에 있을 때만 가림으로 본다.
     */
    private fun occludingNonSystemPackage(context: Context): String? {
        val self = context.packageName
        val last = ForegroundPackageProbe.lastResumedPackage(context)
        if (!last.isNullOrBlank() && isCallScreenOccluder(last, self)) {
            return last
        }
        val hints = ForegroundPackageProbe.processImportanceHints(context)
        return hints.otherForegroundPackages.firstOrNull { pkg ->
            isCallScreenOccluder(pkg, self)
        }
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
            isSuspiciousAccessibilityPackage(pkg, self) && running[pkg] != null
        }
    }
}
