package kr.vlue.calloverlay.family

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log
import android.view.View
import android.widget.RemoteViews
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import kr.vlue.calloverlay.R
import kr.vlue.calloverlay.VlueNotificationWake

/** 가족 보호 FCM·초대 OS 알림 — 앱 미실행 시에도 카카오톡처럼 표시 */
object FamilyProtectionNotificationHelper {
    /**
     * v4: data-only FCM + 시스템 템플릿 2줄(title/text) + 커스텀/확장 본문.
     * Android 12+ 는 헤드업 커스텀 뷰를 무시하므로 title=1줄·text=2줄로 맞춤.
     */
    const val CHANNEL_ID = "family_protection_invite_v4"
    private const val CHANNEL_NAME = "가족 보호"
    const val ACTION_ACCEPT = "kr.vlue.app.action.FAMILY_INVITE_ACCEPT"
    const val ACTION_REJECT = "kr.vlue.app.action.FAMILY_INVITE_REJECT"
    const val EXTRA_LINK_ID = "linkId"
    private const val TAG = "FamilyInviteNotif"

    fun ensureChannel(context: Context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val nm = context.getSystemService(NotificationManager::class.java) ?: return
        listOf(
            "family_protection",
            "family_protection_invite_v2",
            "family_protection_invite_v3"
        ).forEach { old ->
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
                description = "가족 보호 초대·안심 알림 — 화면이 꺼져 있어도 표시"
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

    /** 푸시용 2~3줄 본문 */
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
                .split(Regex("(?<=[.。!！?？])\\s+|(?=수락하면)|(?=아래에서)|(?=지금 확인)"))
                .map { it.trim() }
                .filter { it.isNotEmpty() }
        return when {
            parts.size >= 2 -> parts.take(3).joinToString("\n")
            flat.length > 28 -> {
                val cut = flat.indexOf(' ', 22).takeIf { it in 16..40 } ?: 26.coerceAtMost(flat.length)
                val a = flat.substring(0, cut).trim()
                val b = flat.substring(cut).trim()
                listOf(a, b.ifBlank { "확인해 주세요." }).joinToString("\n")
            }
            else -> "$flat\n확인해 주세요."
        }
    }

    fun wakeScreenBriefly(context: Context, holdMs: Long = 6_000L) {
        VlueNotificationWake.wakeScreenBriefly(context, holdMs)
    }

    private fun bodyLines(multiBody: String, fallback: String): List<String> =
        multiBody
            .lines()
            .map { it.trim() }
            .filter { it.isNotEmpty() }
            .take(3)
            .ifEmpty { listOf(fallback) }

    private fun applyMultiLineRemoteViews(
        app: Context,
        builder: NotificationCompat.Builder,
        shadeTitle: String,
        lines: List<String>,
        multiBody: String
    ) {
        val pkg = app.packageName
        val collapsed = RemoteViews(pkg, R.layout.notification_family_invite)
        collapsed.setTextViewText(R.id.notif_title, shadeTitle)
        collapsed.setTextViewText(R.id.notif_line1, lines.getOrElse(0) { shadeTitle })
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
        expanded.setTextViewText(R.id.notif_title, shadeTitle)
        expanded.setTextViewText(R.id.notif_body, multiBody)

        /*
         * Android 12+(targetSdk 31+) 헤드업은 커스텀 뷰를 쓰지 않음.
         * 시스템 템플릿 ContentTitle+ContentText 가 화면상 2줄 (호출부에서 설정).
         * 알림창은 DecoratedCustomView 로 2~3줄.
         */
        builder
            .setStyle(NotificationCompat.DecoratedCustomViewStyle())
            .setCustomContentView(collapsed)
            .setCustomBigContentView(expanded)

        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) {
            builder.setCustomHeadsUpContentView(collapsed)
        }
    }

    fun showInvite(context: Context, title: String, body: String, linkId: String) {
        val app = context.applicationContext
        ensureChannel(app)
        wakeScreenBriefly(app)
        val safeLinkId = linkId.trim()
        val safeTitle = title.ifBlank { "가족 보호 초대" }
        val multiBody = formatInviteBodyLines(body)
        val lines = bodyLines(multiBody, safeTitle)
        /* 헤드업 2줄: 1줄=본문 첫 문장, 2줄=둘째 문장 (시스템 템플릿) */
        val hunTitle = lines.getOrElse(0) { safeTitle }
        val hunText = lines.getOrElse(1) { "수락 또는 거절해 주세요." }
        if (safeLinkId.isEmpty()) {
            showAlert(app, hunTitle, multiBody, "family-invite")
            return
        }

        val contentPi =
            VlueNotificationWake.activityPendingIntent(app, safeLinkId.hashCode()) {
                putExtra("vlue_family_link_id", safeLinkId)
                putExtra("vlue_family_invite_action", "open")
            }
        val fullScreenPi =
            VlueNotificationWake.activityPendingIntent(app, ("fs-$safeLinkId").hashCode()) {
                putExtra("vlue_family_link_id", safeLinkId)
                putExtra("vlue_family_invite_action", "open")
            }
        val piFlags =
            PendingIntent.FLAG_UPDATE_CURRENT or
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0
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

        val builder =
            NotificationCompat.Builder(app, CHANNEL_ID)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle(hunTitle)
                .setContentText(hunText)
                .setSubText(safeTitle)
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

        applyMultiLineRemoteViews(app, builder, safeTitle, lines, multiBody)

        val id = notificationIdForLink(safeLinkId)
        try {
            NotificationManagerCompat.from(app).notify(safeLinkId, id, builder.build())
        } catch (_: SecurityException) {
            /* POST_NOTIFICATIONS 거부 */
        }
    }

    fun showAlert(context: Context, title: String, body: String, tag: String?) {
        val app = context.applicationContext
        ensureChannel(app)
        val safeTitle = title.ifBlank { "VLUE" }
        val multiBody = formatInviteBodyLines(body.ifBlank { title })
        val contentPi =
            VlueNotificationWake.activityPendingIntent(app, (tag ?: "family-alert").hashCode())
        val builder =
            NotificationCompat.Builder(app, CHANNEL_ID)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle(safeTitle)
                .setContentText(multiBody.lines().firstOrNull()?.trim().orEmpty().ifBlank { safeTitle })
                .setStyle(
                    NotificationCompat.BigTextStyle()
                        .setBigContentTitle(safeTitle)
                        .bigText(multiBody)
                )
                .setCategory(NotificationCompat.CATEGORY_ALARM)
                .setAutoCancel(true)
                .setContentIntent(contentPi)
        VlueNotificationWake.attachAlertSurface(app, builder, contentPi)

        val id =
            if (!tag.isNullOrBlank()) {
                (tag.hashCode() and 0x7fffffff) % 100_000 + 8400
            } else {
                8400
            }
        try {
            NotificationManagerCompat.from(app).notify(tag ?: "family-alert", id, builder.build())
        } catch (_: SecurityException) {
            /* ignore */
        }
    }
}
