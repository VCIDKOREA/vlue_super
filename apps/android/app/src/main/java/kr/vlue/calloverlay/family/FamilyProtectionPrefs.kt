package kr.vlue.calloverlay.family

import android.content.Context

/** 이미 보고한 원격앱 패키지 — 중복 알림 방지 */
object FamilyProtectionPrefs {
    private const val PREFS = "vlue_family_protection"
    private const val KEY_REPORTED_APPS = "reported_remote_apps"

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
}
