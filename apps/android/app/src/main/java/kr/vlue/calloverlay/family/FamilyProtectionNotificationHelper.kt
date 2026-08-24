package kr.vlue.calloverlay.family

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import kr.vlue.calloverlay.MainActivity
import kr.vlue.calloverlay.R

/** 가족 보호 FCM·초대 OS 알림 — 앱 미실행 시에도 카카오톡처럼 표시 */
object FamilyProtectionNotificationHelper {
    /** v2: 기존 채널이 LOW로 만들어진 기기에서도 헤드업·상단 유지 */
    const val CHANNEL_ID = "family_protection_invite_v2"
    private const val CHANNEL_NAME = "가족 보호 초대"
    const val ACTION_ACCEPT = "kr.vlue.app.action.FAMILY_INVITE_ACCEPT"
    const val ACTION_REJECT = "kr.vlue.app.action.FAMILY_INVITE_REJECT"
    const val EXTRA_LINK_ID = "linkId"

    fun ensureChannel(context: Context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val nm = context.getSystemService(NotificationManager::class.java) ?: return
        val existing = nm.getNotificationChannel(CHANNEL_ID)
        if (existing != null) {
            if (existing.importance < NotificationManager.IMPORTANCE_HIGH) {
                nm.deleteNotificationChannel(CHANNEL_ID)
            } else {
                return
            }
        }
        val channel =
            NotificationChannel(CHANNEL_ID, CHANNEL_NAME, NotificationManager.IMPORTANCE_HIGH).apply {
                description = "가족 보호 초대·수락·거절 — 앱이 꺼져 있어도 표시"
                enableVibration(true)
                enableLights(true)
                setShowBadge(true)
                setBypassDnd(false)
                lockscreenVisibility = NotificationCompat.VISIBILITY_PUBLIC
            }
        nm.createNotificationChannel(channel)
    }

    fun notificationIdForLink(linkId: String): Int =
        (linkId.hashCode() and 0x7fffffff) % 100_000 + 8300

    fun cancelInvite(context: Context, linkId: String) {
        val safe = linkId.trim()
        if (safe.isEmpty()) return
        try {
            NotificationManagerCompat.from(context.applicationContext)
                .cancel(safe, notificationIdForLink(safe))
        } catch (_: Exception) {
            /* ignore */
        }
    }

    fun showInvite(context: Context, title: String, body: String, linkId: String) {
        val app = context.applicationContext
        ensureChannel(app)
        val safeLinkId = linkId.trim()
        val safeTitle = title.ifBlank { "가족 보호 초대" }
        val safeBody =
            body.ifBlank {
                "가족 보호 승인 요청이 도착했습니다. 수락 또는 거절해 주세요."
            }
        if (safeLinkId.isEmpty()) {
            kr.vlue.calloverlay.VlueSystemNotifier.show(app, safeTitle, safeBody, "family-invite")
            return
        }

        val open =
            Intent(app, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
                putExtra("vlue_open_from_notification", true)
                putExtra("vlue_family_link_id", safeLinkId)
                putExtra("vlue_family_invite_action", "open")
            }
        val piFlags =
            PendingIntent.FLAG_UPDATE_CURRENT or
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0

        val contentPi = PendingIntent.getActivity(app, safeLinkId.hashCode(), open, piFlags)
        val acceptPi =
            PendingIntent.getBroadcast(
                app,
                ("accept-$safeLinkId").hashCode(),
                Intent(app, FamilyInviteActionReceiver::class.java).apply {
                    action = ACTION_ACCEPT
                    putExtra(EXTRA_LINK_ID, safeLinkId)
                },
                piFlags
            )
        val rejectPi =
            PendingIntent.getBroadcast(
                app,
                ("reject-$safeLinkId").hashCode(),
                Intent(app, FamilyInviteActionReceiver::class.java).apply {
                    action = ACTION_REJECT
                    putExtra(EXTRA_LINK_ID, safeLinkId)
                },
                piFlags
            )

        val notification =
            NotificationCompat.Builder(app, CHANNEL_ID)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle(safeTitle)
                .setContentText(safeBody)
                .setStyle(
                    NotificationCompat.BigTextStyle()
                        .setBigContentTitle(safeTitle)
                        .bigText(safeBody)
                        .setSummaryText("수락 또는 거절")
                )
                .setPriority(NotificationCompat.PRIORITY_MAX)
                .setCategory(NotificationCompat.CATEGORY_MESSAGE)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setDefaults(NotificationCompat.DEFAULT_ALL)
                .setVibrate(longArrayOf(0, 400, 200, 400))
                .setOnlyAlertOnce(false)
                /* 수락/거절 전까지 알림함에 유지 (헤드업만 잠깐 뜨는 문제 보완) */
                .setOngoing(true)
                .setAutoCancel(false)
                .setContentIntent(contentPi)
                .addAction(0, "수락", acceptPi)
                .addAction(0, "거절", rejectPi)
                .build()

        val id = notificationIdForLink(safeLinkId)
        try {
            NotificationManagerCompat.from(app).notify(safeLinkId, id, notification)
        } catch (_: SecurityException) {
            /* POST_NOTIFICATIONS 거부 */
        }
    }

    fun showAlert(context: Context, title: String, body: String, tag: String?) {
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
        val safeTitle = title.ifBlank { "VLUE" }
        val safeBody = body.ifBlank { title }
        val notification =
            NotificationCompat.Builder(app, CHANNEL_ID)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle(safeTitle)
                .setContentText(safeBody)
                .setStyle(
                    NotificationCompat.BigTextStyle()
                        .setBigContentTitle(safeTitle)
                        .bigText(safeBody)
                )
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setCategory(NotificationCompat.CATEGORY_STATUS)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setDefaults(NotificationCompat.DEFAULT_ALL)
                .setAutoCancel(true)
                .setContentIntent(pi)
                .build()
        val id =
            if (!tag.isNullOrBlank()) {
                (tag.hashCode() and 0x7fffffff) % 100_000 + 8400
            } else {
                8400
            }
        try {
            NotificationManagerCompat.from(app).notify(tag ?: "family-alert", id, notification)
        } catch (_: SecurityException) {
            /* ignore */
        }
    }
}
