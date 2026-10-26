package kr.vlue.calloverlay

import android.app.Application
import android.content.Intent
import android.util.Log
import androidx.appcompat.app.AppCompatActivity

/**
 * VLUÉ 메인 앱 진입점에서 호출 — 레터링 모듈 초기화·권한·세션
 * PASS 본인인증·가입 완료 후에만 통화 감지/오버레이를 무장한다.
 */
object LetteringIntegration {
    private const val TAG = "VlueLettering"

    fun onApplicationCreate(app: Application) {
        try {
            Log.i(TAG, "lettering module ready api=${VlueLetteringConfig.apiBaseUrl} web=${VlueLetteringConfig.webBaseUrl}")
            ensureLetteringArmedIfReady(app)
            LetteringCallMonitorService.syncWithPrefs(app)
        } catch (e: Exception) {
            Log.e(TAG, "onApplicationCreate failed", e)
        }
    }

    fun onMainActivityReady(activity: AppCompatActivity) {
        try {
            ensureLetteringArmedIfReady(activity)
            if (LetteringAuthGate.canRunCallOverlay(activity) &&
                LetteringPrefs.isLetteringEnabled(activity) &&
                !LetteringPermissionHelper.allGranted(activity)
            ) {
                Log.w(TAG, "lettering enabled but permissions missing")
            }
            LetteringCallMonitorService.syncWithPrefs(activity)
        } catch (e: Exception) {
            Log.e(TAG, "onMainActivityReady failed", e)
        }
    }

    /**
     * 로그인·PASS/온보딩·권한 준비 시에만 통화 감지 자동 ON.
     * 미가입·미인증이면 모니터/오버레이를 끈다.
     */
    fun ensureLetteringArmedIfReady(context: android.content.Context) {
        val app = context.applicationContext
        if (LetteringPrefs.isUserOptedOut(app)) {
            LetteringCallMonitorService.syncWithPrefs(app)
            return
        }
        if (!LetteringAuthGate.canRunCallOverlay(app)) {
            Log.i(TAG, "disarm lettering — ${LetteringAuthGate.denyReason(app)}")
            LetteringCallMonitorService.syncWithPrefs(app)
            return
        }
        val ready = LetteringPermissionHelper.hasCallOverlayReady(app)
        if (ready) {
            Log.i(TAG, "auto-arm lettering (authenticated + permissions ready)")
        } else {
            Log.i(TAG, "auto-arm lettering flag (authenticated, awaiting permissions)")
        }
        LetteringPrefs.setLetteringEnabled(app, true)
    }

    /** 웹 호환 2인자 — 세션만 갱신. 인증 게이트는 [applyAuthGate] 로 별도 동기화. */
    fun bindUserSession(activity: AppCompatActivity, userId: String?, accessToken: String?) {
        try {
            val uid = userId?.trim().orEmpty()
            val tok = accessToken?.trim().orEmpty()
            if (uid.isEmpty() || tok.isEmpty()) {
                clearUserSession(activity)
                return
            }
            LetteringPrefs.setSession(activity, uid, tok)
            if (!LetteringAuthGate.canRunCallOverlay(activity)) {
                Log.i(TAG, "session tokens set — overlay still disarmed (${LetteringAuthGate.denyReason(activity)})")
                LetteringCallMonitorService.syncWithPrefs(activity)
                dismissOverlayQuietly(activity)
                return
            }
            if (!LetteringPrefs.isUserOptedOut(activity)) {
                LetteringPrefs.setLetteringEnabled(activity, true)
            }
            ensureLetteringArmedIfReady(activity)
            maybePromptPermissions(activity)
        } catch (e: Exception) {
            Log.e(TAG, "bindUserSession failed", e)
        }
    }

    /** PASS/온보딩 상태 동기화 — 완료 시에만 오버레이 무장 */
    fun applyAuthGate(
        context: android.content.Context,
        identityVerified: Boolean,
        onboardingComplete: Boolean,
        accountStatus: String?
    ) {
        try {
            LetteringPrefs.setAuthGate(context, identityVerified, onboardingComplete, accountStatus)
            if (!LetteringAuthGate.canRunCallOverlay(context)) {
                Log.i(TAG, "auth gate applied — overlay disarmed (${LetteringAuthGate.denyReason(context)})")
                LetteringCallMonitorService.syncWithPrefs(context)
                dismissOverlayQuietly(context)
                return
            }
            if (!LetteringPrefs.isUserOptedOut(context)) {
                LetteringPrefs.setLetteringEnabled(context, true)
            }
            ensureLetteringArmedIfReady(context)
            if (context is AppCompatActivity) {
                maybePromptPermissions(context)
            }
        } catch (e: Exception) {
            Log.e(TAG, "applyAuthGate failed", e)
        }
    }

    fun clearUserSession(context: android.content.Context) {
        try {
            LetteringPrefs.clearAuthSession(context)
            LetteringCallMonitorService.syncWithPrefs(context)
            dismissOverlayQuietly(context)
            Log.i(TAG, "session cleared — call overlay disarmed")
        } catch (e: Exception) {
            Log.e(TAG, "clearUserSession failed", e)
        }
    }

    private fun maybePromptPermissions(activity: AppCompatActivity) {
        if (!LetteringAuthGate.canRunCallOverlay(activity)) return
        if (LetteringPrefs.isUserOptedOut(activity)) return
        if (LetteringPermissionHelper.hasCallOverlayReady(activity)) return
        if (activity !is MainActivity) return
        activity.runOnUiThread {
            activity.promptLetteringPermissions()
        }
    }

    private fun dismissOverlayQuietly(context: android.content.Context) {
        try {
            val app = context.applicationContext
            val intent = Intent(app, CallOverlayService::class.java).apply {
                action = CallOverlayService.ACTION_DISMISS
            }
            app.startService(intent)
        } catch (_: Exception) {
        }
    }
}
