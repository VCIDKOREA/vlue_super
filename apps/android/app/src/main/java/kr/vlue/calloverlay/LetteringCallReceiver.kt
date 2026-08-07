package kr.vlue.calloverlay

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.telephony.TelephonyManager
import android.util.Log
import kr.vlue.calloverlay.diagnostics.ReleaseDebugGate
import kr.vlue.calloverlay.family.FamilyCallTracker
import kr.vlue.calloverlay.incall.VlueInCallController

/**
 * PHONE_STATE — 기본 전화앱이 아니면 RINGING 오버레이.
 * InCallService 가 실제로 bound 된 경우에만 RINGING 중복을 건너뛴다.
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
                VlueBigPushTrace.beginIncoming(context, number, source = "LetteringCallReceiver")
                VlueBigPushTrace.step(
                    1,
                    "Incoming Call Detected",
                    "source=LetteringCallReceiver number=${ReleaseDebugGate.maskPhoneForLog(number)}"
                )
            }

            if (!LetteringPrefs.isLetteringEnabled(context)) {
                if (state == TelephonyManager.EXTRA_STATE_RINGING) {
                    VlueBigPushTrace.skip(1, "lettering_enabled=false")
                }
                ReleaseDebugGate.d(TAG, "skip: lettering_enabled=false state=$state")
                return
            }

            when (state) {
                TelephonyManager.EXTRA_STATE_RINGING -> {
                    if (VlueInCallController.hasActiveCall()) {
                        VlueBigPushTrace.skip(1, "InCall has active call — PHONE_STATE RINGING skipped")
                        ReleaseDebugGate.d(TAG, "skip RINGING: InCall has active call")
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
            VlueBigPushTrace.skip(1, "LetteringCallReceiver exception: ${e.javaClass.name}: ${e.message}")
        }
    }

    companion object {
        private const val TAG = "LetteringCallReceiver"
    }
}
