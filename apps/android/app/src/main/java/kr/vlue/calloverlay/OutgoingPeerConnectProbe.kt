package kr.vlue.calloverlay

import android.content.Context
import android.media.AudioManager
import android.os.Handler
import android.os.Looper
import android.util.Log
import kr.vlue.calloverlay.incall.VlueInCallController

/**
 * 발신 BigPush 중 상대 응답 감지 → [CallOverlayService.notifyConnected].
 *
 * 삼성 등 OEM 은 발신 링잉 중에도 AudioManager.MODE_IN_CALL 을 켜므로
 * 오디오 모드만으로 수화 판정하면 「거는 중」에 안심/정상 팝업이 뜬다.
 * → InCall STATE_ACTIVE 우선. 오디오 휴리스틱은 다이얼링/연결 중 제외 + 연속 확인.
 */
object OutgoingPeerConnectProbe {
    private const val TAG = "OutgoingPeerConnect"
    private val mainHandler = Handler(Looper.getMainLooper())
    private var probeRunnable: Runnable? = null
    private var startedAtMs = 0L
    private var audioModeHits = 0

    fun start(context: Context) {
        stop()
        val app = context.applicationContext
        startedAtMs = android.os.SystemClock.elapsedRealtime()
        audioModeHits = 0
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
                        CallOverlayService.notifyConnected(app, trustedPeerConnected = false)
                        stop()
                        return
                    }
                    /* 발신 다이얼링/연결 중 — 오디오 휴리스틱 금지 */
                    if (VlueInCallController.isDialingOrConnecting()) {
                        audioModeHits = 0
                        if (elapsed <= 180_000L) {
                            mainHandler.postDelayed(this, 350L)
                        } else {
                            stop()
                        }
                        return
                    }
                    /*
                     * 다이얼링 종료 후: MODE_IN_CALL 연속 3회(≈1s) + 최소 6초 경과.
                     * 기본 전화앱 여부 무관 — OEM 이 STATE_ACTIVE 를 놓쳐도 수화 전환.
                     * (다이얼링 중에는 위에서 차단)
                     */
                    if (elapsed >= 6_000L) {
                        val am = app.getSystemService(Context.AUDIO_SERVICE) as? AudioManager
                        val mode = am?.mode ?: AudioManager.MODE_NORMAL
                        if (mode == AudioManager.MODE_IN_CALL || mode == AudioManager.MODE_IN_COMMUNICATION) {
                            audioModeHits += 1
                            if (audioModeHits >= 3) {
                                Log.i(
                                    TAG,
                                    "trusted peer audio (hits=$audioModeHits) → notifyConnected " +
                                        "mode=$mode elapsed=${elapsed}ms dialerBound=${VlueInCallController.isDefaultDialerBound()}"
                                )
                                CallOverlayService.notifyConnected(app, trustedPeerConnected = true)
                                stop()
                                return
                            }
                        } else {
                            audioModeHits = 0
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
        audioModeHits = 0
    }
}
