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
 * 2) AudioManager 통화 모드 유지 휴리스틱 (다이얼러 미연결 OEM · InCall ACTIVE 누락 대비)
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
                    /*
                     * 다이얼러 미연결: 2.8s 후 오디오 모드.
                     * 다이얼러 연결인데 ACTIVE 누락 OEM: 4.5s 후 동일 휴리스틱 (수신만 되고 발신이 안 열리는 주원인).
                     */
                    val audioGateMs =
                        if (VlueInCallController.isDefaultDialerBound()) 4_500L else 2_800L
                    if (elapsed >= audioGateMs) {
                        val am = app.getSystemService(Context.AUDIO_SERVICE) as? AudioManager
                        val mode = am?.mode ?: AudioManager.MODE_NORMAL
                        if (mode == AudioManager.MODE_IN_CALL || mode == AudioManager.MODE_IN_COMMUNICATION) {
                            Log.i(
                                TAG,
                                "audio mode heuristic → notifyConnected mode=$mode " +
                                    "dialerBound=${VlueInCallController.isDefaultDialerBound()} elapsed=${elapsed}ms"
                            )
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
