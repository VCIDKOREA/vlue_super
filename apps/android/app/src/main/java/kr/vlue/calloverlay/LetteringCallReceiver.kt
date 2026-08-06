package kr.vlue.calloverlay

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.telephony.TelephonyManager
import android.util.Log
import kr.vlue.calloverlay.family.FamilyCallTracker
import kr.vlue.calloverlay.incall.VlueInCallController

/**
 * PHONE_STATE — 기본 전화앱이 아니면 RINGING 오버레이.
 * InCallService 가 실제로 bound 된 경우에만 RINGING 중복을 건너뛴다.
 * (ROLE_DIALER 만 잡고 InCall 미기동인 반쪽 상태에서 무반응 방지)
 */
class LetteringCallReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent?) {
        try {
            if (intent == null) return
            if (intent.action != TelephonyManager.ACTION_PHONE_STATE_CHANGED) return

            val state = intent.getStringExtra(TelephonyManager.EXTRA_STATE)
            val number = intent.getStringExtra(TelephonyManager.EXTRA_INCOMING_NUMBER)

            FamilyCallTracker.onPhoneStateChanged(context, state, number)

            if (state == TelephonyManager.EXTRA_STATE_RINGING) {
                VlueBigPushTrace.step(
                    "1. Incoming Call Detected",
                    "source=LetteringCallReceiver number=${number ?: "null"}"
                )
            }

            if (!LetteringPrefs.isLetteringEnabled(context)) {
                if (state == TelephonyManager.EXTRA_STATE_RINGING) {
                    VlueBigPushTrace.skip("1. Incoming Call Detected", "lettering_enabled=false")
                }
                Log.d(TAG, "skip: lettering_enabled=false state=$state")
                return
            }

            when (state) {
                TelephonyManager.EXTRA_STATE_RINGING -> {
                    /* InCall 이 실제 통화를 잡은 경우에만 PHONE_STATE RINGING 스킵 */
                    if (VlueInCallController.hasActiveCall()) {
                        VlueBigPushTrace.skip("1. Incoming Call Detected", "InCall has active call")
                        Log.d(TAG, "skip RINGING: InCall has active call")
                        return
                    }
                    LetteringCallCoordinator.onRinging(context, number, outgoing = false)
                }
                TelephonyManager.EXTRA_STATE_IDLE -> {
                    LetteringCallCoordinator.onCallEnded(context)
                }
                TelephonyManager.EXTRA_STATE_OFFHOOK -> {
                    CallOverlayService.notifyConnected(context.applicationContext)
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
