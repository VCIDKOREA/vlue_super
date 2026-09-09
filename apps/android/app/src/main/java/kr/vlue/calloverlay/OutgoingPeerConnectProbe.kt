package kr.vlue.calloverlay

import android.content.Context
import android.media.AudioManager
import android.os.Handler
import android.os.Looper
import android.util.Log
import kr.vlue.calloverlay.incall.VlueInCallController

/**
 * 발신 BigPush 중 상대 응답 감지 → [CallOverlayService.notifyConnected].
 * 1) InCallService STATE_ACTIVE (기본 전화앱일 때)
 * 2) 미바인딩 시 AudioManager 통화 모드가 유지되면 수화로 간주 (탭 대체)
 */
object OutgoingPeerConnectProbe {
    private const val TAG = "OutgoingPeerConnect"
    private val mainHandler = Handler(Looper.getMainLooper())
    private var probeRunnable: Runnable? = null
    private var startedAtMs = 0L

    fun start(context: Context) {
        stop()
        val app = context.applicationContext
        startedAtMs = android.os.SystemClock.elapsedRealtime()
        val tick =
            object : Runnable {
                override fun run() {
                    if (!CallOverlayService.isRunning() || !CallOverlayService.isOutgoingPublic()) {
                        stop()
                        return
                    }
                    if (CallOverlayService.isRemoteConnectedPublic()) {
                        stop()
                        return
                    }
                    val elapsed = android.os.SystemClock.elapsedRealtime() - startedAtMs
                    if (VlueInCallController.hasConnectedActiveCall()) {
                        Log.i(TAG, "InCall ACTIVE → notifyConnected elapsed=${elapsed}ms")
                        CallOverlayService.notifyConnected(app)
                        stop()
                        return
                    }
                    /* 다이얼러 미연결 OEM: 통화 오디오 모드가 일정 시간 유지되면 응답으로 본다 */
                    if (elapsed >= 2_800L && !VlueInCallController.isDefaultDialerBound()) {
                        val am = app.getSystemService(Context.AUDIO_SERVICE) as? AudioManager
                        val mode = am?.mode ?: AudioManager.MODE_NORMAL
                        if (mode == AudioManager.MODE_IN_CALL || mode == AudioManager.MODE_IN_COMMUNICATION) {
                            Log.i(TAG, "audio mode heuristic → notifyConnected mode=$mode elapsed=${elapsed}ms")
                            CallOverlayService.notifyConnected(app)
                            stop()
                            return
                        }
                    }
                    if (elapsed > 180_000L) {
                        stop()
                        return
                    }
                    mainHandler.postDelayed(this, 350L)
                }
            }
        probeRunnable = tick
        mainHandler.postDelayed(tick, 500L)
        Log.i(TAG, "started")
    }

    fun stop() {
        probeRunnable?.let { mainHandler.removeCallbacks(it) }
        probeRunnable = null
    }
}
