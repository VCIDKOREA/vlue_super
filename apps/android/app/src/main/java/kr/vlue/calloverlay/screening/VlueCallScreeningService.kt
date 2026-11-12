package kr.vlue.calloverlay.screening

import android.net.Uri
import android.os.Build
import android.telecom.Call
import android.telecom.CallScreeningService
import android.util.Log
import kr.vlue.calloverlay.LetteringCallCoordinator
import kr.vlue.calloverlay.VlueBigPushTrace
import kr.vlue.calloverlay.runtime.ColdProcessBootstrap

/**
 * 앱 프로세스가 죽은 뒤에도 시스템이 수신 전화를 이 서비스로 깨운다.
 * 통화는 막지 않고, 오버레이(빅푸시)만 기존 코디네이터로 올린다.
 */
class VlueCallScreeningService : CallScreeningService() {
    override fun onScreenCall(callDetails: Call.Details) {
        try {
            respondToCall(callDetails, CallResponse.Builder().build())
        } catch (e: Exception) {
            Log.e(TAG, "respondToCall failed", e)
        }
        if (!isIncoming(callDetails)) return
        val app = applicationContext
        val number = extractNumber(callDetails)
        try {
            ColdProcessBootstrap.ensureReady(app)
            VlueBigPushTrace.beginIncoming(app, number, source = "CallScreeningService")
            VlueBigPushTrace.step(
                1,
                "Incoming Call Detected",
                "source=CallScreeningService"
            )
            LetteringCallCoordinator.onRinging(app, number, outgoing = false)
        } catch (e: Exception) {
            Log.e(TAG, "screen wake failed", e)
            VlueBigPushTrace.skip(1, "CallScreeningService exception: ${e.javaClass.simpleName}")
        }
    }

    private fun isIncoming(details: Call.Details): Boolean {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            return details.callDirection == Call.Details.DIRECTION_INCOMING
        }
        return true
    }

    private fun extractNumber(details: Call.Details): String? {
        val uri: Uri = details.handle ?: return null
        val raw = uri.schemeSpecificPart?.trim().orEmpty()
        return raw.ifBlank { null }
    }

    companion object {
        private const val TAG = "VlueCallScreening"
    }
}
