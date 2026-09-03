package kr.vlue.calloverlay

import android.app.Application
import android.util.Log
import androidx.appcompat.app.AppCompatActivity

/**
 * VLUE 메인 앱 진입점에서 호출 — 레터링 모듈 초기화·권한·세션
 * (기존 MainActivity에 merge 시 Application.onCreate + Activity.onResume 에 연결)
 */
object LetteringIntegration {
    private const val TAG = "VlueLettering"

    fun onApplicationCreate(app: Application) {
        try {
            Log.i(TAG, "lettering module ready api=${VlueLetteringConfig.apiBaseUrl} web=${VlueLetteringConfig.webBaseUrl}")
            LetteringCallMonitorService.syncWithPrefs(app)
        } catch (e: Exception) {
            Log.e(TAG, "onApplicationCreate failed", e)
        }
    }

    fun onMainActivityReady(activity: AppCompatActivity) {
        try {
            /*
             * 재설치·세션만 남은 경우: 권한·로그인 있으면 통화 감지를 자동 ON.
             * 웹 쇼케이스 토글과 무관하게 빅푸시가 동작해야 신뢰가 유지된다.
             */
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
     * 전화/오버레이 권한 + (세션 또는 멤버 번호) 있으면 lettering_enabled 을 켠다.
     * 사용자가 매번 설정을 다시 맞추지 않아도 되게.
     */
    fun ensureLetteringArmedIfReady(context: android.content.Context) {
        val app = context.applicationContext
        if (!LetteringPermissionHelper.hasCallOverlayReady(app)) return
        val hasSession =
            !LetteringPrefs.getUserId(app).isNullOrBlank() ||
                LetteringPrefs.getMemberPhone(app).isNotBlank() ||
                !LetteringPrefs.getAccessToken(app).isNullOrBlank()
        if (!hasSession && !LetteringPrefs.isLetteringEnabled(app)) return
        if (!LetteringPrefs.isLetteringEnabled(app)) {
            Log.i(TAG, "auto-arm lettering (permissions ready + session)")
            LetteringPrefs.setLetteringEnabled(app, true)
        } else {
            LetteringCallMonitorService.syncWithPrefs(app)
        }
    }

    fun bindUserSession(activity: AppCompatActivity, userId: String?, accessToken: String?) {
        try {
            LetteringPrefs.setSession(activity, userId, accessToken)
            ensureLetteringArmedIfReady(activity)
        } catch (e: Exception) {
            Log.e(TAG, "bindUserSession failed", e)
        }
    }
}
