package kr.vlue.calloverlay

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.telephony.TelephonyManager
import android.util.Log
import kr.vlue.calloverlay.family.FamilyCallTracker
import kr.vlue.calloverlay.incall.DialerRoleHelper
import kr.vlue.calloverlay.incall.VlueInCallController

/**
 * PHONE_STATE — 기본 전화앱이 아니면 RINGING 오버레이.
 * 기본 다이얼러(InCallService)일 때는 RINGING 중복을 건너뛰고 IDLE/OFFHOOK만 보조.
 */
class LetteringCallReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent?) {
        try {
            if (intent == null) return
            if (intent.action != TelephonyManager.ACTION_PHONE_STATE_CHANGED) return

            val state = intent.getStringExtra(TelephonyManager.EXTRA_STATE)
            val number = intent.getStringExtra(TelephonyManager.EXTRA_INCOMING_NUMBER)

            FamilyCallTracker.onPhoneStateChanged(context, state, number)

            if (!LetteringPrefs.isLetteringEnabled(context)) return

            val dialerOwnsUi =
                DialerRoleHelper.isDefaultDialer(context) || VlueInCallController.isDefaultDialerBound()

            when (state) {
                TelephonyManager.EXTRA_STATE_RINGING -> {
                    if (dialerOwnsUi) return
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
