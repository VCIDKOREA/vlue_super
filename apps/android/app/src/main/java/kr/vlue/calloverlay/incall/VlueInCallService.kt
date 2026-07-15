package kr.vlue.calloverlay.incall

import android.os.Handler
import android.os.Looper
import android.telecom.Call
import android.telecom.InCallService
import android.util.Log
import kr.vlue.calloverlay.CallOverlayService
import kr.vlue.calloverlay.LetteringCallCoordinator
import kr.vlue.calloverlay.LetteringPrefs

/**
 * 기본 전화앱 UI — 순정 다이얼러 대신 VLUE 쇼케이스 오버레이를 전면 노출.
 * DTMF·disconnect·mute·스피커는 [VlueInCallController] 경유.
 */
class VlueInCallService : InCallService() {
    private val mainHandler = Handler(Looper.getMainLooper())
    private val callbacks = HashMap<Call, Call.Callback>()

    override fun onBind(intent: android.content.Intent?): android.os.IBinder? {
        VlueInCallController.attachService(this)
        return super.onBind(intent)
    }

    override fun onUnbind(intent: android.content.Intent?): Boolean {
        VlueInCallController.detachService(this)
        return super.onUnbind(intent)
    }

    override fun onCallAdded(call: Call) {
        super.onCallAdded(call)
        VlueInCallController.onCallAdded(call)

        val cb = object : Call.Callback() {
            override fun onStateChanged(c: Call, state: Int) {
                mainHandler.post { handleState(c, state) }
            }
        }
        callbacks[call] = cb
        call.registerCallback(cb, mainHandler)

        if (!LetteringPrefs.isLetteringEnabled(this)) return

        val phone = VlueInCallController.extractPhoneNumber(call)
        val outgoing = VlueInCallController.isOutgoing(call)
        when (call.state) {
            Call.STATE_RINGING -> {
                LetteringCallCoordinator.onRinging(this, phone.ifBlank { null }, outgoing = false)
            }
            Call.STATE_DIALING, Call.STATE_CONNECTING, Call.STATE_ACTIVE -> {
                if (phone.isNotBlank()) {
                    LetteringCallCoordinator.onRinging(this, phone, outgoing = outgoing)
                }
                if (call.state == Call.STATE_ACTIVE) {
                    CallOverlayService.notifyConnected(applicationContext)
                }
            }
        }
    }

    override fun onCallRemoved(call: Call) {
        callbacks.remove(call)?.let { call.unregisterCallback(it) }
        VlueInCallController.onCallRemoved(call)
        super.onCallRemoved(call)

        if (!VlueInCallController.hasActiveCall()) {
            LetteringCallCoordinator.onCallEnded(applicationContext)
        }
    }

    private fun handleState(call: Call, state: Int) {
        Log.i(TAG, "call state=$state")
        when (state) {
            Call.STATE_ACTIVE -> CallOverlayService.notifyConnected(applicationContext)
            Call.STATE_DISCONNECTED -> {
                /* onCallRemoved에서 일괄 처리 */
            }
        }
    }

    companion object {
        private const val TAG = "VlueInCallService"
    }
}
