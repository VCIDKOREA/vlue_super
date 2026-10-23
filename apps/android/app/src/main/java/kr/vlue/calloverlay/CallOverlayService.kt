package kr.vlue.calloverlay

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.graphics.Color
import android.graphics.Outline
import android.graphics.PixelFormat
import android.graphics.Typeface
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.util.TypedValue
import android.telephony.TelephonyCallback
import android.telephony.TelephonyManager
import java.util.concurrent.Executor
import androidx.core.content.ContextCompat
import android.view.Gravity
import android.view.MotionEvent
import android.view.View
import android.view.inputmethod.InputMethodManager
import android.widget.EditText
import android.view.ViewOutlineProvider
import android.view.WindowManager
import android.animation.AnimatorListenerAdapter
import android.animation.ValueAnimator
import android.view.animation.DecelerateInterpolator
import kotlin.math.abs
import android.webkit.RenderProcessGoneDetail
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.TextView
import androidx.core.app.NotificationCompat
import kr.vlue.calloverlay.companion.CompanionOverlayController
import kr.vlue.calloverlay.companion.CompanionOverlaySession
import kr.vlue.calloverlay.companion.MiniCaseVisibility
import kr.vlue.calloverlay.companion.BigPushShowcaseBar
import kr.vlue.calloverlay.companion.OutgoingShowcaseGate
import kr.vlue.calloverlay.companion.ForegroundPackageProbe
import kr.vlue.calloverlay.companion.CompactIncomingMetrics
import kr.vlue.calloverlay.companion.OverlayContext
import kr.vlue.calloverlay.companion.OverlayContextDetector
import kr.vlue.calloverlay.companion.OverlayPosition
import kr.vlue.calloverlay.companion.OverlayPositionManager
import kr.vlue.calloverlay.companion.OverlayState
import kr.vlue.calloverlay.companion.OverlayTriggerEvent
import kr.vlue.calloverlay.companion.ScreenState
import kr.vlue.calloverlay.companion.ScreenStateDetector
import kr.vlue.calloverlay.companion.UsageAccessHelper
import kr.vlue.calloverlay.dcp.CallPathLookupMerge
import kr.vlue.calloverlay.dcp.CallPathReasonCopy
import kr.vlue.calloverlay.dcp.CallPathSession
import kr.vlue.calloverlay.dcp.ContactSafeCarePayload
import kr.vlue.calloverlay.dcp.ContactSafeCarePolicy
import kr.vlue.calloverlay.dcp.PublicDirectorySafePayload
import kr.vlue.calloverlay.dcp.VlueAuthMemberPopupPolicy
import kr.vlue.calloverlay.dcp.DcpAbnormalWarningView
import kr.vlue.calloverlay.dcp.DcpPopupPolicy
import kr.vlue.calloverlay.dcp.NationalAgencyWhitelist
import kr.vlue.calloverlay.dcp.UnregisteredNumberPopup
import kr.vlue.calloverlay.diagnostics.CompanionBigPushDiag
import kr.vlue.calloverlay.incall.VlueInCallController
import kr.vlue.calloverlay.diagnostics.CompanionRuntimeStabilityDiag
import kr.vlue.calloverlay.diagnostics.DiagnosticsFeature
import kr.vlue.calloverlay.diagnostics.DiagnosticsSessionStore
import kr.vlue.calloverlay.diagnostics.NormalOverlayProbe
import kr.vlue.calloverlay.diagnostics.OemDeviceProbe
import kr.vlue.calloverlay.diagnostics.OverlayDiagTracker
import kr.vlue.calloverlay.diagnostics.OverlayFailureReason
import kr.vlue.calloverlay.diagnostics.ReleaseDebugGate
import kr.vlue.calloverlay.diagnostics.perf.CompanionPerfTracker
import kr.vlue.calloverlay.diagnostics.recovery.CompanionRecoveryTracker
import kr.vlue.calloverlay.showcase.ShowcaseProximitySensor
import android.content.ComponentCallbacks2
import android.content.res.Configuration

/**
 * Companion Overlay FGS — docs/architecture/companion-overlay.md
 * 상태: BIG_PUSH | SHOWCASE | MINI_CASE (단일). 기본 전화앱을 대체하지 않는다.
 */
class CallOverlayService : Service() {
    private var windowManager: WindowManager? = null
    private var rootContainer: FrameLayout? = null
    private var nativeBanner: LinearLayout? = null
    /** 오버레이 웹 문서 로드 실패(404/5xx/네트워크) 시 네이티브 폴백 뷰 (BigPush 바 / 발신 로고) */
    private var overlayFallbackView: android.view.View? = null
    private var overlayLoadFailed: Boolean = false
    private var overlayLoadFailCount: Int = 0
    private var webView: WebView? = null
    private var overlayBannerAds: VlueBannerAdManager? = null
    private var layoutParams: WindowManager.LayoutParams? = null
    private var dismissing = false
    private val companion = CompanionOverlayController()
    private val mainHandler = Handler(Looper.getMainLooper())
    private var pendingCardJson: String? = null
    private var pendingVerified: Boolean = false
    private var currentPhone: String = ""
    private var currentOutgoing: Boolean = false
    /** 직전에 load 한 오버레이 발신 여부 — 방향 바뀌면 문서 강제 리로드 */
    private var lastLoadedOutgoing: Boolean? = null
    /**
     * 이 WebView 에 이미 올라간 통화 문서 키(번호+방향).
     * 같은 통화의 카드 갱신·connected·restore 에서 loadUrl 하면
     * React 트리가 죽고 DCC 가 빈 화면으로 다시 부팅된다.
     */
    private var liveOverlayDocumentKey: String? = null
    /** 문서 로드 / 데이터 갱신 / 렌더러 복구를 한 통화 기준으로 가른다. */
    private val overlaySession = CompanionOverlaySession()
    /** 마지막으로 웹에 넣은 카드 JSON — 동일 페이로드 재주입으로 enrich 를 다시 열지 않음 */
    private var lastInjectedCardJson: String? = null
    private var currentDcpRoute: String = ""
    private var keypadOpen = false
    private var userMinimized = false
    /**
     * 인증 팝업 「확인」→ MiniCase 이후.
     * 웹 connected 가 notifyVlueAuthMemberReady 를 다시 보내 팝업/SHOWCASE 로
     * 되돌리면 Mini 창이 사라지고 BigPush 가 재부착된다 (이상춘 등 auth-only).
     */
    private var authPopupConfirmedToMini = false
    /**
     * MiniCase「쇼케이스 돌아가기」→ 중앙 인증/비정상 팝업만 표시 중.
     * MiniCase 창은 숨기고 ContextWatch 가 BigPush 로 접지 못하게 한다.
     * Mini 탭은 직전 쇼케이스 또는 팝업으로 복원한다.
     */
    private var authPopupOnlyMode = false
    /**
     * dismiss 중 들어온 다음 수신 — drop 하면 잔존 Mini/바 와 다음 콜이 어긋난다.
     * removeOverlayImmediate 직후 재실행.
     */
    private var pendingShowAfterDismiss: PendingShowOverlay? = null
    private data class PendingShowOverlay(
        val phone: String,
        val verified: Boolean,
        val outgoing: Boolean,
        val cardJson: String?,
        val dcpRoute: String
    )
    /** Call End 누락 시 홈에 오버레이 고착 방지 — 서비스 자체 IDLE 감시 */
    private var idleTelephonyCallback: TelephonyCallback? = null
    @Suppress("DEPRECATION")
    private var idlePhoneStateListener: android.telephony.PhoneStateListener? = null
    private var lastTelephonyStateForDismiss: Int = TelephonyManager.CALL_STATE_IDLE
    private val bigPushSettle400 = Runnable {
        if (!dismissing && companion.state == OverlayState.BIG_PUSH) {
            reevaluateForegroundContext("bigPush_settle_400")
        }
    }
    private val bigPushSettle1200 = Runnable {
        if (!dismissing && companion.state == OverlayState.BIG_PUSH) {
            reevaluateForegroundContext("bigPush_settle_1200")
        }
    }
    private val bigPushSettle2500 = Runnable {
        if (!dismissing && companion.state == OverlayState.BIG_PUSH) {
            reevaluateForegroundContext("bigPush_settle_2500")
        }
    }

    private fun cancelBigPushSettle() {
        mainHandler.removeCallbacks(bigPushSettle400)
        mainHandler.removeCallbacks(bigPushSettle1200)
        mainHandler.removeCallbacks(bigPushSettle2500)
    }

    private fun scheduleBigPushSettle() {
        cancelBigPushSettle()
        mainHandler.postDelayed(bigPushSettle400, 400L)
        mainHandler.postDelayed(bigPushSettle1200, 1_200L)
        mainHandler.postDelayed(bigPushSettle2500, 2_500L)
    }
    private var screenStateDetector: ScreenStateDetector? = null
    /** Answer 직후 ContextWatch 가 OTHER_APP 로 쇼케이스를 깨지 않게 */
    private var showcaseHoldUntilElapsed: Long = 0L
    /** Mini→풀 직후 고스트 click 용 짧은 가드 (의도적 통화화면 보기는 막지 않음) */
    private var restoreGhostGuardUntilElapsed: Long = 0L
    /** 풀스크린 레이아웃이 커밋된 뒤에만 웹 쇼케이스를 연다. 작은 창에서 먼저 펼치면 잘린 먹통이 된다. */
    private var showcaseWebExpandPending: Boolean = false
    /**
     * MATCH_PARENT 를 넣어도 측정 높이는 한 프레임 동안 로고(409)·미니(293)로 남는다.
     * 이 잠금 동안 --vlue-overlay-h / resize / 미니 좌표 반영을 하지 않는다.
     */
    private var fullscreenHeightLock: Boolean = false
    private var fullscreenHeightLockAttempts: Int = 0
    private var fullscreenSettleGen: Int = 0
    private var fullscreenChromePublished: Boolean = false
    private var lastChromeSignature: String = ""
    private var lastDeliveredWebCallState: String = ""
    private val pendingFullscreenCallStates = mutableListOf<String>()
    /**
     * Mini 탭 복원 중. enterShowcaseLayout → applyLayout → commitFullscreen 이
     * allowFromMiniRestore 없이 mayCommit 을 다시 타면, 이미 연 쇼케이스도 거부되고
     * 창은 미니 높이로 남는다. 그 사이 웹이 펼치면 사진처럼 미니 틀 안에 쇼케이스 크롬이 끼인다.
     */
    private var fullscreenRestoreBypass: Boolean = false
    /**
     * 이 통화에서 자동으로 고른 화면. 늦은 조회가 더 낮은 화면으로 바꾸지 못한다.
     * 규격 §3 commit once / [CallUiPhasePolicy.mayReplaceCommittedPhase].
     */
    private var committedAnswerPhase: CallUiPhasePolicy.Phase = CallUiPhasePolicy.Phase.BIG_PUSH
    /** 이 통화에서 풀 쇼케이스를 한 번 연 뒤, 미니 탭은 다시 그 쇼케이스로 돌아간다. */
    private var showcaseOpenedThisCall: Boolean = false
    /** 발신: 상대 응답(STATE_ACTIVE / notifyConnected) 후에만 true — 다이얼 OFFHOOK 만으로는 Showcase 금지 */
    private var remoteConnected: Boolean = false
    /**
     * 발신: 중앙 VLUÉ 로고 탭 후에만 팝업/쇼케이스 자동 경로 허용 (규격 §3b).
     * 수신은 항상 무시(정책이 incoming 을 즉시 허용).
     */
    private var outgoingExpandRequestedByUser: Boolean = false
    /** 현재 중앙 팝업이 「미등록 번호 안심팝업」인가 — 더 높은 티어 결과가 늦게 오면 제자리 업그레이드 */
    private var unregisteredPopupShown: Boolean = false
    /** 현재 수신 링잉 시작(wall ms, -3s 여유). 0 = 미기록 */
    private var ringingSinceWallMs: Long = 0L
    /**
     * 미등록 팝업의 「스팸/피싱 제보 및 신고하기」를 사용자가 눌렀다.
     * 이때만 미인증 번호가 신고 패널(FULL_SHOWCASE)로 열린다 (계약 §3a rule 6).
     */
    private var unregisteredReportRequested: Boolean = false
    /** 발신 중앙 로고 오버레이 창 한 변 (dp) — 전체화면 금지 */
    private val outgoingLogoWindowDp: Int = 156
    /** BigPush 가장자리 피크 (MiniCase 패리티) — OverlayState 는 BIG_PUSH 유지 */
    private var bigPushPeeking: Boolean = false
    private var overlayModal: Boolean = false
    /** 피크 시 WebView 대신 동일한 좌/우 엣지 탭 */
    private var bigPushPeekTab: FrameLayout? = null
    private var bigPushPeekOnRight: Boolean = false
    /** BIG_PUSH/Mini → FULLSCREEN 부드러운 전환 (웹 0.42s 와 동기) */
    private var fullscreenExpandAnimator: ValueAnimator? = null
    /** DCP 정상/비정상 팝업 — BigPush 창과 분리(WRAP_CONTENT) */
    private var dcpPopupView: android.view.View? = null
    private var dcpPopupParams: WindowManager.LayoutParams? = null
    private var dcpPopupDestroyAds: (() -> Unit)? = null
    /** 설정 DCP 테스트 — 전체 오버레이 없이 팝업만 */
    private var dcpPopupOnly = false
    /** Phase 5-C — Memory callback 관찰만 (동작 변경 없음) */
    private var memoryCallbacks: ComponentCallbacks2? = null

    /**
     * 중앙 팝업 표시 게이트용 「수화됨」.
     * 발신: 실제 연결(remoteConnected) 또는 사용자가 미니버블을 탭(원터치) — 탭이 unlock.
     * 수신: remoteConnected 또는 통화 이미 수화.
     */
    private fun isCallAnsweredForPopup(): Boolean =
        if (currentOutgoing) remoteConnected || outgoingExpandRequestedByUser
        else remoteConnected || isCallAlreadyAnswered()

    /**
     * 탭/수화 시점에 카드가 비었거나 조회 대기면 메모리 프리패치 결과로 즉시 채운다.
     * 프리패치에도 없으면 미등록 확정 — 「검색 중」 상태를 사용자에게 절대 보이지 않는다.
     * 나중에 더 높은 티어가 도착하면 [applyCallInfoUpdate] 가 제자리 업그레이드한다.
     */
    private fun adoptPrefetchedCardIfPending(source: String, allowUnregisteredFallback: Boolean) {
        val json = pendingCardJson
        if (!json.isNullOrBlank() && !isLookupPendingCard(json)) return
        val entry = CallPrefetchCache.peek(currentPhone)
        val adopted =
            when {
                entry != null -> entry.rawJson ?: UnregisteredNumberPopup.json(currentPhone)
                allowUnregisteredFallback -> UnregisteredNumberPopup.json(currentPhone)
                else -> return
            }
        pendingCardJson = adopted
        pendingVerified = entry?.result?.verified ?: false
        bindDcpRoute(currentPhone, currentDcpRoute, adopted)
        webView?.let { wv ->
            if (!wv.url.isNullOrBlank()) injectCardLookupJson(wv, adopted)
        }
        VlueBigPushTrace.lifecycle(
            "PREFETCH_ADOPT",
            "source=$source tier=${entry?.tier?.name ?: "UNREGISTERED(none)"}"
        )
    }

    /** Derived — OverlayState SoT. 저장 flag 아님. */
    private fun isInCallOverlayState(): Boolean =
        companion.state == OverlayState.SHOWCASE || companion.state == OverlayState.MINI_CASE

    /**
     * Showcase 즉시 진입 여부.
     * 발신 다이얼(OFFHOOK)은 false → BigPush. 수신 Answer(OFFHOOK) 또는 remoteConnected 만 true.
     */
    private fun shouldEnterShowcaseNow(outgoing: Boolean): Boolean =
        OutgoingShowcaseGate.shouldEnterShowcaseNow(
            outgoing = outgoing,
            remoteConnected = remoteConnected,
            inCallOverlayState = isInCallOverlayState(),
            telephonyOffhook = telephonyCallState() == TelephonyManager.CALL_STATE_OFFHOOK
        )

    /** Diagnostics 관찰만 — Controller 상태는 이미 반영된 snapshot을 기록 */
    private fun publishCompanion(
        trigger: OverlayTriggerEvent,
        userAction: Boolean = false
    ) {
        OverlayDiagTracker.publishCompanion(companion.snapshot(), trigger, userAction)
    }

    override fun onBind(intent: Intent?): IBinder? {
        CompanionRecoveryTracker.recordServiceLifecycle("ON_BIND")
        return null
    }

    override fun onUnbind(intent: Intent?): Boolean {
        CompanionRecoveryTracker.recordServiceLifecycle("ON_UNBIND")
        return super.onUnbind(intent)
    }

    override fun onRebind(intent: Intent?) {
        CompanionRecoveryTracker.recordServiceLifecycle("ON_REBIND")
        super.onRebind(intent)
    }

    override fun onCreate() {
        super.onCreate()
        OverlayAssetServer.init(this)
        CompanionRuntimeStabilityDiag.mark("SERVICE_ON_CREATE", "CallOverlayService.onCreate")
        CompanionRecoveryTracker.recordServiceLifecycle("ON_CREATE")
        VlueBigPushTrace.bind(this)
        val instanceId = OverlayDiagTracker.onServiceCreated()
        OverlayDiagTracker.onForegroundStarted()
        VlueBigPushTrace.step(
            4,
            "CallOverlayService.onCreate()",
            "overlayInstanceId=$instanceId fgsStartAt=${OverlayDiagTracker.foregroundStartedAtMs}"
        )
        createNotificationChannel()
        if (!VlueForegroundHelper.start(this, NOTIFICATION_ID, buildNotification())) {
            android.util.Log.e(
                "CallOverlayService",
                "foreground start denied — stop without killing the process"
            )
            stopSelf()
            return
        }
        activeInstance = this
        OverlayDiagTracker.setOemDeviceInfo(OemDeviceProbe.collect(this))
        OverlayDiagTracker.refreshSecurityAuditReport()
        startScreenStateDetector()
        startContextWatch()
        registerMemoryCallbackObserver()
        registerIdleTelephonyWatch()
        /* 콜백 기준 상태만 동기화 — getCallState() IDLE 로 발신 직후 BigPush 를 죽이지 않음 */
        lastTelephonyStateForDismiss = telephonyCallState()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        CompanionRecoveryTracker.recordServiceLifecycle(
            "ON_START_COMMAND",
            "action=${intent?.action ?: "(null)"}"
        )
        when (intent?.action) {
            ACTION_NORMAL_OVERLAY_PROBE -> {
                if (!ReleaseDebugGate.allowDiagProbe()) {
                    CompanionRecoveryTracker.recordServiceLifecycle(
                        "ON_START_COMMAND",
                        "NORMAL_OVERLAY_PROBE blocked on release"
                    )
                    stopSelfTraced("normalProbeReleaseBlocked")
                    return START_NOT_STICKY
                }
                runNormalOverlayProbe()
                return START_NOT_STICKY
            }
            ACTION_DISMISS -> {
                dismissOverlay()
                return START_NOT_STICKY
            }
            ACTION_CONNECTED -> {
                val trusted = intent.getBooleanExtra(EXTRA_TRUSTED_PEER_CONNECTED, false)
                enterShowcaseFromAnswer(
                    source = if (trusted) "ACTION_CONNECTED_trusted" else "ACTION_CONNECTED",
                    trustedPeerConnected = trusted
                )
                return START_NOT_STICKY
            }
            ACTION_ENDED_KEEP -> {
                /* Companion MVP: Call End = 전 Overlay 즉시 제거. keep 경로 비활성 */
                if (CompanionMvpConfig.DELEGATE_CALL_UI) {
                    dismissOverlay()
                } else {
                    companion.onRestoreShowcase(OverlayContext.IN_CALL)
                    publishCompanion(OverlayTriggerEvent.USER_RESTORE)
                    applyLayoutFromController(source = "ACTION_ENDED_KEEP")
                notifyWebCallState("ended_keep_overlay")
                }
                return START_NOT_STICKY
            }
            ACTION_UPDATE_CALL_INFO -> {
                val phone = intent.getStringExtra(EXTRA_PHONE).orEmpty()
                val verified = intent.getBooleanExtra(EXTRA_VERIFIED, false)
                val outgoing = intent.getBooleanExtra(EXTRA_OUTGOING, false)
                val cardJson = intent.getStringExtra(EXTRA_CARD_JSON)
                val dcpRoute = intent.getStringExtra(EXTRA_DCP_ROUTE).orEmpty()
                applyCallInfoUpdate(phone, verified, outgoing, cardJson, dcpRoute)
                return START_NOT_STICKY
            }
            ACTION_DCP_TEST_POPUP -> {
                showDcpTestPopupOnly(
                    phone = intent.getStringExtra(EXTRA_PHONE).orEmpty().ifBlank { "112" },
                    cardJson = intent.getStringExtra(EXTRA_CARD_JSON),
                    dcpRoute = intent.getStringExtra(EXTRA_DCP_ROUTE).orEmpty()
                )
                return START_NOT_STICKY
            }
        }
        val phone = intent?.getStringExtra(EXTRA_PHONE).orEmpty()
        val verified = intent?.getBooleanExtra(EXTRA_VERIFIED, false) ?: false
        val outgoing = intent?.getBooleanExtra(EXTRA_OUTGOING, false) ?: false
        val cardJson = intent?.getStringExtra(EXTRA_CARD_JSON)
        val dcpRoute = intent?.getStringExtra(EXTRA_DCP_ROUTE).orEmpty()
        VlueBigPushTrace.step(
            5,
            "CallOverlayService.onStartCommand()",
            "phone=${ReleaseDebugGate.maskPhoneForLog(phone)} verified=$verified outgoing=$outgoing action=${intent?.action} " +
                "alreadyAttached=${rootContainer?.isAttachedToWindow == true} dcpRoute=$dcpRoute"
        )
        showOverlay(phone, verified, outgoing, cardJson, dcpRoute)
        return START_NOT_STICKY
    }

    private fun showOverlay(
        phone: String,
        verified: Boolean,
        outgoing: Boolean,
        cardJson: String? = null,
        dcpRoute: String = ""
    ) {
        if (dismissing) {
            pendingShowAfterDismiss =
                PendingShowOverlay(phone, verified, outgoing, cardJson, dcpRoute)
            CompanionRuntimeStabilityDiag.noteStaleEvent(
                "SHOW_OVERLAY",
                "showOverlay",
                detail = "dismissing→queued"
            )
            return
        }
        cancelBigPushSettle()
        val alreadyAttached = rootContainer?.isAttachedToWindow == true
        val answered = shouldEnterShowcaseNow(outgoing)
        /*
         * 팝업 확인 후 MiniCase 유지 중 — 카드 갱신/재진입이 BigPush·SHOWCASE 로 되돌리지 않음.
         * answered(remoteConnected) 여부와 무관 — 인증 확인 직후 connected 알림이 와도 Mini 유지.
         */
        if (userMinimized &&
            companion.state == OverlayState.MINI_CASE &&
            CompanionRuntimeStabilityDiag.isCallSessionActive()
        ) {
            currentOutgoing = outgoing
            pendingCardJson = cardJson ?: pendingCardJson
            pendingVerified = verified || pendingVerified
            bindDcpRoute(phone, dcpRoute, cardJson)
            currentPhone = phone
            if (!alreadyAttached) {
                attachOverlayWindow(
                    phone = phone,
                    verified = pendingVerified,
                    outgoing = outgoing,
                    cardJson = pendingCardJson,
                    asBigPush = false
                )
            } else if (webView != null && !cardJson.isNullOrBlank()) {
                injectCardLookupJson(webView, cardJson)
            }
            applyLayoutFromController(source = "showOverlay_keep_mini")
            notifyWebCallState("connected")
            notifyWebCallState("minimize_showcase")
            VlueBigPushTrace.lifecycle("SHOW_OVERLAY_KEEP_MINI", "phone=${ReleaseDebugGate.maskPhoneForLog(phone)}")
            return
        }
        val callState = telephonyCallState()
        currentOutgoing = outgoing
        if (outgoing && !answered) {
            outgoingExpandRequestedByUser = false
        }
        dcpPopupOnly = false
        bindDcpRoute(phone, dcpRoute, cardJson)
        /*
         * Call End 이후 enrich/queued FGS 가 세션 없이 IDLE 에서 showOverlay 를 다시 열면
         * 홈에 BigPush 가 고착된다.
         * 단, 발신 NEW_OUTGOING_CALL 직후는 세션은 살아 있는데 getCallState() 가 잠깐 IDLE —
         * 그 경우 BigPush 를 막으면 안 된다.
         */
        if (callState == TelephonyManager.CALL_STATE_IDLE &&
            !CompanionRuntimeStabilityDiag.isCallSessionActive()
        ) {
            CompanionRuntimeStabilityDiag.noteStaleEvent(
                "SHOW_OVERLAY_WHILE_IDLE",
                "showOverlay",
                detail = "alreadyAttached=$alreadyAttached state=${companion.state.name}"
            )
            if (alreadyAttached ||
                companion.state != OverlayState.IDLE ||
                dcpPopupView?.isAttachedToWindow == true
            ) {
                dismissOverlay()
            } else {
                stopSelfTraced("staleShowOverlayAfterCallEnd")
            }
            return
        }
        if (!CompanionRuntimeStabilityDiag.isCallSessionActive()) {
            CompanionRuntimeStabilityDiag.beginCallSession(
                if (answered) "showOverlay_answered" else "showOverlay_ringing"
            )
        }
        CompanionRuntimeStabilityDiag.mark("SHOW_OVERLAY_ENTER", "showOverlay")
        wakeScreenForCallOverlay()
        val canDraw = LetteringPermissionHelper.canDrawOverlays(this)
        CompanionRuntimeStabilityDiag.mark(
            "PERMISSION_GATE",
            "SHOW_OVERLAY_GATE",
            org.json.JSONObject().put("canDrawOverlays", canDraw)
        )
        val ctx = detectOverlayContext(forceRinging = !answered)
        companion.onIncoming(ctx)
        CompanionBigPushDiag.noteOnIncoming(companion.snapshot())
        CompanionBigPushDiag.noteOverlayPermissionCheck(
            context = this,
            source = CompanionBigPushDiag.SOURCE_SHOW_OVERLAY_GATE,
            canDrawOverlays = canDraw,
            callPhase = if (answered) "OFFHOOK" else "RINGING",
            screenState = companion.screenState.name,
            overlayState = companion.state.name,
            requestedWindowType = WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
        )
        CompanionBigPushDiag.noteShowOverlayEnter(
            answered = answered,
            canDrawOverlays = canDraw,
            attached = alreadyAttached,
            snap = companion.snapshot()
        )
        OverlayDiagTracker.onShowOverlay()
        publishCompanion(OverlayTriggerEvent.INCOMING)
        VlueBigPushTrace.step(
            6,
            "showOverlay()",
            "file=CallOverlayService.kt phone=${ReleaseDebugGate.maskPhoneForLog(phone)} verified=$verified outgoing=$outgoing " +
                "answered=$answered alreadyAttached=$alreadyAttached " +
                companion.snapshot().toJson().toString() + " " +
                OverlayDiagTracker.detailSuffix()
        )

        /* Answer-before-BigPush: 수신 Answer 또는 발신 상대응답 후에만 SHOWCASE */
        if (answered) {
            if (userMinimized || authPopupConfirmedToMini || companion.state == OverlayState.MINI_CASE) {
                userMinimized = true
                if (companion.state != OverlayState.MINI_CASE) {
                    companion.onMinimize(
                        if (keypadOpen) OverlayContext.KEYPAD else OverlayContext.MINIMIZED
                    )
                }
                currentPhone = phone
                pendingCardJson = cardJson ?: pendingCardJson
                pendingVerified = verified || pendingVerified
                if (!alreadyAttached) {
                    attachOverlayWindow(
                        phone = phone,
                        verified = pendingVerified,
                        outgoing = outgoing,
                        cardJson = pendingCardJson,
                        asBigPush = false
                    )
                } else if (webView != null && !cardJson.isNullOrBlank()) {
                    injectCardLookupJson(webView, cardJson)
                }
                applyLayoutFromController(source = "answerBeforeBigPush_keep_mini")
                notifyWebCallState("connected")
                notifyWebCallState("minimize_showcase")
                VlueBigPushTrace.lifecycle(
                    "ANSWER_KEEP_MINI",
                    "phone=${ReleaseDebugGate.maskPhoneForLog(phone)} state=${companion.state.name}"
                )
                return
            }
            CompanionBigPushDiag.noteShowOverlayEarlyExit(
                reason = "ALREADY_ANSWERED",
                snap = companion.snapshot(),
                attached = alreadyAttached
            )
            CompanionBigPushDiag.noteBigPushSkipped("ALREADY_ANSWERED", companion.snapshot())
            VlueBigPushTrace.milestone(
                "ANSWER_DETECTED",
                "Answer Detected",
                seq = 6,
                detail = "answerBeforeBigPush outgoing=$outgoing remoteConnected=$remoteConnected"
            )
            /*
             * 인증-only·안심케어는 풀 SHOWCASE 금지 — enterShowcaseFromAnswer 와 동일 게이트.
             * (이전: onAnswer+fullscreen 만 호출 → 송출 OFF 회원도 빈 쇼케이스로 열림)
             */
            remoteConnected = true
            enterShowcaseFromAnswer("answerBeforeBigPush")
            return
        }

        if (!canDraw) {
            CompanionBigPushDiag.noteShowOverlayEarlyExit(
                reason = "NO_OVERLAY_PERMISSION",
                snap = companion.snapshot(),
                attached = alreadyAttached
            )
            OverlayDiagTracker.recordOverlayFailure(
                OverlayFailureReason.PERMISSION_DENIED,
                phase = "BIG_PUSH",
                detail = "SYSTEM_ALERT_WINDOW missing at showOverlay"
            )
            VlueBigPushTrace.skip(6, "NO_OVERLAY_PERMISSION at showOverlay")
            stopSelfTraced("noOverlayPermission")
            return
        }

        CompanionBigPushDiag.noteBigPushRequestBegin(companion.snapshot())
        CompanionRuntimeStabilityDiag.mark("BIG_PUSH_REQUEST_BEGIN", "showOverlay")
        val allowBigPush = companion.requestBigPush(ctx, callAlreadyAnswered = false)
        CompanionBigPushDiag.noteBigPushRequestResult(
            accepted = allowBigPush,
            snap = companion.snapshot(),
            rejectReason = companion.rejectedTransition
        )
        if (allowBigPush) {
            CompanionRuntimeStabilityDiag.mark("BIG_PUSH_ACCEPTED", "showOverlay")
        }
        publishCompanion(OverlayTriggerEvent.INCOMING)
        if (!allowBigPush) {
            val screenOff =
                companion.screenState == ScreenState.SCREEN_OFF ||
                    companion.screenState == ScreenState.AOD
            val reason =
                if (screenOff) OverlayFailureReason.SCREEN_OFF_POLICY
                else OverlayFailureReason.UNKNOWN
            CompanionBigPushDiag.noteShowOverlayEarlyExit(
                reason = "BIG_PUSH_REJECTED",
                snap = companion.snapshot(),
                attached = alreadyAttached
            )
            OverlayDiagTracker.recordOverlayFailure(
                reason = reason,
                phase = "BIG_PUSH",
                detail = companion.rejectedTransition ?: "requestBigPush rejected"
            )
            VlueBigPushTrace.skip(6, "requestBigPush rejected: ${companion.rejectedTransition}")
            stopSelfTraced("bigPushRejected")
            return
        }

        VlueBigPushTrace.milestone(
            "BIG_PUSH_REQUESTED",
            "BigPush Requested",
            seq = 6,
            detail = "pos=${companion.position.name} context=${companion.context.name}"
        )
        /* 기존 Window 재사용 — remove+add 는 BadToken/흰화면 유발 */
        if (alreadyAttached) {
            /*
             * 연속 수신: 직전 MiniCase/CONNECTED DOM 이 남으면 삼성 미니 UI 와 겹친다.
             * 번호 동일 여부와 관계없이 문서·미니 세션을 강제 리셋하고 BigPush 바로 복귀.
             */
            userMinimized = false
            authPopupConfirmedToMini = false
            authPopupOnlyMode = false
            bigPushPeeking = false
            applyLayoutFromController(source = "bigPush_reuseWindow")
            val phoneChanged = overlayPhoneChanged(phone)
            currentPhone = phone
            pendingCardJson = cardJson
            pendingVerified = verified
            val wv = webView
            if (wv != null && !IncomingNumberResolver.isUnknown(phone)) {
                /* 번호 동일 재사용은 URL 리로드 금지 — pending 투명→페인트 깜박임 */
                loadOverlayDocument(
                    wv,
                    phone,
                    verified,
                    outgoing,
                    cardJson,
                    forceNewDocument = phoneChanged
                )
            }
            syncDcpRoutePopup(cardJson, currentDcpRoute)
            syncOverlayChromeForState(source = "bigPush_reuseWindow")
            /* sync 전에 웹이 restoreHold 로 big_push 를 무시해도 idle→bar 로 MiniCase 해제 */
            notifyCompactCallChrome()
            /* 재사용 경로에서도 발신 상대응답 프로브 유지 (addView 때만 start 하면 누락) */
            if (outgoing && !remoteConnected) {
                OutgoingPeerConnectProbe.start(this)
            }
        } else {
            attachOverlayWindow(
                phone = phone,
                verified = verified,
                outgoing = outgoing,
                cardJson = cardJson,
                asBigPush = true
            )
        }
        /*
         * InCallActivity ACTIVITY_RESUMED 가 FGS/알림보다 늦을 수 있음 (DUT usagestats).
         * 재평가로 전체 UI→TOP / 다른앱→BOTTOM 분리 보정.
         */
        scheduleBigPushSettle()
    }

    /**
     * Window + WebView 부착. asBigPush=true 이면 PositionManager TOP/BOTTOM compact.
     */
    private fun attachOverlayWindow(
        phone: String,
        verified: Boolean,
        outgoing: Boolean,
        cardJson: String?,
        asBigPush: Boolean
    ) {
        val canDrawAttach = LetteringPermissionHelper.canDrawOverlays(this)
        CompanionBigPushDiag.noteOverlayPermissionCheck(
            context = this,
            source = CompanionBigPushDiag.SOURCE_ATTACH_GATE,
            canDrawOverlays = canDrawAttach,
            callPhase = if (asBigPush) "RINGING" else "OFFHOOK",
            screenState = companion.screenState.name,
            overlayState = companion.state.name,
            requestedWindowType = WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
        )
        /*
         * Phase 6-I: Permission false 인데 addView 를 호출하면
         * BadToken/PERMISSION_DENIED 가 나고 Diagnostics 가 ATTACH 와 PERMISSION 을 혼동한다.
         * Samsung 사이드로드는 통화 중 canDraw=false — 무리한 addView 금지.
         */
        if (!LetteringPermissionHelper.mayAttachOverlay(this)) {
            val detail =
                if (LetteringPermissionHelper.isLikelySamsungCallOverlayRestricted(this)) {
                    "SAMSUNG_SIDELOAD_CALL_RESTRICT installer=${LetteringPermissionHelper.installerPackage(this)} " +
                        "appOps=${LetteringPermissionHelper.overlayAppOpsModeName(this)}"
                } else {
                    "NO_OVERLAY_PERMISSION appOps=${LetteringPermissionHelper.overlayAppOpsModeName(this)}"
                }
            OverlayDiagTracker.recordOverlayFailure(
                OverlayFailureReason.PERMISSION_DENIED,
                phase = if (asBigPush) "BIG_PUSH" else "SHOWCASE",
                detail = detail
            )
            LetteringPrefs.setLastOverlayError(this, detail)
            VlueBigPushTrace.skip(7, "ATTACH blocked: $detail")
            LetteringIncomingNotifier.post(this, phone, outgoing, forceFallback = true)
            /* addView 미호출 — onCallEnd 금지 */
            return
        }
        if (asBigPush) {
            CompanionBigPushDiag.noteAttachRequest(
                companion.snapshot(),
                attached = rootContainer?.isAttachedToWindow == true
            )
        }
        windowManager = getSystemService(WINDOW_SERVICE) as WindowManager
        if (asBigPush) {
            wakeScreenForCallOverlay()
        }
        val container = FrameLayout(this).apply {
            /*
             * BIG_PUSH: 투명 — 웹 LetteringIncomingNotification(home-glass) 바만 표시.
             * SHOWCASE/FULLSCREEN: 다크 베이스(WebView 흰 깜빡임 방지).
             */
            setBackgroundColor(
                if (asBigPush) Color.TRANSPARENT else Color.parseColor("#0B101B")
            )
        }

        /*
         * BigPush SoT = Web LetteringIncomingNotification(home-glass) — 앱 홈 쇼케이스바와 동일.
         * Native BigPushShowcaseBar 는 생성만 하고 항상 GONE (임의 UI 송출 금지).
         */
        val banner = BigPushShowcaseBar.create(
            context = this,
            phone = phone,
            verified = verified,
            outgoing = outgoing,
            cardJson = cardJson
        )
        nativeBanner = banner
        val bannerLp = FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT,
            FrameLayout.LayoutParams.WRAP_CONTENT,
            Gravity.TOP
        ).apply {
            marginStart = dp(10)
            marginEnd = dp(10)
            topMargin = dp(0)
            bottomMargin = dp(4)
        }
        banner.visibility = android.view.View.GONE
        container.addView(banner, bannerLp)

        val wv = WebView(this)
        LetteringJavascriptBridge.attach(wv, this)
        wv.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            /* 오버레이 CSS/JS 캐시로 미니케이스·바가 옛 스타일로 남는 것 방지 */
            cacheMode = WebSettings.LOAD_NO_CACHE
            userAgentString = VlueLetteringConfig.withAndroidUserAgent(userAgentString.orEmpty())
        }
        wv.setBackgroundColor(Color.TRANSPARENT)
        /*
         * HARDWARE 레이어는 반투명 라운드 보더를 좌측에서 잘라 먹는 경우가 많음 (MiniCase 증상).
         * NONE 이면 테두리 유지.
         */
        wv.setLayerType(android.view.View.LAYER_TYPE_NONE, null)
        /* BigPush도 앱 쇼케이스바(Web) — Native 바 숨김.
         * 발신 로고 단계는 웹 탭(깜빡임)만 사용 — WebView 제스처가 click 을 가로채지 않게 함. */
        wv.visibility = android.view.View.VISIBLE
        if (asBigPush && !outgoing) {
            attachBigPushDragGestures(wv)
        }
        wv.webChromeClient = overlayChromeClient()
        OverlayDebugLog.auditBundledAssets(this)
        wv.webViewClient = overlayWebViewClient()
        container.addView(
            wv,
            FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT
            )
        )
        val peekTab = buildBigPushPeekTab()
        peekTab.visibility = android.view.View.GONE
        container.addView(
            peekTab,
            FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT
            )
        )
        bigPushPeekTab = peekTab
        if (asBigPush && !outgoing) {
            attachBigPushDragGestures(peekTab)
        }

        val params = if (asBigPush && outgoing) {
            buildOutgoingLogoLayoutParams()
        } else if (asBigPush) {
            buildBigPushLayoutParams(companion.position)
        } else if (
            authPopupConfirmedToMini ||
            userMinimized ||
            companion.state == OverlayState.MINI_CASE
        ) {
            buildMiniCaseLayoutParams()
        } else {
            buildShowcaseLayoutParams()
        }

        VlueBigPushTrace.dumpOverlayPermissionProbe(
            context = this,
            params = params,
            phase = "pre-addView"
        )
        VlueBigPushTrace.dumpLayoutParams(params, "showOverlay LayoutParams pre-addView")

        val fromBottom = asBigPush && companion.position == OverlayPosition.BOTTOM
        /* BigPush: 즉시 표시 — alpha/slide 애니면 pending 투명 프레임과 겹쳐 한 번 깜박임 */
        if (asBigPush) {
            container.alpha = 1f
            container.translationY = 0f
        } else {
        container.alpha = 0f
            container.translationY = if (fromBottom) 120f else -120f
        }
        val attachPhase = if (asBigPush) "BIG_PUSH" else "SHOWCASE"
        OverlayDiagTracker.beginAttach(attachPhase)
        try {
            VlueBigPushTrace.addViewCall(
                "phone=${ReleaseDebugGate.maskPhoneForLog(phone)} type=${params.type} w=${params.width} h=${params.height} " +
                    "pos=${companion.position.name} state=${companion.state.name} " +
                    "canDrawOverlays=${LetteringPermissionHelper.canDrawOverlays(this)} " +
                    OverlayDiagTracker.detailSuffix()
            )
            OverlayDiagTracker.markAddViewBegin()
            if (asBigPush) {
                CompanionBigPushDiag.noteAddViewBegin(
                    snap = companion.snapshot(),
                    windowType = params.type,
                    flags = params.flags,
                    canDrawOverlays = LetteringPermissionHelper.canDrawOverlays(this)
                )
            }
            CompanionRuntimeStabilityDiag.mark("ADD_VIEW_BEGIN", if (asBigPush) "bigPush" else "showcase")
        windowManager?.addView(container, params)
            OverlayDiagTracker.onAddView()
            OverlayDiagTracker.markAddViewSuccess()
            CompanionRuntimeStabilityDiag.mark("ADD_VIEW_SUCCESS", if (asBigPush) "bigPush" else "showcase")
            VlueBigPushTrace.addViewSuccess(container, params, "phone=${ReleaseDebugGate.maskPhoneForLog(phone)}")
            if (asBigPush) {
                CompanionBigPushDiag.noteAddViewSuccess(companion.snapshot())
                CompanionBigPushDiag.noteLayoutRequest(companion.snapshot(), source = "addView_initialParams")
                CompanionBigPushDiag.noteLayoutApplied(companion.snapshot(), source = "addView_initialParams")
                VlueBigPushTrace.milestone(
                    "BIG_PUSH_VISIBLE",
                    "BigPush Visible",
                    seq = 8,
                    detail = "addView SUCCESS pos=${companion.position.name}"
                )
                OverlayDiagTracker.markBigPushVisibleCommit()
                CompanionRuntimeStabilityDiag.mark("BIG_PUSH_VISIBLE", "addView_success")
                if (outgoing) {
                    OutgoingPeerConnectProbe.start(this)
                }
            }
            VlueBigPushTrace.recordOverlayAddViewProbe(
                context = this,
                probeKind = "CALL_OVERLAY_PROBE",
                result = "SUCCESS",
                params = params,
                extra = org.json.JSONObject()
                    .put("phone", ReleaseDebugGate.maskPhoneForLog(phone))
                    .put("phase", if (asBigPush) "big_push" else "showcase")
                    .put("overlayState", companion.state.name)
                    .put("overlayContext", companion.context.name)
                    .put("overlayPosition", companion.position.name)
            )
            VlueBigPushTrace.dumpOverlayVisibility(
                container,
                params,
                reactHint = "WebView not loaded yet (pre-loadUrl)"
            )
            LetteringPrefs.setLastCallEvent(this, "overlay_shown:$phone")
            if (asBigPush) {
                LetteringRingingActivity.requestFinish(this)
            }
            syncOverlayChromeForState(source = if (asBigPush) "attach_bigPush" else "attach_showcase")
        } catch (e: Exception) {
            val canDraw = LetteringPermissionHelper.canDrawOverlays(this)
            val reason = OemDeviceProbe.classifyFailure(e, canDrawOverlays = canDraw)
            OverlayDiagTracker.markAddViewFailed(reason, e, phase = attachPhase)
            if (asBigPush) {
                CompanionBigPushDiag.noteAddViewFailed(
                    snap = companion.snapshot(),
                    reason = reason,
                    error = e,
                    windowType = params.type,
                    layoutFlags = params.flags,
                    canDrawOverlays = canDraw,
                    oemInfo = OverlayDiagTracker.snapshotJson().optJSONObject("oemDeviceInfo")
                )
            }
            VlueBigPushTrace.dumpOverlayPermissionProbe(
                context = this,
                params = params,
                phase = "BadTokenException-or-addView-fail",
                error = e
            )
            VlueBigPushTrace.dumpLayoutParams(params, "LayoutParams AFTER addView FAIL")
            VlueBigPushTrace.addViewException(e)
            VlueBigPushTrace.recordOverlayAddViewProbe(
                context = this,
                probeKind = "CALL_OVERLAY_PROBE",
                result = "EXCEPTION",
                params = params,
                error = e,
                extra = org.json.JSONObject()
                    .put("phone", ReleaseDebugGate.maskPhoneForLog(phone))
                    .put("overlayState", companion.state.name)
                    .put("overlayPosition", companion.position.name)
                    .put("failureReason", reason.name)
            )
            android.util.Log.e("CallOverlay", "addView failed", e)
            LetteringPrefs.setLastOverlayError(
                this,
                "addView:${e.javaClass.simpleName}:${e.message}"
            )
            /*
             * Phase 6-H: addView 실패 시 onCallEnd/stopSelf 로 Showcase 를 죽이지 않는다.
             * 세션·Controller 유지. HUN 폴백만 (Companion Window 추가 금지).
             */
            LetteringIncomingNotifier.post(this, phone, outgoing, forceFallback = true)
            /* Activity 폴백 금지 — 홈/뒤로가기 가로챔 */
            return
        }
        rootContainer = container
        webView = wv
        overlayBannerAds?.destroy()
        overlayBannerAds = VlueBannerAdManager(this, container, wv)
        layoutParams = params
        ShowcaseProximitySensor.attach(this, wv)
        publishCompanion(
            if (asBigPush) OverlayTriggerEvent.INCOMING else OverlayTriggerEvent.ANSWER
        )
        /* 오버레이 BigPush 가 보이면 HUN 중복(깜빡임) 제거 — 실패 시에만 Notifier 폴백 */
        if (asBigPush) {
            LetteringIncomingNotifier.cancel(this)
        }

        currentPhone = phone
        currentOutgoing = outgoing
        if (asBigPush && System.currentTimeMillis() - ringingSinceWallMs > 45_000L) {
            /* 새 수신 시작 시각 (워치독 재기동으로 같은 링잉 중 갱신되지 않도록 45s 가드) — — 이후 InCallActivity resume 만 「풀 전화 UI」 증거로 인정 (직전 통화 stale 제외) */
            ringingSinceWallMs = System.currentTimeMillis() - 3_000L
        }
        pendingCardJson = cardJson
        pendingVerified = verified
        val forMiniCase =
            !asBigPush &&
                (userMinimized ||
                    authPopupConfirmedToMini ||
                    companion.state == OverlayState.MINI_CASE)
        wv.loadUrl(
            VlueLetteringConfig.overlayUrl(
                phone,
                verified,
                outgoing,
                currentDcpRoute,
                miniCase = forMiniCase
            )
        )
        CompanionPerfTracker.noteWebViewLoadStart()
        if (!cardJson.isNullOrBlank()) {
            injectCardLookupJson(wv, cardJson)
        }
        syncDcpRoutePopup(cardJson, currentDcpRoute)

        val animStart = android.os.SystemClock.elapsedRealtime()
        if (asBigPush) {
            CompanionPerfTracker.recordAnimationMs(0L)
            if (companion.state == OverlayState.BIG_PUSH) {
                CompanionBigPushDiag.noteBigPushVisible(
                    companion.snapshot(),
                    source = "attach_no_anim"
                )
            }
            VlueBigPushTrace.dumpOverlayVisibility(
                rootContainer,
                layoutParams,
                reactHint = "bigPush immediate alpha=1 webView=${webView != null}"
            )
        } else {
        container.animate()
            .alpha(1f)
            .translationY(0f)
            .setDuration(320)
            .setInterpolator(DecelerateInterpolator())
                .withEndAction {
                    CompanionPerfTracker.recordAnimationMs(
                        (android.os.SystemClock.elapsedRealtime() - animStart).coerceAtLeast(0L)
                    )
                    VlueBigPushTrace.dumpOverlayVisibility(
                        rootContainer,
                        layoutParams,
                        reactHint = "post-animate alpha=${rootContainer?.alpha} webView=${webView != null}"
                    )
                }
            .start()
        }
    }

    /**
     * Native Answer / OFFHOOK / ACTIVE → call UI phase per [CALL_OVERLAY_CONTRACT.md].
     * Decisions go through [CallUiPhasePolicy] — do not add parallel open paths.
     */
    private fun enterShowcaseFromAnswer(
        source: String,
        trustedPeerConnected: Boolean = false
    ) {
        if (dismissing) {
            CompanionRuntimeStabilityDiag.noteStaleEvent(
                "CONNECTED",
                source,
                detail = "enterShowcaseFromAnswer ignored dismissing=true"
            )
            return
        }
        /* 세션 플래그만 꺼진 채 오버레이가 남은 경우 — 수화 UI 를 버리지 않고 세션 복구 */
        if (!CompanionRuntimeStabilityDiag.isCallSessionActive()) {
            CompanionRuntimeStabilityDiag.beginCallSession("enterShowcaseFromAnswer_$source")
            VlueBigPushTrace.lifecycle(
                "CALL_SESSION_REACTIVATE",
                "source=$source — session was inactive, overlay still up"
            )
        }
        if (!CallUiPhasePolicy.mayAdvancePastBigPush(
                outgoing = currentOutgoing,
                remoteConnected = remoteConnected,
                dialingOrConnecting = VlueInCallController.isDialingOrConnecting(),
                hasActiveConnectedCall = VlueInCallController.hasConnectedActiveCall(),
                trustedPeerConnected = trustedPeerConnected,
                userTapRequested = currentOutgoing && outgoingExpandRequestedByUser
            )
        ) {
            VlueBigPushTrace.lifecycle(
                "ANSWER_HOLD_DIALING",
                "source=$source keep BigPush — CallUiPhasePolicy dialing gate " +
                    "trusted=$trustedPeerConnected"
            )
            restartOutgoingPeerProbeIfNeeded()
            return
        }
        CompanionRuntimeStabilityDiag.mark("ANSWER_DETECTED", source)
        CompanionRuntimeStabilityDiag.mark("CONTROLLER_ON_ANSWER", source)
        /*
         * v2 원터치: 다이얼링 중 사용자 탭으로 통과한 경우 remoteConnected 를 세우지 않는다.
         * (실제 ACTIVE 가 오면 프로브/InCall 경로가 라벨과 함께 확정)
         */
        val realConnect =
            !currentOutgoing ||
                remoteConnected ||
                VlueInCallController.hasConnectedActiveCall() ||
                !VlueInCallController.isDialingOrConnecting()
        if (realConnect) {
            OutgoingPeerConnectProbe.stop()
            remoteConnected = true
        }
        VlueBigPushTrace.milestone(
            "ANSWER_DETECTED",
            "Answer Detected",
            seq = 8,
            detail = source
        )

        /* 발신: 수화 후에도 중앙 로고 유지 — 사용자 탭 전까지 팝업/쇼케이스 금지 (§3b) */
        if (!CallUiPhasePolicy.mayAutoExpandAfterAnswer(
                outgoing = currentOutgoing,
                expandRequestedByUser = outgoingExpandRequestedByUser
            )
        ) {
            cancelAnswerUiResume()
            ensureOutgoingLogoWindowLayout()
            notifyWebCallState("outgoing_logo")
            notifyWebCallState("outgoing_connected")
            VlueBigPushTrace.lifecycle(
                "OUTGOING_LOGO_HOLD",
                "source=$source — wait user logo tap"
            )
            return
        }

        if (authPopupConfirmedToMini ||
            userMinimized ||
            companion.state == OverlayState.MINI_CASE
        ) {
            VlueBigPushTrace.lifecycle(
                "ANSWER_KEEP_MINI_PHASE",
                "source=$source state=${companion.state.name}"
            )
            return
        }

        /*
         * 메모리 프리패치 결과를 즉시 채택 (Zero Latency).
         * 수신 수화·발신 탭: 프리패치가 없으면 미등록 확정으로 안심팝업을 바로 연다.
         * 조회를 기다리며 BigPush 에 남기면 수화 후에도 팝업/쇼케이스가 안 뜬다.
         * 더 높은 티어가 늦게 오면 applyCallInfoUpdate 가 제자리 업그레이드한다.
         */
        adoptPrefetchedCardIfPending(
            source = source,
            allowUnregisteredFallback = !currentOutgoing || outgoingExpandRequestedByUser
        )

        val verified = pendingVerified || parseIsVerified(pendingCardJson)
        val safeCare = isContactSafeCare(pendingCardJson)
        val authOnly = VlueAuthMemberPopupPolicy.isAuthMemberOnly(pendingCardJson, verified)
        val pendingLookup =
            pendingCardJson.isNullOrBlank() || isLookupPendingCard(pendingCardJson)
        val contactName = DeviceContactsReader.resolveDisplayNameForSafeCare(this, currentPhone)
        val canPromote =
            !safeCare && !contactName.isNullOrBlank() &&
                (pendingLookup || !verified)
        val hasBroadcastContent =
            VlueAuthMemberPopupPolicy.hasBroadcastShowcaseContent(pendingCardJson)
        val pathAbnormal = isCurrentPathAbnormal(pendingCardJson)
        val unverifiedResolved =
            !pendingLookup &&
                !safeCare &&
                !verified &&
                !authOnly &&
                VlueAuthMemberPopupPolicy.isUnverifiedResolved(pendingCardJson)

        val phase =
            CallUiPhasePolicy.decideAfterAnswer(
                CallUiPhasePolicy.AnswerInput(
                    alreadyMiniOrAuthConfirmed = false,
                    isContactSafeCare = safeCare,
                    isAuthMemberOnly = authOnly,
                    hasBroadcastShowcaseContent = hasBroadcastContent,
                    canPromoteContactSafeCare = canPromote,
                    isUnverifiedResolved = unverifiedResolved,
                    isPathAbnormal = pathAbnormal,
                    reportRequested = unregisteredReportRequested
                )
            )
        VlueBigPushTrace.lifecycle(
            "CALL_UI_PHASE",
            "source=$source phase=${phase.name} verified=$verified pending=$pendingLookup " +
                "unverified=$unverifiedResolved pathAbnormal=$pathAbnormal"
        )

        when (phase) {
            CallUiPhasePolicy.Phase.MINI_CASE -> return
            CallUiPhasePolicy.Phase.CENTER_SAFE_POPUP -> {
                if (pathAbnormal) {
                    val verdict =
                        CallPathSession.lastVerdict ?: CallPathSession.consumeOrVerify(this)
                    if (!safeCare && canPromote) {
                        val name = contactName.orEmpty()
                        val json = ContactSafeCarePayload.toJson(currentPhone, name, verdict)
                        pendingCardJson = json
                        pendingVerified = false
                        bindDcpRoute(currentPhone, verdict.routeQuery, json)
                        VlueBigPushTrace.lifecycle(
                            "ANSWER_PROMOTE_CONTACT_SAFE_CARE_ABNORMAL",
                            "name=$name source=$source"
                        )
                    } else {
                        val raw = pendingCardJson.orEmpty()
                        if (raw.isNotBlank()) {
                            val merged =
                                CallPathLookupMerge.merge(raw, verdict, currentOutgoing)
                            pendingCardJson = merged.json
                            bindDcpRoute(
                                currentPhone,
                                merged.route.ifBlank { "abnormal" },
                                pendingCardJson
                            )
                        } else {
                            bindDcpRoute(currentPhone, "abnormal", pendingCardJson)
                        }
                        VlueBigPushTrace.lifecycle(
                            "ANSWER_PATH_ABNORMAL_SAFE_POPUP",
                            "source=$source — showcase blocked"
                        )
                    }
                    presentCenterSafePopup(source = source, authMember = false)
                    return
                }
                if (!safeCare && canPromote) {
                    val name = contactName.orEmpty()
                    val verdict = CallPathSession.lastVerdict ?: CallPathSession.consumeOrVerify(this)
                    val json = ContactSafeCarePayload.toJson(currentPhone, name, verdict)
                    pendingCardJson = json
                    pendingVerified = false
                    bindDcpRoute(currentPhone, verdict.routeQuery, json)
                    VlueBigPushTrace.lifecycle(
                        "ANSWER_PROMOTE_CONTACT_SAFE_CARE",
                        "name=$name source=$source"
                    )
                }
                presentCenterSafePopup(source = source, authMember = false)
                return
            }
            CallUiPhasePolicy.Phase.CENTER_AUTH_POPUP -> {
                presentCenterSafePopup(source = source, authMember = true)
                return
            }
            CallUiPhasePolicy.Phase.KEEP_BIG_PUSH,
            CallUiPhasePolicy.Phase.BIG_PUSH -> {
                val fromOutgoingLogoTap = source == "outgoing_logo_tap"
                val fromBarTap = source.startsWith("bigPush_bar_tap")
                if (fromOutgoingLogoTap || (fromBarTap && currentOutgoing)) {
                    /*
                     * 발신 로고 탭인데 조회 중/빈 경로 — peer 상단 바로 바꾸지 않음.
                     * 주소록 있으면 안심 팝업 승격, 없으면 중앙 로고 유지.
                     */
                    val name = DeviceContactsReader.resolveDisplayNameForSafeCare(this, currentPhone)
                    if (!name.isNullOrBlank() && !safeCare) {
                        val verdict =
                            CallPathSession.lastVerdict ?: CallPathSession.consumeOrVerify(this)
                        val json = ContactSafeCarePayload.toJson(currentPhone, name, verdict)
                        pendingCardJson = json
                        pendingVerified = false
                        bindDcpRoute(currentPhone, verdict.routeQuery, json)
                        VlueBigPushTrace.lifecycle(
                            "OUTGOING_LOGO_TAP_PROMOTE_SAFE",
                            "name=$name source=$source"
                        )
                        presentCenterSafePopup(source = source, authMember = false)
                        return
                    }
                    VlueBigPushTrace.lifecycle(
                        "OUTGOING_LOGO_TAP_KEEP_LOGO",
                        "phase=${phase.name} source=$source — no peer big_push_bar"
                    )
                    outgoingExpandRequestedByUser = false
                    ensureOutgoingLogoWindowLayout(force = true)
                    notifyWebCallState("outgoing_logo")
                    if (remoteConnected) notifyWebCallState("outgoing_connected")
                    restartOutgoingPeerProbeIfNeeded()
                    return
                }
                if (fromBarTap) {
                    VlueBigPushTrace.lifecycle(
                        "BIG_PUSH_TAP_KEEP",
                        "phase=${phase.name} source=$source"
                    )
                    restartOutgoingPeerProbeIfNeeded()
                    return
                }
                if (pendingLookup) {
                    if (!currentOutgoing &&
                        promoteIncomingContactSafeCareAndPopup("${source}_pending_lookup")
                    ) {
                        return
                    }
                    if (!source.startsWith("answer_ui_resume_")) {
                        showcaseHoldUntilElapsed =
                            android.os.SystemClock.elapsedRealtime() + 8_000L
                        VlueBigPushTrace.lifecycle(
                            "ANSWER_KEEP_BIGPUSH_PENDING",
                            "lookup pending — resume source=$source"
                        )
                    }
                    /*
                     * 재시도에서도 다음 재시도를 예약해야 한다.
                     * 이전에는 answer_ui_resume_* 에서 예약 없이 return해
                     * 수화 후 BigPush가 영구 고착됐다.
                     */
                    scheduleAnswerUiResume("pending_after_$source")
                    return
                }
                if (!currentOutgoing &&
                    promoteIncomingContactSafeCareAndPopup("${source}_keep_bigpush")
                ) {
                    return
                }
                VlueBigPushTrace.lifecycle(
                    "ANSWER_KEEP_BIGPUSH",
                    "phase=${phase.name} source=$source — no empty FULLSCREEN"
                )
                restartOutgoingPeerProbeIfNeeded()
                return
            }
            CallUiPhasePolicy.Phase.FULL_SHOWCASE -> {
                /*
                 * 계약 §3a: 회원 송출 쇼케이스가 확정되면 주소록 안심케어로 덮지 않는다.
                 * (이전 _before_showcase promote 가 저장 연락처 회원 통화를 안심팝업으로 빼앗김)
                 */
                /* fall through to fullscreen showcase layout */
            }
        }

        VlueBigPushTrace.milestone(
            "SHOWCASE_REQUESTED",
            "Showcase Requested",
            seq = 8,
            detail = "event-driven ($source), phase=FULL_SHOWCASE"
        )
        CompanionRuntimeStabilityDiag.mark("SHOWCASE_LAYOUT_BEGIN", source)
        bigPushPeeking = false
        wakeScreenForCallOverlay()
        /*
         * Answer: 이전 DCP/안심 팝업과 HUN을 먼저 제거하고 단일 Showcase로 전환.
         * 별도 팝업 Window가 남은 채 같은 root를 펼쳐 겹치는 상태를 금지한다.
         */
        removeDcpPopupWindow()
        LetteringIncomingNotifier.cancel(this)
        LetteringRingingActivity.requestFinish(this)
        rootContainer?.animate()?.cancel()
        nativeBanner?.visibility = android.view.View.GONE
        webView?.visibility = android.view.View.VISIBLE
        rootContainer?.setBackgroundColor(Color.parseColor("#0B101B"))
        committedAnswerPhase = CallUiPhasePolicy.Phase.FULL_SHOWCASE
        companion.onAnswer(OverlayContext.IN_CALL)
        publishCompanion(OverlayTriggerEvent.ANSWER)
        userMinimized = false
        /* Answer 후 ContextWatch 가 OTHER_APP 으로 오판해 빅푸시로 되돌리지 않도록 충분히 유지 */
        showcaseHoldUntilElapsed = android.os.SystemClock.elapsedRealtime() + 120_000L
        /* 네이티브 창 성장을 먼저 시작해 작은 바 안에서 풀 UI가 잘리는 첫 프레임을 없앤다. */
        showcaseWebExpandPending = true
        val showcaseOpen =
            if (rootContainer?.isAttachedToWindow == true) {
                enterShowcaseLayout(source = source)
            } else {
                /* 첫 부착만 — 전환용 remove/add 아님. 단일 TYPE_APPLICATION_OVERLAY */
                attachOverlayWindow(
                    phone = currentPhone.ifBlank { "unknown" },
                    verified = false,
                    outgoing = currentOutgoing,
                    cardJson = pendingCardJson,
                    asBigPush = false
                )
                enterShowcaseLayout(source = source)
            }
        if (!showcaseOpen) {
            showcaseWebExpandPending = false
            return
        }
        syncOverlayChromeForState(source = source)
        syncDcpRoutePopup(pendingCardJson, currentDcpRoute)
        CompanionRuntimeStabilityDiag.mark("SHOWCASE_LAYOUT_APPLIED", source)
        CompanionRuntimeStabilityDiag.mark("SHOWCASE_VISIBLE", source)
        notifyWebCallState("connected")
    }

    /**
     * 수화 시점 카드 미도착으로 BigPush 에 머문 뒤, 카드/연락처 승격이 오면 자동 재시도.
     * (탭 없이 쇼케이스·정상팝업이 뜨도록)
     */
    private var answerUiResumeAttempt = 0
    private var answerUiResumeRunnable: Runnable? = null

    /** 발신 BigPush 유지 중 상대응답 프로브가 꺼져 있으면 재시작 */
    private fun restartOutgoingPeerProbeIfNeeded() {
        if (!currentOutgoing || remoteConnected || dismissing) return
        if (!CompanionRuntimeStabilityDiag.isCallSessionActive()) return
        if (companion.state != OverlayState.BIG_PUSH && companion.state != OverlayState.SHOWCASE) return
        OutgoingPeerConnectProbe.start(this)
    }

    private fun answerResumeAttemptFromSource(source: String): Int {
        val m = Regex("""answer_ui_resume_(\d+)""").find(source)
        return m?.groupValues?.getOrNull(1)?.toIntOrNull() ?: 0
    }

    private fun cancelAnswerUiResume() {
        answerUiResumeRunnable?.let { mainHandler.removeCallbacks(it) }
        answerUiResumeRunnable = null
    }

    private fun scheduleAnswerUiResume(reason: String) {
        if (dismissing || !remoteConnected) return
        /* 발신 로고 단계 — 카드 도착으로 자동 재시도 금지 */
        if (currentOutgoing && !outgoingExpandRequestedByUser) return
        if (companion.state != OverlayState.BIG_PUSH) return
        if (authPopupConfirmedToMini || userMinimized) return
        cancelAnswerUiResume()
        val attempt = ++answerUiResumeAttempt
        if (attempt > 8) {
            VlueBigPushTrace.lifecycle(
                "ANSWER_UI_RESUME_EXHAUSTED",
                "resolve pending lookup after $attempt attempts reason=$reason"
            )
            val force = Runnable {
                if (dismissing || !remoteConnected) return@Runnable
                if (companion.state != OverlayState.BIG_PUSH) return@Runnable
                /*
                 * 조회 응답이 끝내 오지 않아도 BigPush에 영구 고착하지 않는다.
                 * 비정상 경로는 기존 정책대로 안심 팝업으로 보내고, 정상·미확정
                 * 빈 조회만 미인증 확정으로 승격해 기존 신고 패널로 전환한다.
                 */
                if (!isCurrentPathAbnormal(pendingCardJson) &&
                    (pendingCardJson.isNullOrBlank() || isLookupPendingCard(pendingCardJson))
                ) {
                    val fallback =
                        org.json.JSONObject()
                            .put("matched", false)
                            .put("is_verified", false)
                            .put("verified", false)
                            .put("source", "unmatched")
                            .put("profileKind", "unverified")
                            .put("displayName", "")
                            .put("phoneE164", currentPhone)
                            .toString()
                    pendingCardJson = fallback
                    pendingVerified = false
                    webView?.let { injectCardLookupJson(it, fallback) }
                    VlueBigPushTrace.lifecycle(
                        "ANSWER_LOOKUP_TIMEOUT_UNVERIFIED",
                        "phone=${ReleaseDebugGate.maskPhoneForLog(currentPhone)}"
                    )
                }
                enterShowcaseFromAnswer(source = "answer_ui_resume_$attempt")
            }
            answerUiResumeRunnable = force
            mainHandler.post(force)
            return
        }
        val delayMs = 280L + (attempt - 1) * 200L
        val retry = Runnable {
            if (dismissing || !remoteConnected) return@Runnable
            if (companion.state != OverlayState.BIG_PUSH) return@Runnable
            if (authPopupConfirmedToMini || userMinimized) return@Runnable
            VlueBigPushTrace.lifecycle(
                "ANSWER_UI_RESUME_RETRY",
                "attempt=$attempt reason=$reason state=${companion.state.name}"
            )
            enterShowcaseFromAnswer(source = "answer_ui_resume_$attempt")
        }
        answerUiResumeRunnable = retry
        mainHandler.postDelayed(retry, delayMs)
    }

    /**
     * Single Window 내부 UI 스왑 — 한 시점에 BIG_PUSH banner / SHOWCASE / MINI 중 하나만.
     * Window 추가 금지.
     */
    private fun syncOverlayChromeForState(source: String) {
        /* 네이티브 로드-실패 폴백은 링잉/발신 BigPush 단계에서만 */
        if (companion.state != OverlayState.BIG_PUSH ||
            authPopupOnlyMode ||
            dcpPopupView?.isAttachedToWindow == true
        ) {
            hideOverlayNativeFallback()
        }
        when (companion.state) {
            OverlayState.BIG_PUSH -> {
                /*
                 * 앱 홈 쇼케이스바와 동일 — WebView LetteringIncomingNotification(home-glass).
                 * Native BigPushShowcaseBar 는 사용하지 않음 (임의 UI 금지).
                 */
                if (authPopupOnlyMode || dcpPopupView?.isAttachedToWindow == true) {
                    softHideCompanionOverlayChrome()
                    return
                }
                nativeBanner?.visibility = android.view.View.GONE
                rootContainer?.setBackgroundColor(Color.TRANSPARENT)
                webView?.setBackgroundColor(Color.TRANSPARENT)
                applyCapsuleClip(rootContainer, enabled = false)
                if (bigPushPeeking) {
                    applyBigPushPeekChrome(onRight = bigPushPeekOnRight)
                } else {
                    bigPushPeekTab?.visibility = android.view.View.GONE
                    webView?.visibility = android.view.View.VISIBLE
                    /* restore hold 중에는 웹을 다시 바로 접지 않음 */
                    val hold =
                        android.os.SystemClock.elapsedRealtime() < showcaseHoldUntilElapsed
                    if (!hold) {
                        notifyCompactCallChrome()
                    }
                }
            }
            OverlayState.SHOWCASE -> {
                bigPushPeeking = false
                bigPushPeekTab?.visibility = android.view.View.GONE
                nativeBanner?.visibility = android.view.View.GONE
                /*
                 * 인증/안심케어: 중앙 팝업이 떠 있을 때만 크롬 제거.
                 * 팝업 확인 후 MiniCase 부착 직전 SHOWCASE sync 가 창을 지우면
                 * Mini 레이아웃 실패 → 이후 showOverlay 가 BigPush 를 다시 붙인다.
                 */
                val popupUp = dcpPopupView?.isAttachedToWindow == true
                if (popupUp &&
                    (isContactSafeCare(pendingCardJson) ||
                        VlueAuthMemberPopupPolicy.isAuthMemberOnly(
                            pendingCardJson,
                            verified = pendingVerified || parseIsVerified(pendingCardJson)
                        ))
                ) {
                    softHideCompanionOverlayChrome()
                } else {
                    webView?.visibility = android.view.View.VISIBLE
                }
                syncDcpRoutePopup(pendingCardJson, currentDcpRoute)
            }
            OverlayState.MINI_CASE -> {
                bigPushPeeking = false
                bigPushPeekTab?.visibility = android.view.View.GONE
                nativeBanner?.visibility = android.view.View.GONE
                /*
                 * 안심케어 확인 후에도 인증회원과 동일하게 MiniCase WebView 유지.
                 * (이전: contactSafeCare 이면 hideChrome → 검정 빈 창/종료 후에도 잔존)
                 */
                webView?.visibility = android.view.View.VISIBLE
                rootContainer?.setBackgroundColor(Color.TRANSPARENT)
                webView?.setBackgroundColor(Color.TRANSPARENT)
                removeDcpPopupWindow()
            }
            OverlayState.IDLE -> {
                bigPushPeeking = false
                bigPushPeekTab?.visibility = android.view.View.GONE
                nativeBanner?.visibility = android.view.View.GONE
                webView?.visibility = android.view.View.GONE
                removeDcpPopupWindow()
            }
        }
        VlueBigPushTrace.lifecycle(
            "UI_MODE_SYNC",
            "source=$source state=${companion.state.name} pos=${companion.position.name} " +
                "banner=${nativeBanner?.visibility} web=${webView?.visibility}"
        )
    }

    /** Controller position FULLSCREEN을 단일 Window에 updateViewLayout으로 반영.
     *  @return 전체화면이 반영됐으면 true. false 면 웹에 restore 를 보내지 않는다. */
    private fun enterShowcaseLayout(source: String): Boolean {
        if (!mayCommitFullscreenShowcase()) {
            refuseEmptyFullscreen("enterLayout_$source")
            return false
        }
        if (companion.state != OverlayState.SHOWCASE) {
            companion.onAnswer(OverlayContext.IN_CALL)
        } else if (companion.position != OverlayPosition.FULLSCREEN) {
            companion.onRestoreShowcase(OverlayContext.IN_CALL)
        }
        publishCompanion(OverlayTriggerEvent.INTERNAL)
        applyLayoutFromController(source = source)
        return companion.position == OverlayPosition.FULLSCREEN
    }

    private fun cancelFullscreenExpandAnimator() {
        fullscreenExpandAnimator?.cancel()
        fullscreenExpandAnimator = null
    }

    private fun shouldForceInstantFullscreen(source: String): Boolean =
        source.contains("reaffirm") ||
            source.contains("reeval") ||
            source.contains("onPageFinished")

    private fun shouldAnimateToFullscreen(
        params: WindowManager.LayoutParams,
        view: android.view.View
    ): Boolean {
        val (sw, sh) = screenSizePx()
        val currentH = when {
            params.height == WindowManager.LayoutParams.MATCH_PARENT -> view.height
            params.height > 0 -> params.height
            else -> view.height
        }
        val currentW = when {
            params.width == WindowManager.LayoutParams.MATCH_PARENT -> view.width
            params.width > 0 -> params.width
            else -> view.width
        }
        if (currentH <= 0 && currentW <= 0) return false
        return currentH < sh - dp(32) || currentW < sw - dp(8)
    }

    private fun notifyWebExpandShowcase() {
        webView?.evaluateJavascript(
            "try{window.VlueLettering&&window.VlueLettering.setExpanded&&window.VlueLettering.setExpanded(true);" +
                "window.dispatchEvent(new CustomEvent('vlue-native-expand-showcase',{detail:{expanded:true}}));}catch(e){}",
            null
        )
    }

    /**
     * FULLSCREEN 허용 여부 — CallUiPhasePolicy / 계약 §3.
     * false 면 빈 다크 창·터치 가로채기 금지.
     */
    private fun mayCommitFullscreenShowcase(allowFromMiniRestore: Boolean = false): Boolean {
        if (dismissing) return false
        if (
            (allowFromMiniRestore || fullscreenRestoreBypass) &&
            showcaseOpenedThisCall &&
            !isCurrentPathAbnormal(pendingCardJson) &&
            !isContactSafeCare(pendingCardJson)
        ) {
            return true
        }
        if (authPopupConfirmedToMini) return false
        if (!allowFromMiniRestore && authPopupOnlyMode) return false
        /*
         * 자동/재진입은 Mini 유지. 단, 사용자가 MiniCase를 직접 탭한 복원 요청은
         * 이 검사 시점에 userMinimized=true인 것이 정상이라 명시적으로 허용한다.
         */
        if (CallUiPhasePolicy.blocksFullscreenForMiniState(
                userMinimized = userMinimized,
                isMiniCase = companion.state == OverlayState.MINI_CASE,
                explicitMiniRestore = allowFromMiniRestore
            )
        ) {
            return false
        }
        /* 비정상 경로 — 쇼케이스 금지 (안심 팝업만) */
        if (isCurrentPathAbnormal(pendingCardJson)) return false
        if (isContactSafeCare(pendingCardJson)) return false
        if (allowFromMiniRestore && showcaseOpenedThisCall) return true
        val verified = pendingVerified || parseIsVerified(pendingCardJson)
        if (VlueAuthMemberPopupPolicy.isAuthMemberOnly(pendingCardJson, verified)) return false
        if (VlueAuthMemberPopupPolicy.hasBroadcastShowcaseContent(pendingCardJson)) return true
        /*
         * 미등록 번호 — 자동 풀 쇼케이스 금지(안심팝업만).
         * 사용자가 팝업의 「스팸/피싱 제보 및 신고하기」를 누른 경우에만 신고 패널로 펼친다.
         */
        return VlueAuthMemberPopupPolicy.isUnverifiedResolved(pendingCardJson) &&
            unregisteredReportRequested
    }

    /**
     * 빈 FULLSCREEN 거부 — 팝업 또는 컴팩트 BigPush 로 되돌리고 터치 차단 해제.
     */
    private fun refuseEmptyFullscreen(source: String) {
        showcaseWebExpandPending = false
        VlueBigPushTrace.lifecycle(
            "REFUSE_EMPTY_FULLSCREEN",
            "source=$source state=${companion.state.name} — contract KEEP_BIG_PUSH/popup"
        )
        cancelFullscreenExpandAnimator()
        /* 웹이 창보다 먼저 풀 쇼케이스를 그리면 120dp·미니 안에 잘린 먹통이 남는다. 접어서 되돌린다. */
        webView?.evaluateJavascript(
            "try{window.VlueLettering&&window.VlueLettering.setExpanded&&" +
                "window.VlueLettering.setExpanded(false);}catch(e){}",
            null
        )
        val verified = pendingVerified || parseIsVerified(pendingCardJson)
        if (isCurrentPathAbnormal(pendingCardJson) ||
            isContactSafeCare(pendingCardJson) ||
            VlueAuthMemberPopupPolicy.isAuthMemberOnly(pendingCardJson, verified) ||
            VlueAuthMemberPopupPolicy.isUnverifiedResolved(pendingCardJson)
        ) {
            presentCenterSafePopup(
                source = "refuse_empty_$source",
                authMember = !isContactSafeCare(pendingCardJson) &&
                    !isCurrentPathAbnormal(pendingCardJson)
            )
            return
        }
        val contactName = DeviceContactsReader.resolveDisplayNameForSafeCare(this, currentPhone)
        if (!contactName.isNullOrBlank() &&
            (pendingCardJson.isNullOrBlank() ||
                isLookupPendingCard(pendingCardJson) ||
                !verified)
        ) {
            val verdict = CallPathSession.lastVerdict ?: CallPathSession.consumeOrVerify(this)
            val json = ContactSafeCarePayload.toJson(currentPhone, contactName, verdict)
            pendingCardJson = json
            pendingVerified = false
            bindDcpRoute(currentPhone, verdict.routeQuery, json)
            presentCenterSafePopup(source = "refuse_empty_promote_$source", authMember = false)
            return
        }
        companion.collapseToCompactBigPush(OverlayContext.IN_CALL)
        authPopupOnlyMode = false
        bigPushPeeking = false
        rootContainer?.setBackgroundColor(Color.TRANSPARENT)
        webView?.setBackgroundColor(Color.TRANSPARENT)
        nativeBanner?.visibility = View.GONE
        webView?.visibility = View.VISIBLE
        if (currentOutgoing) {
            ensureOutgoingLogoWindowLayout()
            notifyCompactCallChrome()
        } else {
            applyCompactRingingWindow()
            notifyCompactCallChrome()
        }
        publishCompanion(OverlayTriggerEvent.INTERNAL)
    }

    /**
     * FULLSCREEN commit — 기존 Window 유지, updateViewLayout만.
     * BIG_PUSH/Mini → 풀 전환은 420ms 애니 (웹 expand 슬롯 과 동기).
     * 실콘텐츠 없으면 즉시 거부 (빈케이스·휴대폰 제어불가 방지).
     */
    private fun commitFullscreenLayout(source: String, animate: Boolean? = null) {
        if (!mayCommitFullscreenShowcase()) {
            refuseEmptyFullscreen(source)
            return
        }
        val apply = Runnable {
            val wm = windowManager
            val view = rootContainer
            val params = layoutParams
            if (wm == null || view == null || params == null) {
                OverlayDiagTracker.markLayoutFailed(
                    OverlayFailureReason.UNKNOWN,
                    OverlayPosition.FULLSCREEN.name,
                    null
                )
                return@Runnable
            }
            /* 레이스: 애니 중 카드가 안심/인증-only 로 바뀌면 중단 */
            if (!mayCommitFullscreenShowcase()) {
                refuseEmptyFullscreen("$source:late_gate")
                return@Runnable
            }
            /* 수신 바·발신 로고·미니 복원 모두 같은 경로.
             * 프레임마다 창을 키우면 쇼케이스 WebView가 전환 중에 화면을 덮은 채 멈춘다.
             * 안심팝업은 이 애니를 타지 않는다. */
            val doAnimate = false
            if (!doAnimate) {
                cancelFullscreenExpandAnimator()
                commitFullscreenLayoutImmediate(source)
                return@Runnable
            }
            cancelFullscreenExpandAnimator()
            val (sw, sh) = screenSizePx()
            val startH = (
                if (params.height > 0) params.height else view.height
                ).coerceAtLeast(dp(BigPushShowcaseBar.WINDOW_HEIGHT_DP / 3))
            val startW = (
                if (params.width > 0) params.width else view.width
                ).coerceAtLeast(1)
            val startX = params.x
            val startY = params.y
            view.animate().cancel()
            view.alpha = 1f
            view.translationY = 0f
            view.visibility = android.view.View.VISIBLE
            userMinimized = false
            nativeBanner?.visibility = android.view.View.GONE
            webView?.visibility = android.view.View.VISIBLE
            view.clipToOutline = false
            view.outlineProvider = android.view.ViewOutlineProvider.BACKGROUND
            applyCapsuleClip(view, enabled = false)
            view.setBackgroundColor(Color.parseColor("#0B101B"))
            webView?.setBackgroundColor(Color.TRANSPARENT)
            applyFullscreenInteractiveFlags(params)
            params.gravity = Gravity.TOP or Gravity.START
            VlueBigPushTrace.lifecycle(
                "SHOWCASE_EXPAND_ANIM_BEGIN",
                "source=$source from=${startW}x${startH}@($startX,$startY) → ${sw}x$sh"
            )
            fullscreenExpandAnimator = ValueAnimator.ofFloat(0f, 1f).apply {
                duration = SHOWCASE_EXPAND_DURATION_MS
                interpolator = DecelerateInterpolator(1.8f)
                addUpdateListener { anim ->
                    val t = anim.animatedValue as Float
                    params.height = (startH + (sh - startH) * t).toInt()
                    params.y = (startY * (1f - t)).toInt()
                    if (startW < sw - dp(4)) {
                        params.width = (startW + (sw - startW) * t).toInt()
                        params.x = (startX * (1f - t)).toInt()
                    } else {
                        params.width = WindowManager.LayoutParams.MATCH_PARENT
                        params.x = 0
                    }
                    try {
                        wm.updateViewLayout(view, params)
                    } catch (_: Exception) {
                        /* frame drop — onAnimationEnd 에서 즉시 커밋 */
                    }
                }
                addListener(object : AnimatorListenerAdapter() {
                    override fun onAnimationEnd(animation: android.animation.Animator) {
                        fullscreenExpandAnimator = null
                        commitFullscreenLayoutImmediate(source)
                    }

                    override fun onAnimationCancel(animation: android.animation.Animator) {
                        fullscreenExpandAnimator = null
                        /* 취소는 다음 레이아웃이 이어받는다. 여기서 웹을 펼치면 작은 창에 쇼케이스가 붙는다. */
                        commitFullscreenLayoutImmediate(source, notifyWeb = false)
                    }
                })
                start()
            }
        }
        if (Looper.myLooper() == Looper.getMainLooper()) {
            apply.run()
        } else {
            mainHandler.post(apply)
        }
    }

    private fun commitFullscreenLayoutImmediate(source: String, notifyWeb: Boolean = true) {
        if (!mayCommitFullscreenShowcase()) {
            refuseEmptyFullscreen("immediate_$source")
            return
        }
        val wm = windowManager
        val view = rootContainer
        val params = layoutParams
        if (wm == null || view == null || params == null) {
            OverlayDiagTracker.markLayoutFailed(
                OverlayFailureReason.UNKNOWN,
                OverlayPosition.FULLSCREEN.name,
                null
            )
            return
        }
        view.animate().cancel()
        /* 측정 높이가 로고·미니로 남은 동안 웹에 높이를 넣지 않는다. */
        fullscreenHeightLock = true
        fullscreenHeightLockAttempts = 0
        fullscreenChromePublished = false
        lastChromeSignature = ""
        /*
         * 창을 alpha 0 으로 숨기면 측정이 끝나기 전에 삼성 전화 UI만 남는다.
         * 미리보기와 같이 문서는 보이는 상태에서 높이만 확정한다.
         */
        view.alpha = 1f
        view.translationY = 0f
        view.visibility = android.view.View.VISIBLE
        userMinimized = false
