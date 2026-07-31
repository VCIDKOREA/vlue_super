package kr.vlue.calloverlay

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat

/**
 * 오버레이가 수신 전화 UI 아래에 깔릴 때 대비 — 풀스크린 인텐트 + 헤드업 알림.
 */
object LetteringIncomingNotifier {
    private const val TAG = "LetteringIncomingNotif"
    private const val CHANNEL_ID = "vlue_lettering_incoming"
    const val NOTIFICATION_ID = 41003

    fun ensureChannel(context: Context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val nm = context.getSystemService(NotificationManager::class.java) ?: return
        val existing = nm.getNotificationChannel(CHANNEL_ID)
        if (existing != null) return
        val channel = NotificationChannel(
            CHANNEL_ID,
            "VLUE 수신 빅푸시",
            NotificationManager.IMPORTANCE_HIGH
        ).apply {
            description = "수신 통화 시 VLUE 디지털 인증명함·쇼케이스"
            setShowBadge(false)
            lockscreenVisibility = android.app.Notification.VISIBILITY_PUBLIC
        }
        nm.createNotificationChannel(channel)
    }

    fun post(context: Context, phone: String, outgoing: Boolean) {
        try {
            val app = context.applicationContext
            ensureChannel(app)
            val title = if (outgoing) "VLUE 발신 레터링" else "VLUE 수신 빅푸시"
            val body = if (phone.isBlank() || phone == "unknown") "번호 확인 중…" else phone

            val activityIntent = LetteringRingingActivity.intent(app, phone, outgoing)
            val fullScreen = PendingIntent.getActivity(
                app,
                1,
                activityIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            val content = PendingIntent.getActivity(
                app,
                2,
                activityIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )

            val builder = NotificationCompat.Builder(app, CHANNEL_ID)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle(title)
                .setContentText(body)
                .setStyle(NotificationCompat.BigTextStyle().bigText("$title\n$body"))
                .setPriority(NotificationCompat.PRIORITY_MAX)
                .setCategory(NotificationCompat.CATEGORY_CALL)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setOngoing(true)
                .setAutoCancel(false)
                .setContentIntent(content)
                .setFullScreenIntent(fullScreen, true)
                .setTimeoutAfter(90_000L)

            NotificationManagerCompat.from(app).notify(NOTIFICATION_ID, builder.build())
            Log.i(TAG, "posted incoming notif phone=$phone outgoing=$outgoing")
        } catch (e: Exception) {
            Log.e(TAG, "post failed", e)
            LetteringPrefs.setLastOverlayError(context, "notif:${e.message}")
        }
    }

    fun cancel(context: Context) {
        try {
            NotificationManagerCompat.from(context.applicationContext).cancel(NOTIFICATION_ID)
        } catch (_: Exception) {
        }
    }
}
