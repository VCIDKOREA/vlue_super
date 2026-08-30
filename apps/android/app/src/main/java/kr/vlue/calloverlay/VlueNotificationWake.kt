package kr.vlue.calloverlay

import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.os.PowerManager
import android.util.Log
import androidx.core.app.NotificationCompat

/** VLUE OS 알림 — 화면 깨우기·풀스크린 인텐트 공통 */
object VlueNotificationWake {
    private const val TAG = "VlueNotifWake"

    fun openAppIntent(context: Context, configure: Intent.() -> Unit = {}): Intent =
        Intent(context, MainActivity::class.java).apply {
            flags =
                Intent.FLAG_ACTIVITY_NEW_TASK or
                    Intent.FLAG_ACTIVITY_SINGLE_TOP or
                    Intent.FLAG_ACTIVITY_CLEAR_TOP
            putExtra("vlue_open_from_notification", true)
            configure()
        }

    fun activityPendingIntent(
        context: Context,
        requestCode: Int,
        configure: Intent.() -> Unit = {}
    ): PendingIntent {
        val app = context.applicationContext
        val piFlags =
            PendingIntent.FLAG_UPDATE_CURRENT or
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0
        return PendingIntent.getActivity(app, requestCode, openAppIntent(app, configure), piFlags)
    }

    fun wakeScreenBriefly(context: Context, holdMs: Long = 6_000L) {
        try {
            val app = context.applicationContext
            val pm = app.getSystemService(Context.POWER_SERVICE) as? PowerManager ?: return
            if (pm.isInteractive) return
            @Suppress("DEPRECATION")
            val wl =
                pm.newWakeLock(
                    PowerManager.SCREEN_BRIGHT_WAKE_LOCK or
                        PowerManager.ACQUIRE_CAUSES_WAKEUP or
                        PowerManager.ON_AFTER_RELEASE,
                    "vlue:notification_wake"
                )
            wl.setReferenceCounted(false)
            wl.acquire(holdMs)
            Handler(Looper.getMainLooper()).postDelayed({
                try {
                    if (wl.isHeld) wl.release()
                } catch (_: Exception) {
                    /* ignore */
                }
            }, holdMs + 500L)
        } catch (e: Exception) {
            Log.w(TAG, "wakeScreenBriefly failed", e)
        }
    }

    fun attachAlertSurface(
        context: Context,
        builder: NotificationCompat.Builder,
        contentPi: PendingIntent
    ) {
        wakeScreenBriefly(context)
        builder
            .setFullScreenIntent(contentPi, true)
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setDefaults(NotificationCompat.DEFAULT_ALL)
            .setVibrate(longArrayOf(0, 420, 200, 420))
            .setLights(0xFF2563EB.toInt(), 800, 600)
            .setOnlyAlertOnce(false)
    }
}
