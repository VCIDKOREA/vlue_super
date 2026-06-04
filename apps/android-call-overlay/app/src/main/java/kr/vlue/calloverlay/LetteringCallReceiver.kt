package kr.vlue.calloverlay

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.telephony.TelephonyManager
import android.util.Log

/**
 * PHONE_STATE — RINGING 시 오버레이 표시, IDLE 시 제거
 */
class LetteringCallReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent?) {
        try {
            if (intent == null) return
            if (intent.action != TelephonyManager.ACTION_PHONE_STATE_CHANGED) return
            if (!LetteringPrefs.isLetteringEnabled(context)) return

            when (intent.getStringExtra(TelephonyManager.EXTRA_STATE)) {
                TelephonyManager.EXTRA_STATE_RINGING -> {
                    val number = intent.getStringExtra(TelephonyManager.EXTRA_INCOMING_NUMBER)
                    LetteringCallCoordinator.onRinging(context, number, outgoing = false)
                }
                TelephonyManager.EXTRA_STATE_IDLE -> {
                    LetteringCallCoordinator.onCallEnded(context)
                }
                TelephonyManager.EXTRA_STATE_OFFHOOK -> {
                    /* 통화 연결 — 오버레이 유지 */
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "onReceive failed", e)
        }
    }

    companion object {
        private const val TAG = "LetteringCallReceiver"
    }
}
