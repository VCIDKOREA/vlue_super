package kr.vlue.calloverlay.family

import android.content.Context
import android.content.pm.PackageManager
import android.util.Log

/**
 * TeamViewer, AnyDesk 등 — apps/api remoteControlApps.ts 와 동일 패턴
 */
object FamilyRemoteAppScanner {
    private const val TAG = "FamilyRemoteApps"

    private val PACKAGE_PATTERNS = listOf(
        "teamviewer",
        "anydesk",
        "rustdesk",
        "chromeremotedesktop",
        "splashtop",
        "ultraviewer",
        "supremo",
        "ammyy",
        "logmein",
        "parsec",
        "airdroid",
        "microsoft.remote",
        "msrdc"
    )

    fun scanInstalled(context: Context): List<String> {
        val pm = context.packageManager
        val found = linkedSetOf<String>()
        try {
            val packages = if (android.os.Build.VERSION.SDK_INT >= 33) {
                pm.getInstalledPackages(PackageManager.PackageInfoFlags.of(0))
            } else {
                @Suppress("DEPRECATION")
                pm.getInstalledPackages(0)
            }
            for (pkg in packages) {
                val name = pkg.packageName?.lowercase().orEmpty()
                if (name.isEmpty()) continue
                if (PACKAGE_PATTERNS.any { name.contains(it) }) {
                    found.add(pkg.packageName)
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "scan failed", e)
        }
        return found.toList()
    }
}
