package kr.vlue.calloverlay.screening

import android.app.Activity
import android.app.role.RoleManager
import android.content.Context
import android.os.Build
import android.util.Log

/** ROLE_CALL_SCREENING — 프로세스 종료 후 수신 시 CallScreeningService 가 불리려면 필요하다. */
object CallScreeningRoleHelper {
    private const val TAG = "VlueCallScreening"
    private const val PREFS = "vlue_call_screening_role"
    private const val KEY_PROMPTED = "prompted"
    const val REQUEST_CODE = 48102

    fun isHeld(context: Context): Boolean {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) return false
        return try {
            val rm = context.getSystemService(RoleManager::class.java) ?: return false
            rm.isRoleHeld(RoleManager.ROLE_CALL_SCREENING)
        } catch (_: Exception) {
            false
        }
    }

    /** 인증된 사용자가 앱을 연 뒤 한 번만 시스템 역할 화면을 띄운다. */
    fun requestOnce(activity: Activity) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) return
        if (isHeld(activity)) return
        val prefs = activity.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        if (prefs.getBoolean(KEY_PROMPTED, false)) return
        try {
            val rm = activity.getSystemService(RoleManager::class.java) ?: return
            if (!rm.isRoleAvailable(RoleManager.ROLE_CALL_SCREENING)) return
            prefs.edit().putBoolean(KEY_PROMPTED, true).apply()
            activity.startActivityForResult(
                rm.createRequestRoleIntent(RoleManager.ROLE_CALL_SCREENING),
                REQUEST_CODE
            )
        } catch (e: Exception) {
            Log.w(TAG, "role request skipped", e)
        }
    }
}
