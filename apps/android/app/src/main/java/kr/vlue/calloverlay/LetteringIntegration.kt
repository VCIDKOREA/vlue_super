package kr.vlue.calloverlay

import android.app.Application
import android.util.Log
import androidx.appcompat.app.AppCompatActivity

/**
 * VLUE 메인 앱 진입점에서 호출 — 레터링 모듈 초기화·권한·세션
 * 모든 유저·재설치 후 수동 맞춤 없이 통화 감지가 붙도록 자동 무장.
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
            if (LetteringPrefs.isLetteringEnabled(activity) &&
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
     * 로그인·권한 준비 시 통화 감지 자동 ON.
     * 사용자가 설정에서 명시적으로 끈 경우(opt-out)만 건너뛴다.
     */
    fun ensureLetteringArmedIfReady(context: android.content.Context) {
        val app = context.applicationContext
        if (LetteringPrefs.isUserOptedOut(app)) {
            LetteringCallMonitorService.syncWithPrefs(app)
            return
        }
        val ready = LetteringPermissionHelper.hasCallOverlayReady(app)
        val hasSession = LetteringPrefs.hasAnySession(app)
        when {
            ready -> {
                Log.i(TAG, "auto-arm lettering (permissions ready)")
                LetteringPrefs.setLetteringEnabled(app, true)
            }
            hasSession -> {
                Log.i(TAG, "auto-arm lettering flag (session, awaiting permissions)")
                LetteringPrefs.setLetteringEnabled(app, true)
            }
            else -> LetteringCallMonitorService.syncWithPrefs(app)
        }
    }

    fun bindUserSession(activity: AppCompatActivity, userId: String?, accessToken: String?) {
        try {
            LetteringPrefs.setSession(activity, userId, accessToken)
            /* 로그인 = 통화 감지 사용 의사 — opt-out 이 아니면 무조건 무장 시도 */
            if (!LetteringPrefs.isUserOptedOut(activity)) {
                LetteringPrefs.setLetteringEnabled(activity, true)
            }
            ensureLetteringArmedIfReady(activity)
            if (!LetteringPermissionHelper.hasCallOverlayReady(activity) &&
                !LetteringPrefs.isUserOptedOut(activity) &&
                activity is MainActivity
            ) {
                activity.runOnUiThread {
                    activity.promptLetteringPermissions()
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "bindUserSession failed", e)
        }
    }
}
