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
    const val CHANNEL_ID = "family_protection"
    private const val CHANNEL_NAME = "가족 보호"
    const val ACTION_ACCEPT = "kr.vlue.app.action.FAMILY_INVITE_ACCEPT"
    const val ACTION_REJECT = "kr.vlue.app.action.FAMILY_INVITE_REJECT"
    const val EXTRA_LINK_ID = "linkId"

    fun ensureChannel(context: Context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val nm = context.getSystemService(NotificationManager::class.java) ?: return
        if (nm.getNotificationChannel(CHANNEL_ID) != null) return
        val channel =
            NotificationChannel(CHANNEL_ID, CHANNEL_NAME, NotificationManager.IMPORTANCE_HIGH).apply {
                description = "가족 보호 초대·수락·거절·보호 알림"
                enableVibration(true)
                setShowBadge(true)
            }
        nm.createNotificationChannel(channel)
    }

    fun showInvite(context: Context, title: String, body: String, linkId: String) {
        val app = context.applicationContext
        ensureChannel(app)
        val safeLinkId = linkId.trim()
        if (safeLinkId.isEmpty()) {
            kr.vlue.calloverlay.VlueSystemNotifier.show(app, title, body, "family-invite")
            return
        }

        val open =
            Intent(app, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP
                putExtra("vlue_open_from_notification", true)
                putExtra("vlue_family_link_id", safeLinkId)
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
                .setContentTitle(title.ifBlank { "가족 보호 초대" })
                .setContentText(body.ifBlank { title })
                .setStyle(NotificationCompat.BigTextStyle().bigText(body.ifBlank { title }))
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setCategory(NotificationCompat.CATEGORY_MESSAGE)
                .setAutoCancel(true)
                .setContentIntent(contentPi)
                .addAction(0, "수락", acceptPi)
                .addAction(0, "거절", rejectPi)
                .build()

        val id = (safeLinkId.hashCode() and 0x7fffffff) % 100_000 + 8300
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
        val notification =
            NotificationCompat.Builder(app, CHANNEL_ID)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle(title.ifBlank { "VLUE" })
                .setContentText(body.ifBlank { title })
                .setStyle(NotificationCompat.BigTextStyle().bigText(body.ifBlank { title }))
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setCategory(NotificationCompat.CATEGORY_MESSAGE)
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
