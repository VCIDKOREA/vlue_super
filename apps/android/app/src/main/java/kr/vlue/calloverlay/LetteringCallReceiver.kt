package kr.vlue.calloverlay

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.telephony.TelephonyManager
import android.util.Log
import kr.vlue.calloverlay.family.FamilyCallTracker

/**
 * PHONE_STATE — RINGING 시 오버레이 표시, IDLE 시 제거 + 가족보호 통화 이벤트
 */
class LetteringCallReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent?) {
        try {
            if (intent == null) return
            if (intent.action != TelephonyManager.ACTION_PHONE_STATE_CHANGED) return

            val state = intent.getStringExtra(TelephonyManager.EXTRA_STATE)
            val number = intent.getStringExtra(TelephonyManager.EXTRA_INCOMING_NUMBER)

            /* 가족보호: 레터링 설정과 무관하게 동작 (권한·WebView 연결 시) */
            FamilyCallTracker.onPhoneStateChanged(context, state, number)

            if (!LetteringPrefs.isLetteringEnabled(context)) return

            when (state) {
                TelephonyManager.EXTRA_STATE_RINGING -> {
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
