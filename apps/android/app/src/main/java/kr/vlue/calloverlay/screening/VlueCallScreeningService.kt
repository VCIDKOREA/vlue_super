package kr.vlue.calloverlay.screening

import android.telecom.Call
import android.telecom.CallScreeningService
import android.util.Log

/**
 * 프로세스가 죽어 있으면 시스템이 수신 때 이 서비스를 먼저 깨운다.
 * 통화 허용만 하고 바로 반환한다. 빅푸시 표시·종료는 기존 PHONE_STATE 경로가 담당한다.
 */
class VlueCallScreeningService : CallScreeningService() {
    override fun onScreenCall(callDetails: Call.Details) {
        try {
            respondToCall(callDetails, CallResponse.Builder().build())
        } catch (e: Exception) {
            Log.e(TAG, "respondToCall failed", e)
        }
    }

    companion object {
        private const val TAG = "VlueCallScreening"
    }
}
