package kr.vlue.calloverlay

import android.content.Context

/** 레터링 on/off · API 토큰 · WebView URL */
object LetteringPrefs {
    private const val NAME = "vlue_lettering_prefs"
    private const val KEY_ENABLED = "lettering_enabled"
    private const val KEY_USER_ID = "vlue_user_id"
    private const val KEY_ACCESS_TOKEN = "vlue_access_token"
    private const val KEY_MEMBER_PHONE = "vlue_member_phone"
    private const val KEY_LAST_CALL = "last_call_event"
    private const val KEY_LAST_ERR = "last_overlay_error"

    fun isLetteringEnabled(context: Context): Boolean {
        return context.getSharedPreferences(NAME, Context.MODE_PRIVATE)
            .getBoolean(KEY_ENABLED, false)
    }

    fun setLetteringEnabled(context: Context, enabled: Boolean) {
        context.getSharedPreferences(NAME, Context.MODE_PRIVATE)
            .edit()
            .putBoolean(KEY_ENABLED, enabled)
            .apply()
        LetteringCallMonitorService.syncWithPrefs(context)
    }

    fun getUserId(context: Context): String? =
        context.getSharedPreferences(NAME, Context.MODE_PRIVATE).getString(KEY_USER_ID, null)

    fun getAccessToken(context: Context): String? =
        context.getSharedPreferences(NAME, Context.MODE_PRIVATE).getString(KEY_ACCESS_TOKEN, null)

    fun setSession(context: Context, userId: String?, accessToken: String?) {
        context.getSharedPreferences(NAME, Context.MODE_PRIVATE)
            .edit()
            .putString(KEY_USER_ID, userId)
            .putString(KEY_ACCESS_TOKEN, accessToken)
            .apply()
    }

    fun getMemberPhone(context: Context): String =
        context.getSharedPreferences(NAME, Context.MODE_PRIVATE)
            .getString(KEY_MEMBER_PHONE, "")
            .orEmpty()

    fun setMemberPhone(context: Context, phone: String?) {
        context.getSharedPreferences(NAME, Context.MODE_PRIVATE)
            .edit()
            .putString(KEY_MEMBER_PHONE, phone?.trim().orEmpty())
            .apply()
    }

    fun setLastCallEvent(context: Context, event: String) {
        context.getSharedPreferences(NAME, Context.MODE_PRIVATE)
            .edit()
            .putString(KEY_LAST_CALL, "${System.currentTimeMillis()}|$event")
            .apply()
    }

    fun getLastCallEvent(context: Context): String =
        context.getSharedPreferences(NAME, Context.MODE_PRIVATE).getString(KEY_LAST_CALL, "") ?: ""

    fun setLastOverlayError(context: Context, error: String) {
        context.getSharedPreferences(NAME, Context.MODE_PRIVATE)
            .edit()
            .putString(KEY_LAST_ERR, "${System.currentTimeMillis()}|$error")
            .apply()
    }

    fun getLastOverlayError(context: Context): String =
        context.getSharedPreferences(NAME, Context.MODE_PRIVATE).getString(KEY_LAST_ERR, "") ?: ""
}
