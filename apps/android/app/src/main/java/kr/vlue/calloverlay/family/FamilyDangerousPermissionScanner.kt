package kr.vlue.calloverlay.family

import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import android.util.Log

/**
 * PackageManager 기반 위험 권한 앱 스캔 (카메라·마이크·접근성·오버레이 등)
 */
object FamilyDangerousPermissionScanner {
    private const val TAG = "FamilyDangerousScan"

    data class ThreatHit(
        val packageName: String,
        val appLabel: String,
        val threatKind: String
    )

    private val DANGEROUS_PERMS = listOf(
        android.Manifest.permission.CAMERA,
        android.Manifest.permission.RECORD_AUDIO,
        android.Manifest.permission.SYSTEM_ALERT_WINDOW
    )

    fun scanInstalled(context: Context): List<ThreatHit> {
        val pm = context.packageManager
        val self = context.packageName
        val hits = mutableListOf<ThreatHit>()
        try {
            val packages = if (Build.VERSION.SDK_INT >= 33) {
                pm.getInstalledPackages(PackageManager.PackageInfoFlags.of(PackageManager.GET_PERMISSIONS.toLong()))
            } else {
                @Suppress("DEPRECATION")
                pm.getInstalledPackages(PackageManager.GET_PERMISSIONS)
            }
            for (pkg in packages) {
                val name = pkg.packageName.orEmpty()
                if (name.isEmpty() || name == self) continue
                val perms = pkg.requestedPermissions?.toList().orEmpty()
                val hasCamera = perms.contains(android.Manifest.permission.CAMERA)
                val hasMic = perms.contains(android.Manifest.permission.RECORD_AUDIO)
                val hasAccessibility = perms.any { it.contains("BIND_ACCESSIBILITY", ignoreCase = true) }
                if (!hasCamera && !hasMic && !hasAccessibility) continue

                val label = try {
                    pm.getApplicationLabel(pkg.applicationInfo).toString()
                } catch (_: Exception) {
                    name
                }
                val kind = when {
                    hasAccessibility -> "dangerous_permission_app"
                    hasCamera && hasMic -> "dangerous_permission_app"
                    else -> "dangerous_permission_app"
                }
                hits.add(ThreatHit(name, label, kind))
            }
        } catch (e: Exception) {
            Log.e(TAG, "scan failed", e)
        }
        return hits
    }
}
