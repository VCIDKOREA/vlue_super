package kr.vlue.calloverlay.family

import android.content.Context
import android.content.pm.PackageManager
import android.util.Log

/**
 * TeamViewer, AnyDesk 등 — QUERY_ALL_PACKAGES 없이 알려진 packageId만 조회.
 * Manifest `<queries>` + [FamilyRemoteAppPackages] 동기.
 */
object FamilyRemoteAppScanner {
    private const val TAG = "FamilyRemoteApps"

    fun scanInstalled(context: Context): List<String> {
        val pm = context.packageManager
        val found = linkedSetOf<String>()
        for (pkgName in FamilyRemoteAppPackages.KNOWN_PACKAGES) {
            if (isInstalled(pm, pkgName) &&
                FamilyRemoteAppPackages.matchesRemotePattern(pkgName)
            ) {
                found.add(pkgName)
            }
        }
        return found.toList()
    }

    private fun isInstalled(pm: PackageManager, packageName: String): Boolean =
        try {
            if (android.os.Build.VERSION.SDK_INT >= 33) {
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
