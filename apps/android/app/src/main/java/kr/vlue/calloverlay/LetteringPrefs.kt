package kr.vlue.calloverlay

import android.content.Context

/** 레터링 on/off · API 토큰 · WebView URL */
object LetteringPrefs {
    private const val NAME = "vlue_lettering_prefs"
    private const val KEY_ENABLED = "lettering_enabled"
    /** 사용자가 설정에서 명시적으로 끈 경우만 true — 재설치·로그인 자동 ON 을 막음 */
    private const val KEY_USER_OPTED_OUT = "lettering_user_opted_out"
    private const val KEY_USER_ID = "vlue_user_id"
    private const val KEY_ACCESS_TOKEN = "vlue_access_token"
    private const val KEY_DEVICE_TOKEN = "vlue_device_token"
    private const val KEY_MEMBER_PHONE = "vlue_member_phone"
    private const val KEY_LAST_CALL = "last_call_event"
    private const val KEY_LAST_ERR = "last_overlay_error"

    private fun prefs(context: Context) =
        context.applicationContext.getSharedPreferences(NAME, Context.MODE_PRIVATE)

    fun isUserOptedOut(context: Context): Boolean =
        prefs(context).getBoolean(KEY_USER_OPTED_OUT, false)

    /**
     * 통화 감지 ON 여부.
     * - 사용자가 명시적으로 끈 경우만 OFF
     * - 전화·오버레이 권한이 준비되면 자동 ON (다른 유저·재설치 후 수동 맞춤 불필요)
     * - 그 외에는 저장 플래그
     */
    fun isLetteringEnabled(context: Context): Boolean {
        val p = prefs(context)
        if (p.getBoolean(KEY_USER_OPTED_OUT, false)) return false
        if (LetteringPermissionHelper.hasCallOverlayReady(context)) return true
        return p.getBoolean(KEY_ENABLED, false)
    }

    fun setLetteringEnabled(context: Context, enabled: Boolean) {
        prefs(context)
            .edit()
            .putBoolean(KEY_ENABLED, enabled)
            .putBoolean(KEY_USER_OPTED_OUT, !enabled)
            .apply()
        LetteringCallMonitorService.syncWithPrefs(context)
    }

    fun getUserId(context: Context): String? =
        prefs(context).getString(KEY_USER_ID, null)

    fun getAccessToken(context: Context): String? =
        prefs(context).getString(KEY_ACCESS_TOKEN, null)

    fun getDeviceToken(context: Context): String? =
        prefs(context).getString(KEY_DEVICE_TOKEN, null)

    fun setDeviceToken(context: Context, deviceToken: String?) {
        prefs(context)
            .edit()
            .putString(KEY_DEVICE_TOKEN, deviceToken?.trim()?.ifEmpty { null })
            .apply()
    }

    fun setSession(context: Context, userId: String?, accessToken: String?) {
        prefs(context)
            .edit()
            .putString(KEY_USER_ID, userId)
            .putString(KEY_ACCESS_TOKEN, accessToken)
            .apply()
    }

    fun getMemberPhone(context: Context): String =
        prefs(context).getString(KEY_MEMBER_PHONE, "").orEmpty()

    fun setMemberPhone(context: Context, phone: String?) {
        prefs(context)
            .edit()
            .putString(KEY_MEMBER_PHONE, phone?.trim().orEmpty())
            .apply()
    }

    fun setLastCallEvent(context: Context, event: String) {
        prefs(context)
            .edit()
            .putString(KEY_LAST_CALL, "${System.currentTimeMillis()}|$event")
            .apply()
    }

    fun getLastCallEvent(context: Context): String =
        prefs(context).getString(KEY_LAST_CALL, "") ?: ""

    fun setLastOverlayError(context: Context, error: String) {
        prefs(context)
            .edit()
            .putString(KEY_LAST_ERR, "${System.currentTimeMillis()}|$error")
            .apply()
    }

    fun getLastOverlayError(context: Context): String =
        prefs(context).getString(KEY_LAST_ERR, "") ?: ""

    fun hasAnySession(context: Context): Boolean =
        !getUserId(context).isNullOrBlank() ||
            getMemberPhone(context).isNotBlank() ||
            !getAccessToken(context).isNullOrBlank()
}
