package kr.vlue.calloverlay

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.IBinder
import android.telephony.TelephonyCallback
import android.telephony.TelephonyManager
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import java.util.concurrent.Executor

/**
 * 레터링 ON 동안 TelephonyCallback 으로 통화 상태를 감시.
 * 매니페스트 PHONE_STATE 리시버가 OEM 에서 누락될 때 보완한다.
 */
class LetteringCallMonitorService : Service() {
    private var telephonyManager: TelephonyManager? = null
    private var callback: TelephonyCallback? = null
    private var lastState: Int = TelephonyManager.CALL_STATE_IDLE

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        createChannel()
        startForeground(NOTIFICATION_ID, buildNotification())
        registerCallCallback()
        Log.i(TAG, "monitor started lettering=${LetteringPrefs.isLetteringEnabled(this)}")
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (!LetteringPrefs.isLetteringEnabled(this)) {
            stopSelf()
            return START_NOT_STICKY
        }
        if (callback == null) registerCallCallback()
        return START_STICKY
    }

    override fun onDestroy() {
        unregisterCallCallback()
        super.onDestroy()
    }

    private fun registerCallCallback() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) {
            Log.w(TAG, "TelephonyCallback requires API 31+; rely on PHONE_STATE receiver")
            return
        }
        if (ContextCompat.checkSelfPermission(this, android.Manifest.permission.READ_PHONE_STATE)
            != PackageManager.PERMISSION_GRANTED
        ) {
            Log.w(TAG, "READ_PHONE_STATE missing — monitor idle")
            return
        }
        try {
            val tm = getSystemService(TelephonyManager::class.java) ?: return
            telephonyManager = tm
            val executor: Executor = mainExecutor
            val cb = object : TelephonyCallback(), TelephonyCallback.CallStateListener {
                override fun onCallStateChanged(state: Int) {
                    handleState(state)
                }
            }
            callback = cb
            tm.registerTelephonyCallback(executor, cb)
            Log.i(TAG, "TelephonyCallback registered")
        } catch (e: Exception) {
            Log.e(TAG, "register TelephonyCallback failed", e)
        }
    }

    private fun unregisterCallCallback() {
        try {
            val tm = telephonyManager
            val cb = callback
            if (tm != null && cb != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                tm.unregisterTelephonyCallback(cb)
            }
        } catch (_: Exception) {
        }
        callback = null
        telephonyManager = null
    }

    private fun handleState(state: Int) {
        if (!LetteringPrefs.isLetteringEnabled(this)) return
        Log.i(TAG, "callState=$state prev=$lastState")
        when (state) {
            TelephonyManager.CALL_STATE_RINGING -> {
                LetteringCallCoordinator.onRinging(this, null, outgoing = false)
            }
            TelephonyManager.CALL_STATE_OFFHOOK -> {
                if (lastState != TelephonyManager.CALL_STATE_RINGING) {
                    /* 발신 등 — RINGING 없이 OFFHOOK */
                    LetteringCallCoordinator.onRinging(this, null, outgoing = true)
                }
                CallOverlayService.notifyConnected(applicationContext)
            }
            TelephonyManager.CALL_STATE_IDLE -> {
                LetteringCallCoordinator.onCallEnded(this)
            }
        }
        lastState = state
    }

    private fun createChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val channel = NotificationChannel(
            CHANNEL_ID,
            getString(R.string.lettering_channel_name),
            NotificationManager.IMPORTANCE_LOW
        )
        (getSystemService(NOTIFICATION_SERVICE) as NotificationManager)
            .createNotificationChannel(channel)
    }

    private fun buildNotification(): Notification {
        val pending = PendingIntent.getActivity(
            this, 0,
            Intent(this, MainActivity::class.java),
            PendingIntent.FLAG_IMMUTABLE
        )
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("VLUE 레터링 통화 감지 중")
            .setContentText("수신·발신 시 쇼케이스를 표시합니다")
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentIntent(pending)
            .setOngoing(true)
            .build()
    }

    companion object {
        private const val TAG = "LetteringCallMonitor"
        private const val CHANNEL_ID = "vlue_lettering_monitor"
        private const val NOTIFICATION_ID = 41002

        fun syncWithPrefs(context: Context) {
            val app = context.applicationContext
            val intent = Intent(app, LetteringCallMonitorService::class.java)
            try {
                if (LetteringPrefs.isLetteringEnabled(app) &&
                    LetteringPermissionHelper.canDrawOverlays(app)
                ) {
                    ContextCompat.startForegroundService(app, intent)
                } else {
                    app.stopService(intent)
                }
            } catch (e: Exception) {
                Log.e(TAG, "syncWithPrefs failed", e)
            }
        }
    }
}
