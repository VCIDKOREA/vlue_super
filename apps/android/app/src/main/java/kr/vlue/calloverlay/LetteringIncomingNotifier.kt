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
import kr.vlue.calloverlay.diagnostics.CompanionBigPushDiag
import kr.vlue.calloverlay.diagnostics.ReleaseDebugGate

/**
 * 오버레이가 수신 전화 UI 아래에 깔릴 때 대비 — 헤드업 알림 폴백.
 * Companion BigPush/Showcase 가 이미 보이면 게시하지 않는다 (BigPush 를 가림).
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

    /**
     * @param forceFallback addView/권한 실패 폴백 — 오버레이 유무와 무관하게 게시
     */
    fun post(
        context: Context,
        phone: String,
        outgoing: Boolean,
        displayName: String? = null,
        forceFallback: Boolean = false
    ) {
        try {
            val app = context.applicationContext
            if (!forceFallback && CallOverlayService.isCompanionSurfaceVisible()) {
                cancel(app)
                Log.i(TAG, "skip HUN — companion overlay visible (background-only policy)")
                return
            }
            /* 재게시 전 취소 — HUN 깜빡임(보이다 사라졌다 다시 보임) 완화 */
            cancel(app)
            ensureChannel(app)
            val title = if (outgoing) "VLUE 발신 레터링" else "VLUE 수신 빅푸시"
            val body = when {
                !displayName.isNullOrBlank() -> displayName
                phone.isBlank() || phone == "unknown" -> "번호 확인 중…"
                else -> phone
            }

            val openApp = PendingIntent.getActivity(
                app,
                2,
                Intent(app, MainActivity::class.java).apply {
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
                },
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )

            val bigText = buildString {
                append(title)
                append('\n')
                append(body)
                if (!displayName.isNullOrBlank() && phone.isNotBlank() && phone != "unknown") {
                    append('\n')
                    append(phone)
                }
            }

            val builder = NotificationCompat.Builder(app, CHANNEL_ID)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle(title)
                .setContentText(body)
                .setStyle(NotificationCompat.BigTextStyle().bigText(bigText))
                .setPriority(NotificationCompat.PRIORITY_MAX)
                .setCategory(NotificationCompat.CATEGORY_CALL)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setOngoing(true)
                .setAutoCancel(false)
                .setContentIntent(openApp)
                /* FullScreenIntent→RingingActivity 는 홈/뒤로가기 가로챔 — 사용 금지 */
                .setTimeoutAfter(90_000L)

            NotificationManagerCompat.from(app).notify(NOTIFICATION_ID, builder.build())
            CompanionBigPushDiag.noteSystemHunPosted(source = if (outgoing) "outgoing" else "incoming")
            Log.i(TAG, "posted incoming notif phone=${ReleaseDebugGate.maskPhoneForLog(phone)} name=$displayName outgoing=$outgoing force=$forceFallback")
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
