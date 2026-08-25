package kr.vlue.calloverlay.family

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.os.PowerManager
import android.util.Log
import android.view.View
import android.widget.RemoteViews
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.app.Person
import kr.vlue.calloverlay.MainActivity
import kr.vlue.calloverlay.R

/** 가족 보호 FCM·초대 OS 알림 — 앱 미실행 시에도 카카오톡처럼 표시 */
object FamilyProtectionNotificationHelper {
    /** v3: 2~3줄 BigText + 화면 깨우기용 HIGH 채널 */
    const val CHANNEL_ID = "family_protection_invite_v3"
    private const val CHANNEL_NAME = "가족 보호 초대"
    const val ACTION_ACCEPT = "kr.vlue.app.action.FAMILY_INVITE_ACCEPT"
    const val ACTION_REJECT = "kr.vlue.app.action.FAMILY_INVITE_REJECT"
    const val EXTRA_LINK_ID = "linkId"
    private const val TAG = "FamilyInviteNotif"

    fun ensureChannel(context: Context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val nm = context.getSystemService(NotificationManager::class.java) ?: return
        // 구버전 채널 정리(중요도·표시 정책이 바뀌면 새 ID 사용)
        listOf("family_protection", "family_protection_invite_v2").forEach { old ->
            try {
                nm.deleteNotificationChannel(old)
            } catch (_: Exception) {
                /* ignore */
            }
        }
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
                description = "가족 보호 초대·수락·거절 — 화면이 꺼져 있어도 알림"
                enableVibration(true)
                enableLights(true)
                setShowBadge(true)
                setBypassDnd(false)
                lockscreenVisibility = android.app.Notification.VISIBILITY_PUBLIC
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    setAllowBubbles(false)
                }
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

    /** 푸시용 2~3줄 본문 (헤드업·확장 알림) */
    fun formatInviteBodyLines(raw: String): String {
        val flat = raw.replace("\r\n", "\n").trim()
        if (flat.isEmpty()) {
            return "가족 보호 승인 요청이 도착했습니다.\n수락하면 보호가 시작됩니다.\n아래에서 수락 또는 거절해 주세요."
        }
        if (flat.contains('\n')) {
            return flat.lines().map { it.trim() }.filter { it.isNotEmpty() }.take(4).joinToString("\n")
        }
        val parts =
            flat
                .split(Regex("(?<=[.。!！?？])\\s+|(?=수락하면)|(?=아래에서)"))
                .map { it.trim() }
                .filter { it.isNotEmpty() }
        return when {
            parts.size >= 2 -> (parts.take(2) + listOf("아래에서 수락 또는 거절해 주세요.")).joinToString("\n")
            flat.length > 36 -> {
                val cut = flat.indexOf(' ', 28).takeIf { it in 20..48 } ?: 32.coerceAtMost(flat.length)
                val a = flat.substring(0, cut).trim()
                val b = flat.substring(cut).trim()
                listOf(a, b.ifBlank { "수락하면 보호가 시작됩니다." }, "아래에서 수락 또는 거절해 주세요.")
                    .joinToString("\n")
            }
            else -> "$flat\n수락하면 보호가 시작됩니다.\n아래에서 수락 또는 거절해 주세요."
        }
    }

    /** 화면 꺼짐 시 잠깐 켜기 (유튜브·쿠팡식 알림 노출) */
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
                    "vlue:family_invite_wake"
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

    fun showInvite(context: Context, title: String, body: String, linkId: String) {
        val app = context.applicationContext
        ensureChannel(app)
        wakeScreenBriefly(app)
        val safeLinkId = linkId.trim()
        val safeTitle = title.ifBlank { "가족 보호 초대" }
        val multiBody = formatInviteBodyLines(body)
        val previewLine = multiBody.lineSequence().firstOrNull().orEmpty().ifBlank { safeTitle }
        if (safeLinkId.isEmpty()) {
            kr.vlue.calloverlay.VlueSystemNotifier.show(app, safeTitle, multiBody, "family-invite")
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
        val fullScreenPi =
            PendingIntent.getActivity(
                app,
                ("fs-$safeLinkId").hashCode(),
                open,
                piFlags
            )
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

        val lines =
            multiBody
                .lines()
                .map { it.trim() }
                .filter { it.isNotEmpty() }
                .take(3)
                .ifEmpty { listOf(previewLine) }

        /* MessagingStyle: 삼성 헤드업에서도 2~3줄 표시 (BigText는 펼쳐야만 여러 줄) */
        val sender =
            Person.Builder()
                .setName("VLUE")
                .setKey("vlue-family-invite")
                .setImportant(true)
                .build()
        val messagingStyle =
            NotificationCompat.MessagingStyle(sender)
                .setConversationTitle(safeTitle)
                .setGroupConversation(false)
        val now = System.currentTimeMillis()
        lines.forEachIndexed { idx, line ->
            messagingStyle.addMessage(
                NotificationCompat.MessagingStyle.Message(
                    line,
                    now - (lines.size - idx) * 800L,
                    sender
                )
            )
        }

        val pkg = app.packageName
        val collapsed = RemoteViews(pkg, R.layout.notification_family_invite)
        collapsed.setTextViewText(R.id.notif_title, safeTitle)
        collapsed.setTextViewText(R.id.notif_line1, lines.getOrElse(0) { previewLine })
        if (lines.size > 1) {
            collapsed.setViewVisibility(R.id.notif_line2, View.VISIBLE)
            collapsed.setTextViewText(R.id.notif_line2, lines[1])
        } else {
            collapsed.setViewVisibility(R.id.notif_line2, View.GONE)
        }
        if (lines.size > 2) {
            collapsed.setViewVisibility(R.id.notif_line3, View.VISIBLE)
            collapsed.setTextViewText(R.id.notif_line3, lines[2])
        } else {
            collapsed.setViewVisibility(R.id.notif_line3, View.GONE)
        }
        val expanded = RemoteViews(pkg, R.layout.notification_family_invite_big)
        expanded.setTextViewText(R.id.notif_title, safeTitle)
        expanded.setTextViewText(R.id.notif_body, multiBody)

        val builder =
            NotificationCompat.Builder(app, CHANNEL_ID)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle(safeTitle)
                .setContentText(lines.joinToString("\n"))
                .setStyle(messagingStyle)
                .setPriority(NotificationCompat.PRIORITY_MAX)
                .setCategory(NotificationCompat.CATEGORY_MESSAGE)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setDefaults(NotificationCompat.DEFAULT_ALL)
                .setVibrate(longArrayOf(0, 450, 220, 450))
                .setLights(0xFF2563EB.toInt(), 800, 600)
                .setOnlyAlertOnce(false)
                .setOngoing(true)
                .setAutoCancel(false)
                .setContentIntent(contentPi)
                .setFullScreenIntent(fullScreenPi, true)
                .addAction(0, "수락", acceptPi)
                .addAction(0, "거절", rejectPi)

        /* Android 11 이하·일부 OEM: 커스텀 뷰로 헤드업 여러 줄 보강 */
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) {
            builder
                .setCustomContentView(collapsed)
                .setCustomBigContentView(expanded)
                .setCustomHeadsUpContentView(collapsed)
        }

        val notification = builder.build()

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
        wakeScreenBriefly(app, 4_000L)
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
        val multiBody = formatInviteBodyLines(body.ifBlank { title })
        val preview = multiBody.lineSequence().firstOrNull().orEmpty().ifBlank { safeTitle }
        val notification =
            NotificationCompat.Builder(app, CHANNEL_ID)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle(safeTitle)
                .setContentText(preview)
                .setStyle(
                    NotificationCompat.BigTextStyle()
                        .setBigContentTitle(safeTitle)
                        .bigText(multiBody)
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
