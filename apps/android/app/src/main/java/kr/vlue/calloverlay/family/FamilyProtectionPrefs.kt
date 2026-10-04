package kr.vlue.calloverlay.family

import android.content.Context

/** 이미 보고한 원격앱 패키지 — 중복 알림 방지 + 원격 차단 상태 */
object FamilyProtectionPrefs {
    private const val PREFS = "vlue_family_protection"
    private const val KEY_REPORTED_APPS = "reported_remote_apps"
    private const val KEY_REPORTED_DANGEROUS = "reported_dangerous_apps"
    private const val KEY_REMOTE_BLOCK = "remote_block_active"
    private const val KEY_REMOTE_BLOCK_PKG = "remote_block_package"

    fun loadReportedPackages(context: Context): Set<String> {
        val raw = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .getStringSet(KEY_REPORTED_APPS, emptySet())
        return raw?.toSet() ?: emptySet()
    }

    fun saveReportedPackages(context: Context, packages: Set<String>) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .edit()
            .putStringSet(KEY_REPORTED_APPS, packages)
            .apply()
    }

    fun loadReportedDangerousPackages(context: Context): Set<String> {
        val raw = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .getStringSet(KEY_REPORTED_DANGEROUS, emptySet())
        return raw?.toSet() ?: emptySet()
    }

    fun saveReportedDangerousPackages(context: Context, packages: Set<String>) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .edit()
            .putStringSet(KEY_REPORTED_DANGEROUS, packages)
            .apply()
    }

    fun setRemoteBlockActive(context: Context, active: Boolean, packageName: String = "") {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .edit()
            .putBoolean(KEY_REMOTE_BLOCK, active)
            .putString(KEY_REMOTE_BLOCK_PKG, if (active) packageName else "")
            .apply()
    }

    fun isRemoteBlockActive(context: Context): Boolean =
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .getBoolean(KEY_REMOTE_BLOCK, false)

    fun remoteBlockPackage(context: Context): String =
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .getString(KEY_REMOTE_BLOCK_PKG, "")
            .orEmpty()
}
