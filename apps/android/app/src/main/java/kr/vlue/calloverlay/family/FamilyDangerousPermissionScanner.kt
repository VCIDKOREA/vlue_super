package kr.vlue.calloverlay.family

import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import android.util.Log

/**
 * 위험 권한 스캔 — QUERY_ALL_PACKAGES 없이 알려진 원격제어 앱 package만 검사.
 * 전체 기기 스캔은 Store 정책상 제거됨 (RC-2).
 */
object FamilyDangerousPermissionScanner {
    private const val TAG = "FamilyDangerousScan"

    data class ThreatHit(
        val packageName: String,
        val appLabel: String,
        val threatKind: String
    )

    fun scanInstalled(context: Context): List<ThreatHit> {
        val pm = context.packageManager
        val self = context.packageName
        val hits = mutableListOf<ThreatHit>()
        for (name in FamilyRemoteAppPackages.KNOWN_PACKAGES) {
            if (name == self || isAllowlistedRemoteTool(name)) continue
            try {
                val pkg = if (Build.VERSION.SDK_INT >= 33) {
                    pm.getPackageInfo(
                        name,
                        PackageManager.PackageInfoFlags.of(PackageManager.GET_PERMISSIONS.toLong())
                    )
                } else {
                    @Suppress("DEPRECATION")
                    pm.getPackageInfo(name, PackageManager.GET_PERMISSIONS)
                }
                val perms = pkg.requestedPermissions?.toList().orEmpty()
                val hasCamera = perms.contains(android.Manifest.permission.CAMERA)
                val hasMic = perms.contains(android.Manifest.permission.RECORD_AUDIO)
                val hasAccessibility =
                    perms.any { it.contains("BIND_ACCESSIBILITY", ignoreCase = true) }
                if (!hasCamera && !hasMic && !hasAccessibility) continue
                val label = try {
                    pm.getApplicationLabel(pkg.applicationInfo!!).toString()
                } catch (_: Exception) {
                    name
                }
                hits.add(ThreatHit(name, label, "dangerous_permission_app"))
            } catch (_: PackageManager.NameNotFoundException) {
                /* not installed */
            } catch (e: Exception) {
                Log.w(TAG, "scan $name failed", e)
            }
        }
        return hits
    }

    private fun isAllowlistedRemoteTool(packageName: String): Boolean {
        val p = packageName.lowercase()
        return p.contains("galaxycontinuity") ||
            p.contains("samsung.android.flow") ||
            p == "com.samsung.android.galaxycontinuity"
    }
}
