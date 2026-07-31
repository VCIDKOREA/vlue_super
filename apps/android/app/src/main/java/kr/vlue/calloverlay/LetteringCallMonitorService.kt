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
    @Suppress("DEPRECATION")
    private var legacyListener: android.telephony.PhoneStateListener? = null
    private var lastState: Int = TelephonyManager.CALL_STATE_IDLE

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        createChannel()
        VlueForegroundHelper.start(this, NOTIFICATION_ID, buildNotification())
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
        if (ContextCompat.checkSelfPermission(this, android.Manifest.permission.READ_PHONE_STATE)
            != PackageManager.PERMISSION_GRANTED
        ) {
            Log.w(TAG, "READ_PHONE_STATE missing — monitor idle")
            LetteringPrefs.setLastOverlayError(this, "READ_PHONE_STATE missing")
            return
        }
        try {
            val tm = getSystemService(TelephonyManager::class.java) ?: return
            telephonyManager = tm
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                val executor: Executor = mainExecutor
                val cb = object : TelephonyCallback(), TelephonyCallback.CallStateListener {
                    override fun onCallStateChanged(state: Int) {
                        handleState(state)
                    }
                }
                callback = cb
                tm.registerTelephonyCallback(executor, cb)
                Log.i(TAG, "TelephonyCallback registered")
            } else {
                @Suppress("DEPRECATION")
                val listener = object : android.telephony.PhoneStateListener() {
                    @Deprecated("Deprecated in Java")
                    override fun onCallStateChanged(state: Int, phoneNumber: String?) {
                        handleState(state)
                    }
                }
                legacyListener = listener
                @Suppress("DEPRECATION")
                tm.listen(listener, android.telephony.PhoneStateListener.LISTEN_CALL_STATE)
                Log.i(TAG, "PhoneStateListener registered")
            }
        } catch (e: Exception) {
            Log.e(TAG, "register call listener failed", e)
            LetteringPrefs.setLastOverlayError(this, "register:${e.message}")
        }
    }

    private fun unregisterCallCallback() {
        try {
            val tm = telephonyManager
            if (tm != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                val cb = callback
                if (cb != null) tm.unregisterTelephonyCallback(cb)
            } else if (tm != null && legacyListener != null) {
                @Suppress("DEPRECATION")
                tm.listen(legacyListener, android.telephony.PhoneStateListener.LISTEN_NONE)
            }
        } catch (_: Exception) {
        }
        callback = null
        legacyListener = null
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
                /* 오버레이 없어도 통화 감지는 돌린다 — 알림/액티비티 폴백용 */
                if (LetteringPrefs.isLetteringEnabled(app)) {
                    ContextCompat.startForegroundService(app, intent)
                } else {
                    app.stopService(intent)
                }
            } catch (e: Exception) {
                Log.e(TAG, "syncWithPrefs failed", e)
                LetteringPrefs.setLastOverlayError(app, "monitor:${e.message}")
            }
        }
    }
}
