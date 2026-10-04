package kr.vlue.calloverlay.family

import android.app.AppOpsManager
import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import android.os.Process
import android.util.Log

/**
 * TeamViewer, AnyDesk 등 — QUERY_ALL_PACKAGES 없이 알려진 packageId만 조회.
 * Manifest `<queries>` + [FamilyRemoteAppPackages] 동기.
 * UsageStats 권한이 있으면 최근 포그라운드 사용(작동)을 우선한다.
 */
object FamilyRemoteAppScanner {
    private const val TAG = "FamilyRemoteApps"
    private const val ACTIVE_WINDOW_MS = 90_000L

    fun scanInstalled(context: Context): List<String> {
        val pm = context.packageManager
        val installed = linkedSetOf<String>()
        for (pkgName in FamilyRemoteAppPackages.KNOWN_PACKAGES) {
            if (isInstalled(pm, pkgName) &&
                FamilyRemoteAppPackages.matchesRemotePattern(pkgName)
            ) {
                installed.add(pkgName)
            }
        }
        if (installed.isEmpty()) return emptyList()
        val active = scanRecentlyActive(context, installed)
        return if (active.isNotEmpty()) active else installed.toList()
    }

    /** 최근 사용·실행 중인 원격앱 (UsageStats 가능 시) */
    fun scanRecentlyActive(context: Context, candidates: Set<String> = emptySet()): List<String> {
        if (!hasUsageAccess(context)) return emptyList()
        val usm = context.getSystemService(Context.USAGE_STATS_SERVICE) as? UsageStatsManager
            ?: return emptyList()
        val end = System.currentTimeMillis()
        val begin = end - ACTIVE_WINDOW_MS
        val events = usm.queryEvents(begin, end) ?: return emptyList()
        val hit = linkedSetOf<String>()
        val event = UsageEvents.Event()
        while (events.hasNextEvent()) {
            events.getNextEvent(event)
            val pkg = event.packageName ?: continue
            val interested =
                if (candidates.isEmpty()) FamilyRemoteAppPackages.matchesRemotePattern(pkg)
                else candidates.contains(pkg)
            if (!interested) continue
            val resumed =
                Build.VERSION.SDK_INT >= 29 &&
                    event.eventType == UsageEvents.Event.ACTIVITY_RESUMED
            val paused =
                Build.VERSION.SDK_INT >= 29 &&
                    event.eventType == UsageEvents.Event.ACTIVITY_PAUSED
            if (
                event.eventType == UsageEvents.Event.MOVE_TO_FOREGROUND ||
                resumed ||
                paused
            ) {
                hit.add(pkg)
            }
        }
        return hit.toList()
    }

    private fun hasUsageAccess(context: Context): Boolean {
        return try {
            val appOps = context.getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
            val mode =
                if (Build.VERSION.SDK_INT >= 29) {
                    appOps.unsafeCheckOpNoThrow(
                        AppOpsManager.OPSTR_GET_USAGE_STATS,
                        Process.myUid(),
                        context.packageName
                    )
                } else {
                    @Suppress("DEPRECATION")
                    appOps.checkOpNoThrow(
                        AppOpsManager.OPSTR_GET_USAGE_STATS,
                        Process.myUid(),
                        context.packageName
                    )
                }
            mode == AppOpsManager.MODE_ALLOWED
        } catch (_: Exception) {
            false
        }
    }

    private fun isInstalled(pm: PackageManager, packageName: String): Boolean =
        try {
            if (Build.VERSION.SDK_INT >= 33) {
                pm.getPackageInfo(packageName, PackageManager.PackageInfoFlags.of(0))
            } else {
                @Suppress("DEPRECATION")
                pm.getPackageInfo(packageName, 0)
            }
            true
        } catch (_: PackageManager.NameNotFoundException) {
            false
        } catch (e: Exception) {
            Log.w(TAG, "lookup failed $packageName", e)
            false
        }
}
