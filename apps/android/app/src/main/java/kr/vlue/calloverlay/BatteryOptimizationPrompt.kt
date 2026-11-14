package kr.vlue.calloverlay

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
import android.util.Log

/** 배터리 최적화가 꺼져 있지 않을 때만 시스템 허용 화면을 한 번 연다. */
object BatteryOptimizationPrompt {
    private const val TAG = "VlueBatteryOpt"
    @Volatile
    private var askedThisProcess = false

    fun requestIfNeeded(activity: Activity) {
        if (askedThisProcess) return
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) return
        val pm = activity.getSystemService(Context.POWER_SERVICE) as? PowerManager ?: return
        if (pm.isIgnoringBatteryOptimizations(activity.packageName)) return
        askedThisProcess = true
        try {
            activity.startActivity(
                Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).apply {
                    data = Uri.parse("package:${activity.packageName}")
                }
            )
        } catch (e: Exception) {
            askedThisProcess = false
            Log.w(TAG, "battery optimization request skipped", e)
        }
    }
}
