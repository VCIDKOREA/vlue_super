package kr.vlue.calloverlay

import android.content.Context

/** 레터링 on/off · API 토큰 · WebView URL · 인증 가드 */
object LetteringPrefs {
    private const val NAME = "vlue_lettering_prefs"
    private const val KEY_ENABLED = "lettering_enabled"
    /** 사용자가 설정에서 명시적으로 끈 경우만 true — 재설치·로그인 자동 ON 을 막음 */
    private const val KEY_USER_OPTED_OUT = "lettering_user_opted_out"
    private const val KEY_USER_ID = "vlue_user_id"
    private const val KEY_ACCESS_TOKEN = "vlue_access_token"
    private const val KEY_DEVICE_TOKEN = "vlue_device_token"
    private const val KEY_MEMBER_PHONE = "vlue_member_phone"
    private const val KEY_IDENTITY_VERIFIED = "vlue_identity_verified"
    private const val KEY_ONBOARDING_COMPLETE = "vlue_onboarding_complete"
    private const val KEY_ACCOUNT_STATUS = "vlue_account_status"
    private const val KEY_LAST_CALL = "last_call_event"
    private const val KEY_LAST_ERR = "last_overlay_error"

    private fun prefs(context: Context) =
        context.applicationContext.getSharedPreferences(NAME, Context.MODE_PRIVATE)

    fun isUserOptedOut(context: Context): Boolean =
        prefs(context).getBoolean(KEY_USER_OPTED_OUT, false)

    /**
     * 통화 감지 ON 여부.
     * - 사용자가 명시적으로 끈 경우(쇼케이스 OFF)만 OFF
     * - **로그인+PASS/온보딩 완료** 후에만 동작
     * - 미가입·미인증 상태에서는 권한만 있어도 OFF
     */
    fun isLetteringEnabled(context: Context): Boolean {
        val p = prefs(context)
        if (p.getBoolean(KEY_USER_OPTED_OUT, false)) return false
        if (!LetteringAuthGate.canRunCallOverlay(context)) return false
        /* 명시적 ON 플래그 또는 권한 준비 완료 시 ON */
        if (p.getBoolean(KEY_ENABLED, false)) return true
        return LetteringPermissionHelper.hasCallOverlayReady(context)
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
            .putString(KEY_USER_ID, userId?.trim()?.ifEmpty { null })
            .putString(KEY_ACCESS_TOKEN, accessToken?.trim()?.ifEmpty { null })
            .apply()
    }

    fun setAuthGate(
        context: Context,
        identityVerified: Boolean,
        onboardingComplete: Boolean,
        accountStatus: String?
    ) {
        prefs(context)
            .edit()
            .putBoolean(KEY_IDENTITY_VERIFIED, identityVerified)
            .putBoolean(KEY_ONBOARDING_COMPLETE, onboardingComplete)
            .putString(KEY_ACCOUNT_STATUS, accountStatus?.trim()?.ifEmpty { null })
            .apply()
    }

    fun clearAuthSession(context: Context) {
        prefs(context)
            .edit()
            .remove(KEY_USER_ID)
            .remove(KEY_ACCESS_TOKEN)
            .remove(KEY_DEVICE_TOKEN)
            .putBoolean(KEY_IDENTITY_VERIFIED, false)
            .putBoolean(KEY_ONBOARDING_COMPLETE, false)
            .remove(KEY_ACCOUNT_STATUS)
            .apply()
    }

    fun isIdentityVerified(context: Context): Boolean =
        prefs(context).getBoolean(KEY_IDENTITY_VERIFIED, false)

    fun isOnboardingComplete(context: Context): Boolean =
        prefs(context).getBoolean(KEY_ONBOARDING_COMPLETE, false)

    fun getAccountStatus(context: Context): String =
        prefs(context).getString(KEY_ACCOUNT_STATUS, "").orEmpty()

    /** userId + accessToken 모두 존재 */
    fun hasAuthenticatedSession(context: Context): Boolean {
        val uid = getUserId(context)?.trim().orEmpty()
        val token = getAccessToken(context)?.trim().orEmpty()
        return uid.isNotEmpty() && token.isNotEmpty()
    }

    /**
     * 가입(온보딩) 완료 + PASS 본인인증 완료.
     * 온보딩 미완료·pending_identity 는 거부.
     * 게이트 키가 한 번도 동기화되지 않은 레거시 설치(이미 로그인)만 임시 허용.
     * accountStatus=active 이면 플래그 누락 레거시도 허용.
     */
    fun isIdentityReadyForOverlay(context: Context): Boolean {
        val p = prefs(context)
        val status = getAccountStatus(context).trim().lowercase()
        if (status == "pending_identity" || status == "pending" || status == "rejected") {
            return false
        }
        if (isOnboardingComplete(context)) return true
        if (isIdentityVerified(context) && status.isNotEmpty()) return true
        val gateNeverSynced =
            !p.contains(KEY_ONBOARDING_COMPLETE) && !p.contains(KEY_IDENTITY_VERIFIED)
        if (gateNeverSynced && hasAuthenticatedSession(context)) return true
        /* 활성 계정인데 웹이 false/false 를 밀어 넣은 경우 */
        if (hasAuthenticatedSession(context) && (status == "active" || status == "approved")) {
            return true
        }
        return false
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
        hasAuthenticatedSession(context) ||
            getMemberPhone(context).isNotBlank()
}
