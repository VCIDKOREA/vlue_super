package kr.vlue.calloverlay

import android.content.Context
import android.os.Handler
import android.os.Looper
import android.util.Log
import kr.vlue.calloverlay.incall.VlueInCallController

/**
 * 발신 BigPush 중 상대 응답 감지 → [CallOverlayService.notifyConnected].
 *
 * 삼성 등 OEM 은 발신 링잉 중에도 AudioManager.MODE_IN_CALL 을 켜므로
 * 오디오 휴리스틱으로 수화 판정하면 「거는 중」에 정상/안심 팝업이 뜬다.
 *
 * → **InCall STATE_ACTIVE 만** 신뢰한다.
 *   (다이얼링/연결 중을 한 번이라도 본 뒤에 ACTIVE 가 와야 함 — OEM 이 ACTIVE 를 일찍 올리는 경우 완화)
 * → 기본 전화앱이 아니어서 InCall 이 없으면 자동 전환하지 않고 BigPush 유지.
 */
object OutgoingPeerConnectProbe {
    private const val TAG = "OutgoingPeerConnect"
    private val mainHandler = Handler(Looper.getMainLooper())
    private var probeRunnable: Runnable? = null
    private var startedAtMs = 0L
    private var sawDialingOrConnecting = false

    fun start(context: Context) {
        stop()
        val app = context.applicationContext
        startedAtMs = android.os.SystemClock.elapsedRealtime()
        sawDialingOrConnecting = VlueInCallController.isDialingOrConnecting()
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
                    if (VlueInCallController.isDialingOrConnecting()) {
                        sawDialingOrConnecting = true
                        if (elapsed <= 180_000L) {
                            mainHandler.postDelayed(this, 350L)
                        } else {
                            stop()
                        }
                        return
                    }
                    if (VlueInCallController.hasConnectedActiveCall()) {
                        /*
                         * 발신: 다이얼링을 거친 뒤 ACTIVE = 상대 응답.
                         * 다이얼링 신호를 못 본 채 ACTIVE 만 오면(OEM) 최소 8초 경과 후에만 인정 —
                         * 거는 즉시 ACTIVE 오판으로 정상팝업이 뜨는 것을 막는다.
                         */
                        val allow =
                            sawDialingOrConnecting || elapsed >= 8_000L
                        if (allow) {
                            Log.i(
                                TAG,
                                "InCall ACTIVE → notifyConnected elapsed=${elapsed}ms " +
                                    "sawDialing=$sawDialingOrConnecting"
                            )
                            CallOverlayService.notifyConnected(app, trustedPeerConnected = false)
                            stop()
                            return
                        }
                        Log.d(
                            TAG,
                            "ACTIVE early without dialing history — hold BigPush elapsed=${elapsed}ms"
                        )
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
        Log.i(TAG, "started (InCall ACTIVE only — no audio heuristic)")
    }

    fun stop() {
        probeRunnable?.let { mainHandler.removeCallbacks(it) }
        probeRunnable = null
        sawDialingOrConnecting = false
    }
}
