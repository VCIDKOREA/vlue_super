package kr.vlue.calloverlay.incall

import android.telecom.Call
import android.telecom.CallAudioState
import android.telecom.InCallService
import android.util.Log
import java.util.concurrent.CopyOnWriteArrayList

/**
 * InCallService가 붙인 활성 통화 핸들 — DTMF / disconnect / mute / speaker 단일 진입점.
 * 기본 전화앱(ROLE_DIALER)일 때만 telecom.Call 제어가 가능하다.
 */
object VlueInCallController {
    private const val TAG = "VlueInCall"

    @Volatile
    private var inCallService: InCallService? = null

    @Volatile
    private var activeCall: Call? = null

    /** 통화 종료 후 쇼케이스 오버레이 유지 (사후 감상) */
    @Volatile
    var keepOverlayAfterHangup: Boolean = false

    private val calls = CopyOnWriteArrayList<Call>()

    fun attachService(service: InCallService) {
        inCallService = service
    }

    fun detachService(service: InCallService) {
        if (inCallService === service) {
            inCallService = null
        }
    }

    fun onCallAdded(call: Call) {
        if (!calls.contains(call)) calls.add(call)
        activeCall = preferForeground(calls) ?: call
        Log.i(TAG, "onCallAdded state=${call.state} handle=${call.details?.handle}")
    }

    fun onCallRemoved(call: Call) {
        calls.remove(call)
        if (activeCall === call) {
            activeCall = preferForeground(calls)
        }
        Log.i(TAG, "onCallRemoved remaining=${calls.size}")
    }

    fun hasActiveCall(): Boolean = activeCall != null || calls.isNotEmpty()

    fun isDefaultDialerBound(): Boolean = inCallService != null

    fun extractPhoneNumber(call: Call? = activeCall): String {
        val c = call ?: return ""
        val handle = c.details?.handle?.schemeSpecificPart.orEmpty()
        if (handle.isNotBlank()) return handle
        @Suppress("DEPRECATION")
        val gateway = c.details?.gatewayInfo?.originalAddress?.schemeSpecificPart.orEmpty()
        return gateway
    }

    fun isOutgoing(call: Call? = activeCall): Boolean {
        val c = call ?: return false
        return if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.Q) {
            c.details?.callDirection == Call.Details.DIRECTION_OUTGOING
        } else {
            false
        }
    }

    /** true = telecom Call.disconnect 성공 */
    fun disconnect(keepOverlay: Boolean): Boolean {
        keepOverlayAfterHangup = keepOverlay
        val call = activeCall ?: calls.lastOrNull() ?: return false
        return try {
            call.disconnect()
            true
        } catch (e: Exception) {
            Log.e(TAG, "disconnect failed", e)
            false
        }
    }

    fun answer(): Boolean {
        val call = activeCall ?: calls.firstOrNull { it.state == Call.STATE_RINGING } ?: return false
        return try {
            call.answer(0)
            true
        } catch (e: Exception) {
            Log.e(TAG, "answer failed", e)
            false
        }
    }

    fun reject(): Boolean {
        val call = activeCall ?: calls.firstOrNull { it.state == Call.STATE_RINGING } ?: return false
        return try {
            call.reject(false, null)
            true
        } catch (e: Exception) {
            Log.e(TAG, "reject failed", e)
            false
        }
    }

    fun playDtmf(digit: Char): Boolean {
        val call = activeCall ?: return false
        return try {
            call.playDtmfTone(digit)
            true
        } catch (e: Exception) {
            Log.e(TAG, "playDtmf failed", e)
            false
        }
    }

    fun stopDtmf(): Boolean {
        val call = activeCall ?: return false
        return try {
            call.stopDtmfTone()
            true
        } catch (e: Exception) {
            Log.e(TAG, "stopDtmf failed", e)
            false
        }
    }

    fun setMuted(muted: Boolean): Boolean {
        val svc = inCallService ?: return false
        return try {
            svc.setMuted(muted)
            true
        } catch (e: Exception) {
            Log.e(TAG, "setMuted failed", e)
            false
        }
    }

    fun isMuted(): Boolean {
        return try {
            inCallService?.callAudioState?.isMuted == true
        } catch (_: Exception) {
            false
        }
    }

    fun setSpeakerphoneOn(on: Boolean): Boolean {
        val svc = inCallService ?: return false
        return try {
            val route = if (on) CallAudioState.ROUTE_SPEAKER else CallAudioState.ROUTE_EARPIECE
            svc.setAudioRoute(route)
            true
        } catch (e: Exception) {
            Log.e(TAG, "setSpeakerphoneOn failed", e)
            false
        }
    }

    fun isSpeakerphoneOn(): Boolean {
        return try {
            val route = inCallService?.callAudioState?.route ?: return false
            route == CallAudioState.ROUTE_SPEAKER
        } catch (_: Exception) {
            false
        }
    }

    private fun preferForeground(list: List<Call>): Call? {
        return list.firstOrNull {
            it.state == Call.STATE_ACTIVE || it.state == Call.STATE_DIALING || it.state == Call.STATE_CONNECTING
        } ?: list.firstOrNull { it.state == Call.STATE_RINGING } ?: list.lastOrNull()
    }
}
