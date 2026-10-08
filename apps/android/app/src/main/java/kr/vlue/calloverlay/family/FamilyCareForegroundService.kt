package kr.vlue.calloverlay.family

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import androidx.core.app.NotificationCompat
import kr.vlue.calloverlay.MainActivity
import kr.vlue.calloverlay.R
import kr.vlue.calloverlay.VlueForegroundHelper

/**
 * 가족 보호 백그라운드 유지 —
 * - 배터리: 5분
 * - 원격제어 앱 스캔: 10초 (원격 활성/감시)
 */
class FamilyCareForegroundService : Service() {
    private val handler = Handler(Looper.getMainLooper())
    private var batteryAccumMs = 0L

    private val tick = object : Runnable {
        override fun run() {
            try {
                val found = FamilyRemoteAppScanner.scanInstalled(this@FamilyCareForegroundService)
                FamilyRemoteSecurityGate.onRemotePackagesFound(
                    this@FamilyCareForegroundService,
                    found,
                    host = null
                )
                batteryAccumMs += REMOTE_TICK_MS
                if (batteryAccumMs >= BATTERY_TICK_MS) {
                    batteryAccumMs = 0L
                    val snap = FamilyBatteryMonitor.read(this@FamilyCareForegroundService)
                    VlueFamilyBridge.dispatchBatteryState(snap.percent, snap.isCharging)
                }
            } catch (_: Exception) {
                /* ignore */
            }
            handler.postDelayed(this, REMOTE_TICK_MS)
        }
    }

    private var foregroundOk = false

    override fun onCreate() {
        super.onCreate()
        ensureChannel()
        foregroundOk = VlueForegroundHelper.start(this, NOTIF_ID, buildNotification())
        if (!foregroundOk) {
            stopSelf()
            return
        }
        handler.post(tick)
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (!foregroundOk) {
            stopSelf()
            return START_NOT_STICKY
        }
        return START_STICKY
    }

    override fun onTaskRemoved(rootIntent: Intent?) {
        FamilyRemoteSecurityGate.onAppForceStopping(this)
        super.onTaskRemoved(rootIntent)
    }

    override fun onDestroy() {
        FamilyRemoteSecurityGate.onAppForceStopping(this)
        handler.removeCallbacks(tick)
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    private fun ensureChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        val ch = NotificationChannel(CHANNEL_ID, "VLUÉ 가족 보호", NotificationManager.IMPORTANCE_LOW)
        nm.createNotificationChannel(ch)
    }

    private fun buildNotification(): Notification {
        val pi = PendingIntent.getActivity(
            this,
            0,
            Intent(this, MainActivity::class.java),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle("VLUÉ 가족 보호")
            .setContentText("배터리·보안 상태를 가족과 공유 중입니다.")
            .setContentIntent(pi)
            .setOngoing(true)
            .build()
    }

    companion object {
        private const val CHANNEL_ID = "vlue_family_care"
        private const val NOTIF_ID = 4105
        private const val REMOTE_TICK_MS = 10_000L
        private const val BATTERY_TICK_MS = 5 * 60 * 1000L

        fun start(context: Context) {
            val i = Intent(context, FamilyCareForegroundService::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(i)
            } else {
                context.startService(i)
            }
        }

        fun stop(context: Context) {
            context.stopService(Intent(context, FamilyCareForegroundService::class.java))
        }
    }
}
