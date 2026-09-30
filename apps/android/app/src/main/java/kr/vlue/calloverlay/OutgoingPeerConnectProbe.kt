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
    private var labelFallbackFired = false

    /** 첫 확인 지연 / 폴링 주기 — 예전 500ms/350ms 는 연결 후 라벨 갱신이 체감상 늦었다 */
    private const val FIRST_TICK_MS = 150L
    private const val POLL_MS = 150L

    /**
     * 기본 전화앱이 아니면(InCallService 미바인딩) 텔레포니가 STATE_ACTIVE 를 주지 않아
     * 「연결중...」 라벨이 통화 내내 멈춘다. 이 시간이 지나면 **라벨만** 갱신한다.
     * remoteConnected 는 세우지 않는다 — 팝업/쇼케이스는 사용자 탭(원터치)으로만 열린다.
     */
    const val NON_DIALER_LABEL_FALLBACK_MS = 4_000L

    fun start(context: Context) {
        stop()
        val app = context.applicationContext
        startedAtMs = android.os.SystemClock.elapsedRealtime()
        labelFallbackFired = false
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
                    if (!labelFallbackFired &&
                        !VlueInCallController.isDefaultDialerBound() &&
                        elapsed >= NON_DIALER_LABEL_FALLBACK_MS
                    ) {
                        labelFallbackFired = true
                        Log.i(TAG, "non-default-dialer label fallback elapsed=${elapsed}ms")
                        CallOverlayService.notifyOutgoingLabelConnected()
                    }
                    if (VlueInCallController.isDialingOrConnecting()) {
                        sawDialingOrConnecting = true
                        if (elapsed <= 180_000L) {
                            mainHandler.postDelayed(this, POLL_MS)
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
                    mainHandler.postDelayed(this, POLL_MS)
                }
            }
        probeRunnable = tick
        mainHandler.postDelayed(tick, FIRST_TICK_MS)
        Log.i(TAG, "started (InCall ACTIVE only — no audio heuristic)")
    }

    fun stop() {
        probeRunnable?.let { mainHandler.removeCallbacks(it) }
        probeRunnable = null
        sawDialingOrConnecting = false
    }
}
