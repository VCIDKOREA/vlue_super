package kr.vlue.calloverlay

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import java.util.concurrent.atomic.AtomicInteger

/**
 * 앱 WebView(SSE·알림함)에서 오는 중요 알림을 OS 상태바 푸시로 표시.
 * (Android 앱에 FCM 토큰이 아직 없을 때도 포그라운드/SSE 수신 시 기본 푸시 UX 보장)
 */
object VlueSystemNotifier {
    private const val CHANNEL_ID = "vlue_app_alerts"
    private const val CHANNEL_NAME = "VLUE 알림"
    private val nextId = AtomicInteger(7100)

    fun ensureChannel(context: Context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val nm = context.getSystemService(NotificationManager::class.java) ?: return
        val existing = nm.getNotificationChannel(CHANNEL_ID)
        if (existing != null) return
        val channel =
            NotificationChannel(CHANNEL_ID, CHANNEL_NAME, NotificationManager.IMPORTANCE_HIGH).apply {
                description = "가족 보호·초대·팔로우 등 앱 알림"
                enableVibration(true)
                setShowBadge(true)
            }
        nm.createNotificationChannel(channel)
    }

    fun show(
        context: Context,
        title: String,
        body: String,
        tag: String? = null
    ) {
        val app = context.applicationContext
        ensureChannel(app)
        val open =
            Intent(app, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP
                putExtra("vlue_open_from_notification", true)
            }
        val piFlags =
            PendingIntent.FLAG_UPDATE_CURRENT or
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0
        val pi = PendingIntent.getActivity(app, 0, open, piFlags)
        val notification =
            NotificationCompat.Builder(app, CHANNEL_ID)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle(title.ifBlank { "VLUE" })
                .setContentText(body.ifBlank { title }.lineSequence().firstOrNull() ?: title)
                .setStyle(
                    NotificationCompat.BigTextStyle()
                        .setBigContentTitle(title.ifBlank { "VLUE" })
                        .bigText(body.ifBlank { title })
                )
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setCategory(NotificationCompat.CATEGORY_MESSAGE)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setDefaults(NotificationCompat.DEFAULT_ALL)
                .setAutoCancel(true)
                .setContentIntent(pi)
                .build()

        /* 가족 초대 등 중요 알림 — 화면 꺼짐 시 잠깐 깨우기 */
        val tagSafe = tag.orEmpty()
        if (tagSafe.contains("family", ignoreCase = true) || title.contains("가족")) {
            try {
                kr.vlue.calloverlay.family.FamilyProtectionNotificationHelper.wakeScreenBriefly(app, 5_000L)
            } catch (_: Exception) {
                /* ignore */
            }
        }
        val id =
            if (!tag.isNullOrBlank()) {
                (tag.hashCode() and 0x7fffffff) % 100_000 + 7200
            } else {
                nextId.getAndIncrement()
            }
        try {
            NotificationManagerCompat.from(app).notify(tag ?: "vlue", id, notification)
        } catch (_: SecurityException) {
            /* POST_NOTIFICATIONS 거부 */
        }
    }
}
