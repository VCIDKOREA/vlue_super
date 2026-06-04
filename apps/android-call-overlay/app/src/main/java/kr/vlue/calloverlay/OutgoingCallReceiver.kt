package kr.vlue.calloverlay

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log

/** 발신 통화 시작 — PROCESS_OUTGOING_CALLS */
class OutgoingCallReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent?) {
        try {
            if (intent == null) return
            if (intent.action != Intent.ACTION_NEW_OUTGOING_CALL) return
            if (!LetteringPrefs.isLetteringEnabled(context)) return
            val number = intent.getStringExtra(Intent.EXTRA_PHONE_NUMBER)
            LetteringCallCoordinator.onRinging(context, number, outgoing = true)
        } catch (e: SecurityException) {
            Log.e(TAG, "outgoing call permission denied", e)
        } catch (e: Exception) {
            Log.e(TAG, "onReceive failed", e)
        }
    }

    companion object {
        private const val TAG = "OutgoingCallReceiver"
    }
}
