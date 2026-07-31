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

    fun bindUserSession(activity: AppCompatActivity, userId: String?, accessToken: String?) {
        try {
            LetteringPrefs.setSession(activity, userId, accessToken)
        } catch (e: Exception) {
            Log.e(TAG, "bindUserSession failed", e)
        }
    }
}
