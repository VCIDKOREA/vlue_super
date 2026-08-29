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
    private const val SHOWCASE_CHANNEL_ID = "showcase_social"
    private const val CHANNEL_NAME = "VLUE 알림"
    private const val SHOWCASE_CHANNEL_NAME = "쇼케이스 알림"
    private val nextId = AtomicInteger(7100)

    fun ensureChannel(context: Context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val nm = context.getSystemService(NotificationManager::class.java) ?: return
        val existing = nm.getNotificationChannel(CHANNEL_ID)
        if (existing != null) {
            if (existing.importance < NotificationManager.IMPORTANCE_HIGH) {
                nm.deleteNotificationChannel(CHANNEL_ID)
            }
        }
        if (nm.getNotificationChannel(CHANNEL_ID) == null) {
            val channel =
                NotificationChannel(CHANNEL_ID, CHANNEL_NAME, NotificationManager.IMPORTANCE_HIGH).apply {
                    description = "공지·쇼케이스·관리자 알림 — 화면 꺼짐 시 깨움"
                    enableVibration(true)
                    enableLights(true)
                    setShowBadge(true)
                    lockscreenVisibility = android.app.Notification.VISIBILITY_PUBLIC
                }
            nm.createNotificationChannel(channel)
        }
        if (nm.getNotificationChannel(SHOWCASE_CHANNEL_ID) == null) {
            val showcase =
                NotificationChannel(SHOWCASE_CHANNEL_ID, SHOWCASE_CHANNEL_NAME, NotificationManager.IMPORTANCE_HIGH).apply {
                    description = "쇼케이스 좋아요·댓글·공유 알림"
                    enableVibration(true)
                    setShowBadge(true)
                }
            nm.createNotificationChannel(showcase)
        }
    }

    fun show(
        context: Context,
        title: String,
        body: String,
        tag: String? = null
    ) {
        val app = context.applicationContext
        val tagSafe = tag.orEmpty()
        val isFamily =
            tagSafe.contains("family", ignoreCase = true) ||
                title.contains("가족") ||
                body.contains("가족 보호")
        if (isFamily) {
            try {
                kr.vlue.calloverlay.family.FamilyProtectionNotificationHelper.showAlert(
                    app,
                    title,
                    body,
                    tag
                )
                return
            } catch (_: Exception) {
                /* fall through */
            }
        }

        ensureChannel(app)
        /* 카카오톡형 — 화면 꺼짐 시 잠깐 켜서 헤드업 알림 표시 */
        try {
            kr.vlue.calloverlay.family.FamilyProtectionNotificationHelper.wakeScreenBriefly(app, 5_000L)
        } catch (_: Exception) {
            /* ignore */
        }
        val open =
            Intent(app, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP
                putExtra("vlue_open_from_notification", true)
            }
        val piFlags =
            PendingIntent.FLAG_UPDATE_CURRENT or
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0
        val pi = PendingIntent.getActivity(app, 0, open, piFlags)
        val safeTitle = title.ifBlank { "VLUE" }
        val fullBody = body.ifBlank { safeTitle }.trim()
        val lines =
            fullBody
                .replace("\r\n", "\n")
                .lines()
                .map { it.trim() }
                .filter { it.isNotEmpty() }
        val hunTitle = lines.getOrElse(0) { safeTitle }
        val hunText =
            lines.getOrElse(1) {
                if (safeTitle != hunTitle) safeTitle else lines.getOrElse(0) { safeTitle }
            }
        val notification =
            NotificationCompat.Builder(app, CHANNEL_ID)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle(hunTitle)
                .setContentText(hunText)
                .setStyle(
                    NotificationCompat.BigTextStyle()
                        .setBigContentTitle(safeTitle)
                        .bigText(fullBody)
                )
                .setPriority(NotificationCompat.PRIORITY_MAX)
                .setCategory(NotificationCompat.CATEGORY_MESSAGE)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setDefaults(NotificationCompat.DEFAULT_ALL)
                .setVibrate(longArrayOf(0, 380, 180, 380))
                .setLights(0xFF2563EB.toInt(), 700, 500)
                .setOnlyAlertOnce(false)
                .setAutoCancel(true)
                .setContentIntent(pi)
                .build()

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
