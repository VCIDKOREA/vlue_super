package kr.vlue.calloverlay.family

import android.app.Activity
import android.view.WindowManager

/** 민감 화면 구간만 FLAG_SECURE — 스크린샷·화면 녹화 차단 */
object ScreenSecureHelper {
    fun setEnabled(activity: Activity, enabled: Boolean) {
        activity.runOnUiThread {
            if (enabled) {
                activity.window.setFlags(
                    WindowManager.LayoutParams.FLAG_SECURE,
                    WindowManager.LayoutParams.FLAG_SECURE
                )
            } else {
                activity.window.clearFlags(WindowManager.LayoutParams.FLAG_SECURE)
            }
        }
    }
}
