package kr.vlue.calloverlay

import android.content.Context
import android.media.AudioManager
import android.media.ToneGenerator
import android.os.Build
import android.telecom.TelecomManager
import android.util.Log
import kr.vlue.calloverlay.incall.VlueInCallController

/**
 * 통화 오디오/DTMF — InCallService(기본 전화앱) 우선, 없으면 AudioManager·로컬 톤 폴백
 */
object LetteringCallAudioHelper {
    private const val TAG = "LetteringCallAudio"
    private var toneGenerator: ToneGenerator? = null

    private fun audio(context: Context): AudioManager? =
        context.getSystemService(Context.AUDIO_SERVICE) as? AudioManager

    fun setMicrophoneMute(context: Context, muted: Boolean): Boolean {
        if (VlueInCallController.setMuted(muted)) return true
        return try {
            val am = audio(context) ?: return false
            am.isMicrophoneMute = muted
            true
        } catch (e: Exception) {
            Log.e(TAG, "setMicrophoneMute failed", e)
            false
        }
    }

    fun isMicrophoneMute(context: Context): Boolean {
        if (VlueInCallController.isDefaultDialerBound()) {
            return VlueInCallController.isMuted()
        }
        return try {
            audio(context)?.isMicrophoneMute == true
        } catch (_: Exception) {
            false
        }
    }

    @Suppress("DEPRECATION")
    fun setSpeakerphoneOn(context: Context, on: Boolean): Boolean {
        if (VlueInCallController.setSpeakerphoneOn(on)) return true
        return try {
            val am = audio(context) ?: return false
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                if (am.mode == AudioManager.MODE_NORMAL) {
                    am.mode = AudioManager.MODE_IN_COMMUNICATION
                }
            } else if (am.mode == AudioManager.MODE_NORMAL) {
                am.mode = AudioManager.MODE_IN_CALL
            }
            am.isSpeakerphoneOn = on
            true
        } catch (e: Exception) {
            Log.e(TAG, "setSpeakerphoneOn failed", e)
            false
        }
    }

    @Suppress("DEPRECATION")
    fun isSpeakerphoneOn(context: Context): Boolean {
        if (VlueInCallController.isDefaultDialerBound()) {
            return VlueInCallController.isSpeakerphoneOn()
        }
        return try {
            audio(context)?.isSpeakerphoneOn == true
        } catch (_: Exception) {
            false
        }
    }

    fun playDtmfTone(context: Context, digit: String): Boolean {
        val d = digit.trim().firstOrNull() ?: return false
        if (VlueInCallController.playDtmf(d)) {
            /* InCall DTMF — 통신사 실제 톤 */
            return true
        }
        return playLocalTone(d)
    }

    fun stopDtmfTone() {
        if (VlueInCallController.stopDtmf()) return
        try {
            toneGenerator?.stopTone()
        } catch (_: Exception) {
            /* ignore */
        }
    }

    private fun playLocalTone(d: Char): Boolean {
        return try {
            val toneType = when (d) {
                '0' -> ToneGenerator.TONE_DTMF_0
                '1' -> ToneGenerator.TONE_DTMF_1
                '2' -> ToneGenerator.TONE_DTMF_2
                '3' -> ToneGenerator.TONE_DTMF_3
                '4' -> ToneGenerator.TONE_DTMF_4
                '5' -> ToneGenerator.TONE_DTMF_5
                '6' -> ToneGenerator.TONE_DTMF_6
                '7' -> ToneGenerator.TONE_DTMF_7
                '8' -> ToneGenerator.TONE_DTMF_8
                '9' -> ToneGenerator.TONE_DTMF_9
                '*' -> ToneGenerator.TONE_DTMF_S
                '#' -> ToneGenerator.TONE_DTMF_P
                else -> return false
            }
            if (toneGenerator == null) {
                toneGenerator = ToneGenerator(AudioManager.STREAM_DTMF, 80)
            }
            toneGenerator?.startTone(toneType, 120)
            true
        } catch (e: Exception) {
            Log.e(TAG, "playLocalTone failed", e)
            false
        }
    }

    fun release() {
        try {
            toneGenerator?.release()
        } catch (_: Exception) {
            /* ignore */
        }
        toneGenerator = null
    }

    /** 통화 신호만 종료 — 오버레이 유지 */
    fun endCallOnly(context: Context, keepOverlay: Boolean = true): Boolean {
        if (VlueInCallController.disconnect(keepOverlay = keepOverlay)) {
            return true
        }
        return try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                val telecom = context.getSystemService(TelecomManager::class.java) ?: return false
                if (keepOverlay) {
                    VlueInCallController.keepOverlayAfterHangup = true
                }
                @Suppress("DEPRECATION")
                telecom.endCall()
                true
            } else {
                false
            }
        } catch (e: Exception) {
            Log.e(TAG, "endCallOnly failed", e)
            false
        }
    }

    fun answerCall(): Boolean = VlueInCallController.answer()

    fun rejectCall(): Boolean = VlueInCallController.reject()
}
