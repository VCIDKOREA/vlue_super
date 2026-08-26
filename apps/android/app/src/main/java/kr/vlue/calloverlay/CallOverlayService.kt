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
import android.telephony.TelephonyManager
import android.view.Gravity
import android.view.MotionEvent
import android.view.View
import android.view.ViewOutlineProvider
import android.view.WindowManager
import android.view.animation.DecelerateInterpolator
import kotlin.math.abs
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.TextView
import androidx.core.app.NotificationCompat
import kr.vlue.calloverlay.companion.CompanionOverlayController
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
import kr.vlue.calloverlay.dcp.CallPathReasonCopy
import kr.vlue.calloverlay.dcp.CallPathSession
import kr.vlue.calloverlay.dcp.ContactSafeCarePayload
import kr.vlue.calloverlay.dcp.ContactSafeCarePolicy
import kr.vlue.calloverlay.dcp.VlueAuthMemberPopupPolicy
import kr.vlue.calloverlay.dcp.DcpAbnormalWarningView
import kr.vlue.calloverlay.dcp.DcpPopupPolicy
import kr.vlue.calloverlay.dcp.NationalAgencyWhitelist
import kr.vlue.calloverlay.diagnostics.CompanionBigPushDiag
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
    private var webView: WebView? = null
    private var layoutParams: WindowManager.LayoutParams? = null
    private var dismissing = false
    private val companion = CompanionOverlayController()
    private val mainHandler = Handler(Looper.getMainLooper())
    private var pendingCardJson: String? = null
    private var pendingVerified: Boolean = false
    private var currentPhone: String = ""
    private var currentOutgoing: Boolean = false
    private var currentDcpRoute: String = ""
    private var keypadOpen = false
    private var userMinimized = false
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
    /** 발신: 상대 응답(STATE_ACTIVE / notifyConnected) 후에만 true — 다이얼 OFFHOOK 만으로는 Showcase 금지 */
    private var remoteConnected: Boolean = false
    /** BigPush 가장자리 피크 (MiniCase 패리티) — OverlayState 는 BIG_PUSH 유지 */
    private var bigPushPeeking: Boolean = false
    private var overlayModal: Boolean = false
    /** 피크 시 WebView 대신 동일한 좌/우 엣지 탭 */
    private var bigPushPeekTab: FrameLayout? = null
    private var bigPushPeekOnRight: Boolean = false
    /** DCP 정상/비정상 팝업 — BigPush 창과 분리(WRAP_CONTENT) */
    private var dcpPopupView: android.view.View? = null
    private var dcpPopupParams: WindowManager.LayoutParams? = null
    /** 설정 DCP 테스트 — 전체 오버레이 없이 팝업만 */
    private var dcpPopupOnly = false
    /** Phase 5-C — Memory callback 관찰만 (동작 변경 없음) */
    private var memoryCallbacks: ComponentCallbacks2? = null

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
        VlueForegroundHelper.start(this, NOTIFICATION_ID, buildNotification())
        activeInstance = this
        OverlayDiagTracker.setOemDeviceInfo(OemDeviceProbe.collect(this))
        OverlayDiagTracker.refreshSecurityAuditReport()
        startScreenStateDetector()
        startContextWatch()
        registerMemoryCallbackObserver()
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
                enterShowcaseFromAnswer(source = "ACTION_CONNECTED")
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
         * 팝업 확인 후 MiniCase 유지 중 — 카드 갱신/재진입이 BigPush 로 되돌리지 않음.
         */
        if (!answered &&
            userMinimized &&
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
        dcpPopupOnly = false
        bindDcpRoute(phone, dcpRoute, cardJson)
        /*
         * Phase 6-G: Call End 이후 enrichWithLookup / queued FGS 가 IDLE 에서 showOverlay 를
         * 다시 열면 Showcase 재등장이 난다. 세션이 이미 끝났고 IDLE 이면 무시.
         */
        if (callState == TelephonyManager.CALL_STATE_IDLE &&
            !answered &&
            CompanionRuntimeStabilityDiag.shouldIgnorePostEndOverlayStart()
        ) {
            CompanionRuntimeStabilityDiag.noteStaleEvent(
                "SHOW_OVERLAY_WHILE_IDLE",
                "showOverlay",
                detail = "alreadyAttached=$alreadyAttached"
            )
            if (!alreadyAttached) {
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
            VlueBigPushTrace.milestone(
                "SHOWCASE_REQUESTED",
                "Showcase Requested",
                seq = 6,
                detail = "answerBeforeBigPush skip BigPush"
            )
            remoteConnected = true
            companion.onAnswer(OverlayContext.IN_CALL)
            publishCompanion(OverlayTriggerEvent.ANSWER)
            LetteringIncomingNotifier.cancel(this)
            LetteringRingingActivity.requestFinish(this)
            if (alreadyAttached) {
                /* 기존 Single Window morph — remove/add 금지 */
                enterShowcaseLayout(source = "answerBeforeBigPush_reuseWindow")
            } else {
                attachOverlayWindow(
                    phone = phone,
                    verified = verified,
                    outgoing = outgoing,
                    cardJson = cardJson,
                    asBigPush = false
                )
                enterShowcaseLayout(source = "answerBeforeBigPush_attach")
            }
            syncOverlayChromeForState(source = "answerBeforeBigPush")
            notifyWebCallState("connected")
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
            notifyWebCallState("big_push_bar")
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
            val ua = userAgentString.orEmpty()
            if (!ua.contains(VlueLetteringConfig.ANDROID_APP_UA_TOKEN)) {
                userAgentString = "$ua ${VlueLetteringConfig.ANDROID_APP_UA_TOKEN}"
            }
        }
        wv.setBackgroundColor(Color.TRANSPARENT)
        /*
         * HARDWARE 레이어는 반투명 라운드 보더를 좌측에서 잘라 먹는 경우가 많음 (MiniCase 증상).
         * NONE 이면 테두리 유지.
         */
        wv.setLayerType(android.view.View.LAYER_TYPE_NONE, null)
        /* BigPush도 앱 쇼케이스바(Web) — Native 바 숨김 */
        wv.visibility = android.view.View.VISIBLE
        if (asBigPush) {
            attachBigPushDragGestures(wv)
        }
        wv.webChromeClient = object : android.webkit.WebChromeClient() {
            override fun onConsoleMessage(consoleMessage: android.webkit.ConsoleMessage?): Boolean {
                val msg = consoleMessage?.message().orEmpty()
                if (msg.contains("VlueBigPushTrace") || msg.contains("Showcase")) {
                    VlueBigPushTrace.step(0, "JS", msg)
                }
                return super.onConsoleMessage(consoleMessage)
            }
        }
        wv.webViewClient = object : WebViewClient() {
            override fun onPageStarted(view: WebView?, url: String?, favicon: android.graphics.Bitmap?) {
                injectLetteringFlag(view)
            }

            override fun onPageFinished(view: WebView?, url: String?) {
                CompanionPerfTracker.noteWebViewReady()
                injectLetteringFlag(view)
                if (dismissing || companion.state == OverlayState.IDLE ||
                    !CompanionRuntimeStabilityDiag.isCallSessionActive()
                ) {
                    CompanionRuntimeStabilityDiag.noteStaleEvent(
                        "WEB_PAGE_FINISHED",
                        "onPageFinished",
                        detail = "state=${companion.state.name}"
                    )
                    return
                }
                syncOverlayChromeForState(source = "onPageFinished")
                syncDcpRoutePopup(pendingCardJson, currentDcpRoute)
                /*
                 * Showcase 레이아웃은 Answer Event에서 이미 commit됨.
                 * onPageFinished는 Web 알림·레이아웃 재확인만 — Showcase 표시를 지연시키지 않는다.
                 */
                when (companion.state) {
                    OverlayState.SHOWCASE -> {
                        if (companion.position == OverlayPosition.FULLSCREEN) {
                            commitFullscreenLayout(source = "onPageFinished_reaffirm")
                        }
                        /* Web Content Ready — state 전이 아님 (이미 Answer에서 connected 알림) */
                        notifyWebCallState("connected")
                    }
                    OverlayState.MINI_CASE -> Unit
                    OverlayState.BIG_PUSH -> applyCompactRingingWindow()
                    OverlayState.IDLE -> Unit
                }
            }
        }
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
        if (asBigPush) {
            attachBigPushDragGestures(peekTab)
        }

        val params = if (asBigPush) {
            buildBigPushLayoutParams(companion.position)
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
        pendingCardJson = cardJson
        pendingVerified = verified
        wv.loadUrl(VlueLetteringConfig.overlayUrl(phone, verified, outgoing, currentDcpRoute))
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
     * Native Answer / OFFHOOK / ACTIVE → Controller.onAnswer → FULLSCREEN.
     * 이후 notifyWebCallState("connected")는 Web Content Ready 알림만 (상태 전이 아님).
     */
    private fun enterShowcaseFromAnswer(source: String) {
        if (dismissing || !CompanionRuntimeStabilityDiag.isCallSessionActive()) {
            CompanionRuntimeStabilityDiag.noteStaleEvent(
                "CONNECTED",
                source,
                detail = "enterShowcaseFromAnswer ignored dismissing=$dismissing sessionActive=${CompanionRuntimeStabilityDiag.isCallSessionActive()}"
            )
            return
        }
        CompanionRuntimeStabilityDiag.mark("ANSWER_DETECTED", source)
        CompanionRuntimeStabilityDiag.mark("CONTROLLER_ON_ANSWER", source)
        VlueBigPushTrace.milestone(
            "ANSWER_DETECTED",
            "Answer Detected",
            seq = 8,
            detail = source
        )
        if (isContactSafeCare(pendingCardJson)) {
            presentCenterSafePopup(source = source, authMember = false)
            return
        }
        if (VlueAuthMemberPopupPolicy.isAuthMemberOnly(
                pendingCardJson,
                verified = pendingVerified || parseIsVerified(pendingCardJson)
            )
        ) {
            presentCenterSafePopup(source = source, authMember = true)
            return
        }
        /*
         * 카드 미도착·조회 중·미인증.
         * BigPush 바 탭: 창을 지우면 팝업/미니 없이 사라짐(e9ba0e 가 미인증 페인트에 무력화됨).
         * 실제 Answer 만 빈 쇼케이스 금지용 hide.
         */
        if (pendingCardJson.isNullOrBlank() ||
            isLookupPendingCard(pendingCardJson) ||
            (!pendingVerified && !parseIsVerified(pendingCardJson))
        ) {
            if (source.startsWith("bigPush_bar_tap")) {
                VlueBigPushTrace.lifecycle(
                    "BIG_PUSH_TAP_KEEP",
                    "pendingOrUnverified — keep bar source=$source " +
                        "pending=${isLookupPendingCard(pendingCardJson)} verified=$pendingVerified"
                )
                return
            }
            remoteConnected = true
            companion.onAnswer(OverlayContext.IN_CALL)
            hideCompanionOverlayChrome()
            syncDcpRoutePopup(pendingCardJson, currentDcpRoute)
            return
        }
        VlueBigPushTrace.milestone(
            "SHOWCASE_REQUESTED",
            "Showcase Requested",
            seq = 8,
            detail = "event-driven ($source), independent of BigPush"
        )
        CompanionRuntimeStabilityDiag.mark("SHOWCASE_LAYOUT_BEGIN", source)
        remoteConnected = true
        bigPushPeeking = false
        wakeScreenForCallOverlay()
        /* Answer: HUN(가짜 빅푸시) 제거 + Native banner 제거 → Showcase */
        LetteringIncomingNotifier.cancel(this)
        LetteringRingingActivity.requestFinish(this)
        rootContainer?.animate()?.cancel()
        nativeBanner?.visibility = android.view.View.GONE
        webView?.visibility = android.view.View.VISIBLE
        rootContainer?.setBackgroundColor(Color.parseColor("#0B101B"))
        companion.onAnswer(OverlayContext.IN_CALL)
        publishCompanion(OverlayTriggerEvent.ANSWER)
        userMinimized = false
        /* Answer 후 3초간 ContextWatch OTHER_APP→MINI 금지 — 전체 Showcase 유지 */
        showcaseHoldUntilElapsed = android.os.SystemClock.elapsedRealtime() + 3000L
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
        syncOverlayChromeForState(source = source)
        syncDcpRoutePopup(pendingCardJson, currentDcpRoute)
        CompanionRuntimeStabilityDiag.mark("SHOWCASE_LAYOUT_APPLIED", source)
        CompanionRuntimeStabilityDiag.mark("SHOWCASE_VISIBLE", source)
        notifyWebCallState("connected")
        /* Mini Case 에서 수락해도 웹 expanded=true — 검정 FULLSCREEN + 미니 UI 불일치 방지 */
        webView?.evaluateJavascript(
            "try{window.VlueLettering&&window.VlueLettering.setExpanded&&window.VlueLettering.setExpanded(true);" +
                "window.dispatchEvent(new CustomEvent('vlue-native-expand-showcase',{detail:{expanded:true}}));}catch(e){}",
            null
        )
    }

    /**
     * Single Window 내부 UI 스왑 — 한 시점에 BIG_PUSH banner / SHOWCASE / MINI 중 하나만.
     * Window 추가 금지.
     */
    private fun syncOverlayChromeForState(source: String) {
        when (companion.state) {
            OverlayState.BIG_PUSH -> {
                /*
                 * 앱 홈 쇼케이스바와 동일 — WebView LetteringIncomingNotification(home-glass).
                 * Native BigPushShowcaseBar 는 사용하지 않음 (임의 UI 금지).
                 */
                nativeBanner?.visibility = android.view.View.GONE
                rootContainer?.setBackgroundColor(Color.TRANSPARENT)
                webView?.setBackgroundColor(Color.TRANSPARENT)
                applyCapsuleClip(rootContainer, enabled = false)
                if (bigPushPeeking) {
                    applyBigPushPeekChrome(onRight = bigPushPeekOnRight)
                } else {
                    bigPushPeekTab?.visibility = android.view.View.GONE
                    webView?.visibility = android.view.View.VISIBLE
                    notifyWebCallState("big_push_bar")
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
                    hideCompanionOverlayChrome()
                } else {
                    webView?.visibility = android.view.View.VISIBLE
                }
                syncDcpRoutePopup(pendingCardJson, currentDcpRoute)
            }
            OverlayState.MINI_CASE -> {
                bigPushPeeking = false
                bigPushPeekTab?.visibility = android.view.View.GONE
                nativeBanner?.visibility = android.view.View.GONE
                if (isContactSafeCare(pendingCardJson)) {
                    hideCompanionOverlayChrome()
                    syncDcpRoutePopup(pendingCardJson, currentDcpRoute)
                } else {
                    webView?.visibility = android.view.View.VISIBLE
                    rootContainer?.setBackgroundColor(Color.TRANSPARENT)
                    webView?.setBackgroundColor(Color.TRANSPARENT)
                    removeDcpPopupWindow()
                }
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

    /** Controller position FULLSCREEN을 단일 Window에 updateViewLayout으로 반영 */
    private fun enterShowcaseLayout(source: String) {
        if (companion.state != OverlayState.SHOWCASE) {
            companion.onRestoreShowcase(OverlayContext.IN_CALL)
        } else if (companion.position != OverlayPosition.FULLSCREEN) {
            companion.onRestoreShowcase(OverlayContext.IN_CALL)
        }
        publishCompanion(OverlayTriggerEvent.INTERNAL)
        applyLayoutFromController(source = source)
    }

    /**
     * FULLSCREEN commit — 기존 Window 유지, updateViewLayout만.
     * 진입 애니(BigPush slide-in)는 취소하고 즉시 표시.
     */
    private fun commitFullscreenLayout(source: String) {
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
            view.animate().cancel()
            view.alpha = 1f
            view.translationY = 0f
            view.visibility = android.view.View.VISIBLE
            userMinimized = false
                params.height = WindowManager.LayoutParams.MATCH_PARENT
                params.width = WindowManager.LayoutParams.MATCH_PARENT
            params.x = 0
                params.y = 0
                params.gravity = Gravity.TOP or Gravity.START
            view.clipToOutline = false
            view.outlineProvider = android.view.ViewOutlineProvider.BACKGROUND
            applyCapsuleClip(view, enabled = false)
            view.setBackgroundColor(Color.parseColor("#0B101B"))
            webView?.setBackgroundColor(Color.TRANSPARENT)
            applyPassThroughTouchFlags(params)
            /* Showcase 터치 필요 — NOT_FOCUSABLE 유지하되 창은 full; HOME 시 MINI 로 축소 */
                params.flags = params.flags or WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL
            nativeBanner?.visibility = android.view.View.GONE
            try {
                CompanionPerfTracker.measureUpdateViewLayout {
                    wm.updateViewLayout(view, params)
                }
                OverlayDiagTracker.markShowcaseFullscreenCommit()
                OverlayDiagTracker.markLayoutApplied("FULLSCREEN", OverlayPosition.FULLSCREEN.name)
                VlueBigPushTrace.milestone(
                    "OVERLAY_ATTACHED",
                    "Overlay Attached",
                    seq = 8,
                    detail = "Showcase FULLSCREEN commit ($source) pos=${companion.position.name}"
                )
            } catch (e: Exception) {
                val reason = OemDeviceProbe.classifyFailure(
                    e,
                    canDrawOverlays = LetteringPermissionHelper.canDrawOverlays(this@CallOverlayService)
                )
                OverlayDiagTracker.markLayoutFailed(reason, OverlayPosition.FULLSCREEN.name, e)
                VlueBigPushTrace.lifecycle(
                    "SHOWCASE_LAYOUT_FAIL",
                    "${e.javaClass.simpleName}: ${e.message} ($source)"
                )
            }
            publishCompanion(OverlayTriggerEvent.INTERNAL)
        }
        if (Looper.myLooper() == Looper.getMainLooper()) {
            apply.run()
            } else {
            mainHandler.post(apply)
        }
    }

    /** 링잉 BigPush ▾ 펼침 — 삭제됨. 바 탭 → Showcase */
    private fun expandBigPushPanelFromBar() {
        openShowcaseFromBigPushTap()
    }

    /** BigPush 아무 곳 탭 → Showcase FULLSCREEN (텔레콤 Answer 와 무관, UI만) */
    private fun openShowcaseFromBigPushTap() {
        if (dismissing) return
        if (companion.state == OverlayState.SHOWCASE) {
            /* 인증 팝업만 떠 있는 재탭 — 팝업 재부착 */
            if (dcpPopupView?.isAttachedToWindow != true &&
                VlueAuthMemberPopupPolicy.isAuthMemberOnly(
                    pendingCardJson,
                    verified = pendingVerified || parseIsVerified(pendingCardJson)
                )
            ) {
                presentCenterSafePopup(source = "bigPush_bar_tap_retry", authMember = true)
            }
            return
        }
        CompanionRuntimeStabilityDiag.mark("BIG_PUSH_BAR_TAP", "openShowcase")
        VlueBigPushTrace.lifecycle("BIG_PUSH_BAR_TAP", "open Showcase from bar tap")
        enterShowcaseFromAnswer(source = "bigPush_bar_tap")
    }

    /**
     * 인증 회원·안심케어: 중앙 「경로 검증」팝업.
     * 빅푸시 창을 먼저 지우면 WM 연속 remove/add 로 팝업 addView 가 실패하는 경우가 있어
     * 팝업을 붙인 뒤 크롬을 제거한다. ContextWatch collapse 는 hold + 팝업 가드로 막는다.
     */
    private fun presentCenterSafePopup(source: String, authMember: Boolean) {
        if (dismissing || !CompanionRuntimeStabilityDiag.isCallSessionActive()) return
        remoteConnected = true
        if (companion.state != OverlayState.SHOWCASE) {
            companion.onAnswer(OverlayContext.IN_CALL)
        }
        publishCompanion(OverlayTriggerEvent.ANSWER)
        /* 확인 전까지 OTHER_APP→하단바 collapse 금지 */
        showcaseHoldUntilElapsed = android.os.SystemClock.elapsedRealtime() + 120_000L
        LetteringIncomingNotifier.cancel(this)
        syncDcpRoutePopup(pendingCardJson, currentDcpRoute)
        hideCompanionOverlayChrome()
        if (dcpPopupView?.isAttachedToWindow != true) {
            syncDcpRoutePopup(pendingCardJson, currentDcpRoute)
        }
        CompanionRuntimeStabilityDiag.mark(
            if (authMember) "AUTH_MEMBER_POPUP" else "SAFE_CARE_POPUP",
            source
        )
        VlueBigPushTrace.lifecycle(
            "CENTER_SAFE_POPUP",
            "source=$source authMember=$authMember attached=${dcpPopupView?.isAttachedToWindow == true}"
        )
        if (authMember) {
            notifyWebCallState("connected")
        }
    }

    /**
     * 인증 팝업 「확인」→ MiniCase.
     * SHOWCASE 로 붙인 뒤 sync 가 auth 창을 지우면 Mini 실패 → BigPush 재부착이 난다.
     * 상태를 MINI_CASE 로 먼저 고정한 다음 창을 붙인다.
     */
    private fun enterMiniCaseAfterAuthPopupConfirm() {
        if (dismissing || !CompanionRuntimeStabilityDiag.isCallSessionActive()) return
        userMinimized = true
        showcaseHoldUntilElapsed = android.os.SystemClock.elapsedRealtime() + 120_000L
        if (companion.state != OverlayState.SHOWCASE && companion.state != OverlayState.MINI_CASE) {
            companion.onAnswer(OverlayContext.IN_CALL)
        }
        companion.onMinimize(
            if (keypadOpen) OverlayContext.KEYPAD else OverlayContext.MINIMIZED
        )
        if (companion.state != OverlayState.MINI_CASE) {
            VlueBigPushTrace.lifecycle(
                "AUTH_POPUP_TO_MINI_REJECTED",
                companion.rejectedTransition ?: "state=${companion.state.name}"
            )
            return
        }
        publishCompanion(OverlayTriggerEvent.HOME_CHANGED, userAction = true)
        if (rootContainer == null || rootContainer?.isAttachedToWindow != true) {
            attachOverlayWindow(
                phone = currentPhone.ifBlank { "unknown" },
                verified = pendingVerified || parseIsVerified(pendingCardJson),
                outgoing = currentOutgoing,
                cardJson = pendingCardJson,
                asBigPush = false
            )
        }
        applyLayoutFromController(source = "authPopup_confirm")
        /*
         * 새 WebView 는 URL 상 ringing — connected+minimize 없으면 빅푸시 바와 동일 크롬.
         */
        notifyWebCallState("connected")
        notifyWebCallState("minimize_showcase")
        webView?.evaluateJavascript(
            "try{window.VlueLettering&&window.VlueLettering.setExpanded&&" +
                "window.VlueLettering.setExpanded(false);}catch(e){}",
            null
        )
        VlueBigPushTrace.lifecycle(
            "AUTH_POPUP_TO_MINI",
            "userMinimized=$userMinimized state=${companion.state.name} " +
                "pos=${companion.position.name} attached=${rootContainer?.isAttachedToWindow == true}"
        )
    }

    private fun detectOverlayContext(forceRinging: Boolean): OverlayContext {
        val phase = when {
            forceRinging && !isCallAlreadyAnswered() -> OverlayContextDetector.CallPhase.RINGING
            isCallAlreadyAnswered() -> OverlayContextDetector.CallPhase.OFFHOOK
            else -> when (telephonyCallState()) {
                TelephonyManager.CALL_STATE_RINGING -> OverlayContextDetector.CallPhase.RINGING
                TelephonyManager.CALL_STATE_OFFHOOK -> OverlayContextDetector.CallPhase.OFFHOOK
                else -> OverlayContextDetector.CallPhase.IDLE
            }
        }
        val activity = VlueCallOverlayApp.currentActivityName.orEmpty()
        val pausedOrGone = activity.isBlank() || activity.contains("(paused)", ignoreCase = true)
        val ourApp = activity.contains("kr.vlue", ignoreCase = true) && !pausedOrGone

        /* RINGING: 전체 UI vs 홈·다른앱 — UsageEvents ACTIVITY_RESUMED 1차 (DUT 증거) */
        if (phase == OverlayContextDetector.CallPhase.RINGING) {
            /*
             * 삼성 통화 목록·다이얼러 발신은 항상 전체 InCallActivity.
             * UsageStats 미허용·contacts last-resume 오판으로 BOTTOM 두면 종료 버튼을 가린다.
             */
            if (currentOutgoing) {
                android.util.Log.i(
                    "VlueOverlayCtx",
                    "phase=RINGING outgoing dialing → TOP (Samsung InCallUI)"
                )
                VlueBigPushTrace.lifecycle(
                    "OVERLAY_CONTEXT",
                    "phase=RINGING outgoing=true ctx=INCOMING_CALL_UI"
                )
                return OverlayContext.INCOMING_CALL_UI
            }
            val hints = ForegroundPackageProbe.processImportanceHints(this)
            val tasksPkg = ForegroundPackageProbe.runningTaskPackage(this)
            val resumedPkg = ForegroundPackageProbe.lastResumedPackage(this)
            val surface = ForegroundPackageProbe.classifyRingingSurface(
                tasksPkg = tasksPkg,
                inCallImportance = hints.inCallImportance,
                otherForegroundPackages = hints.otherForegroundPackages,
                ourApp = ourApp,
                lastResumedPkg = resumedPkg
            )
            val ctx = when (surface) {
                ForegroundPackageProbe.RingingSurface.FULL_INCALL ->
                    OverlayContext.INCOMING_CALL_UI
                /*
                 * 미니 수신(다이얼러·HUN·VLUE/홈 위 팝업) → 팝업 바로 아래.
                 * TOP 이면 삼성 미니 UI 뒤로 들어가 홈 미리보기만 보이므로 BELOW 고정.
                 */
                ForegroundPackageProbe.RingingSurface.COMPACT_DIALER,
                ForegroundPackageProbe.RingingSurface.HOME_OR_OTHER ->
                    OverlayContext.COMPACT_INCOMING
            }.let { resolved ->
                /*
                 * VLUE 전면 + task 가 전체 InCallUI 가 아니면 미니 — 단 resumed 가
                 * InCallActivity 이면 풀 UI(TOP) 유지 (중앙 빅푸시 버그 방지).
                 */
                if (ourApp &&
                    resolved == OverlayContext.INCOMING_CALL_UI &&
                    !OverlayContextDetector.isLikelyFullInCallUiPackage(tasksPkg) &&
                    !OverlayContextDetector.isLikelyFullInCallUiPackage(resumedPkg)
                ) {
                    OverlayContext.COMPACT_INCOMING
                } else {
                    resolved
                }
            }
            val detail =
                "phase=RINGING surface=$surface ctx=${ctx.name} ourApp=$ourApp " +
                    "resumed=$resumedPkg tasks=$tasksPkg inCallImp=${hints.inCallImportance} " +
                    "otherFg=${hints.otherForegroundPackages.joinToString(",")} " +
                    "usageAccess=${UsageAccessHelper.hasAccess(this)}"
            /* Diagnostics 세션 없어도 반드시 남김 — TOP/BOTTOM 원인 추적 */
            android.util.Log.i("VlueOverlayCtx", detail)
            if (!UsageAccessHelper.hasAccess(this)) {
                android.util.Log.w(
                    "VlueOverlayCtx",
                    "PACKAGE_USAGE_STATS denied — InCallActivity resume unknown; BigPush defaults TOP"
                )
            }
            VlueBigPushTrace.lifecycle("OVERLAY_CONTEXT", detail)
            return ctx
        }

        val sysFg = ForegroundPackageProbe.topPackage(this)
        val tasksPkg = ForegroundPackageProbe.runningTaskPackage(this)
        val tasksLauncher = OverlayContextDetector.isLikelyLauncherPackage(tasksPkg)
        val tasksInCall = OverlayContextDetector.isLikelyInCallUiPackage(tasksPkg)
        val tasksOther =
            !tasksPkg.isNullOrBlank() &&
                !tasksLauncher &&
                !tasksInCall &&
                !tasksPkg.contains("kr.vlue", ignoreCase = true) &&
                !tasksPkg.contains("systemui", ignoreCase = true) &&
                !tasksPkg.contains("permissioncontroller", ignoreCase = true)
        val launcher =
            tasksLauncher ||
                OverlayContextDetector.isLikelyLauncherPackage(sysFg) ||
                (!pausedOrGone && activity.contains("Launcher", ignoreCase = true))
        val knownOther =
            tasksOther ||
                (!sysFg.isNullOrBlank() &&
                    !OverlayContextDetector.isLikelyInCallUiPackage(sysFg) &&
                    !OverlayContextDetector.isLikelyLauncherPackage(sysFg) &&
                    !sysFg.contains("kr.vlue", ignoreCase = true) &&
                    !sysFg.contains("systemui", ignoreCase = true) &&
                    !sysFg.contains("android.permissioncontroller", ignoreCase = true))
        val systemUi =
            !sysFg.isNullOrBlank() && sysFg.contains("systemui", ignoreCase = true)
        val inCallUi =
            tasksInCall ||
                OverlayContextDetector.isLikelyInCallUiPackage(sysFg) ||
                (OverlayContextDetector.isLikelyInCallUiPackage(activity) && !pausedOrGone)
        val homeLike = launcher || (systemUi && !inCallUi)
        val ctx = OverlayContextDetector.detect(
            callPhase = phase,
            foregroundIsOurApp = ourApp,
            foregroundIsLauncher = homeLike,
            foregroundIsInCallUi = inCallUi && !knownOther,
            foregroundIsKnownOtherApp = knownOther && !inCallUi,
            userMinimized = userMinimized,
            keypadOpen = keypadOpen
        )
        VlueBigPushTrace.lifecycle(
            "OVERLAY_CONTEXT",
            "phase=$phase ctx=${ctx.name} sysFg=$sysFg tasks=$tasksPkg inCall=$inCallUi ourApp=$ourApp"
        )
        return ctx
    }

    private fun telephonyCallState(): Int {
        return try {
            val tm = getSystemService(TELEPHONY_SERVICE) as? TelephonyManager
            tm?.callState ?: TelephonyManager.CALL_STATE_IDLE
        } catch (_: Exception) {
            TelephonyManager.CALL_STATE_IDLE
        }
    }

    private fun isCallAlreadyAnswered(): Boolean {
        if (isInCallOverlayState() || remoteConnected) return true
        /* 발신 다이얼 OFFHOOK 는 미연결 — Showcase/Answered 로 취급하지 않음 */
        if (currentOutgoing) return false
        return telephonyCallState() == TelephonyManager.CALL_STATE_OFFHOOK
    }

    private fun bannerPrimaryText(phone: String, cardJson: String?): String {
        parseDisplayName(cardJson)?.let { return it }
        return if (phone.isBlank() || phone == "unknown") "번호 확인 중…" else phone
    }

    private fun bannerHintText(phone: String, verified: Boolean, cardJson: String?): String {
        val name = parseDisplayName(cardJson)
        return when {
            name != null && phone.isNotBlank() && phone != "unknown" -> phone
            verified -> "VLUE 인증 · 쇼케이스 불러오는 중"
            phone.isBlank() || phone == "unknown" -> "상대 번호를 확인하는 중…"
            else -> "쇼케이스 불러오는 중…"
        }
    }

    private fun parseDisplayName(cardJson: String?): String? {
        if (cardJson.isNullOrBlank()) return null
        return try {
            val json = org.json.JSONObject(cardJson)
            json.optString("displayName").ifBlank {
                json.optJSONObject("card")?.optString("displayName").orEmpty()
            }.ifBlank { null }
        } catch (_: Exception) {
            null
        }
    }

    private fun applyCallInfoUpdate(
        phone: String,
        verified: Boolean,
        outgoing: Boolean,
        cardJson: String?,
        dcpRoute: String = ""
    ) {
        mainHandler.post {
            if (dismissing || !CompanionRuntimeStabilityDiag.isCallSessionActive()) {
                CompanionRuntimeStabilityDiag.noteStaleEvent(
                    "CALL_INFO_UPDATE",
                    "applyCallInfoUpdate",
                    detail = "dismissing=$dismissing"
                )
                return@post
            }
            if (IncomingNumberResolver.isUnknown(phone) && cardJson.isNullOrBlank()) return@post
            val phoneChanged = overlayPhoneChanged(phone)
            /*
             * 동일 번호에 이미 인증 카드가 있는데 미인증/unmatched 로 덮으면 깜박임.
             * 안심케어·기관 등 의도된 verified=false 는 허용.
             */
            if (!phoneChanged &&
                !verified &&
                !isContactSafeCare(cardJson) &&
                parseProfileKind(cardJson) != "expired_line" &&
                pendingVerified &&
                parseIsVerified(pendingCardJson)
            ) {
                VlueBigPushTrace.lifecycle(
                    "CALL_INFO_SKIP_DOWNGRADE",
                    "keep verified overlay phone=${ReleaseDebugGate.maskPhoneForLog(phone)}"
                )
                return@post
            }
            currentPhone = phone
            currentOutgoing = outgoing
            pendingCardJson = cardJson
            pendingVerified = verified
            bindDcpRoute(phone, dcpRoute, cardJson)
            if (isContactSafeCare(cardJson)) {
                hideCompanionOverlayChrome()
                syncDcpRoutePopup(cardJson, currentDcpRoute)
                LetteringPrefs.setLastCallEvent(this, "overlay_updated:$phone")
                return@post
            }
            if (VlueAuthMemberPopupPolicy.isAuthMemberOnly(cardJson, verified) &&
                (companion.state == OverlayState.SHOWCASE || isCallAlreadyAnswered())
            ) {
                presentCenterSafePopup(source = "applyCallInfoUpdate", authMember = true)
                LetteringPrefs.setLastCallEvent(this, "overlay_updated:$phone")
                return@post
            }
            val banner = nativeBanner
            if (banner != null) {
                BigPushShowcaseBar.bind(banner, phone, verified, outgoing, cardJson)
            }
            val wv = webView
            if (wv != null && !IncomingNumberResolver.isUnknown(phone)) {
                loadOverlayDocument(wv, phone, verified, outgoing, cardJson, forceNewDocument = phoneChanged)
                CompanionPerfTracker.noteWebViewLoadStart()
                CompanionRuntimeStabilityDiag.noteMemberLookup(
                    phase = "WEB_CARD_RENDERED",
                    maskedPhone = ReleaseDebugGate.maskPhoneForLog(phone),
                    matched = !cardJson.isNullOrBlank(),
                    dataSource = "applyCallInfoUpdate"
                )
                /* 이미 수화(SHOWCASE/MINI)일 때만 전체 쇼케이스 재알림 */
                if (isInCallOverlayState()) {
                    notifyWebCallState("connected")
                }
            } else if (rootContainer == null) {
                /* MiniCase 유지 중 카드 갱신 — showOverlay(BigPush) 재진입 금지 */
                if (userMinimized && companion.state == OverlayState.MINI_CASE) {
                    attachOverlayWindow(
                        phone = phone,
                        verified = verified,
                        outgoing = outgoing,
                        cardJson = cardJson,
                        asBigPush = false
                    )
                    applyLayoutFromController(source = "applyCallInfo_reattach_mini")
                    notifyWebCallState("connected")
                    notifyWebCallState("minimize_showcase")
                } else {
                    showOverlay(phone, verified, outgoing, cardJson, currentDcpRoute)
                }
            }
            syncDcpRoutePopup(cardJson, currentDcpRoute)
            LetteringPrefs.setLastCallEvent(this, "overlay_updated:$phone")
        }
    }

    private fun bindDcpRoute(phone: String, requested: String, cardJson: String?) {
        if (isContactSafeCare(cardJson)) {
            val fromCard = parseDcpRoute(cardJson)
            currentDcpRoute = requested.trim().lowercase().ifBlank { fromCard }
                .ifBlank { "normal" }
            if (currentDcpRoute != "normal" && currentDcpRoute != "abnormal") {
                currentDcpRoute = "normal"
            }
            return
        }
        currentDcpRoute = NationalAgencyWhitelist.routeForCall(phone, requested, parseDcpRoute(cardJson))
    }

    /**
     * 설정 DCP 테스트 — 전체 먹색 오버레이 없이 팝업만.
     * 홈·뒤로가기·다른 앱 터치를 가로채지 않는다.
     */
    private fun showDcpTestPopupOnly(phone: String, cardJson: String?, dcpRoute: String) {
        dcpPopupOnly = true
        currentPhone = phone
        pendingCardJson = cardJson
        bindDcpRoute(phone, dcpRoute, cardJson)
        detachCompanionOverlayKeepingService()
        if (!CompanionRuntimeStabilityDiag.isCallSessionActive()) {
            CompanionRuntimeStabilityDiag.beginCallSession("dcp_popup_test")
        }
        syncDcpRoutePopup(cardJson, currentDcpRoute)
    }

    /** DCP 팝업 테스트 때 이전 전체 오버레이가 홈/뒤로가기를 먹지 않게 제거 */
    private fun detachCompanionOverlayKeepingService() {
        rootContainer?.animate()?.cancel()
        webView?.destroy()
        webView = null
        rootContainer?.let { v ->
            try {
                windowManager?.removeView(v)
            } catch (_: Exception) {
            }
        }
        rootContainer = null
        layoutParams = null
        nativeBanner = null
        bigPushPeekTab = null
        bigPushPeeking = false
        companion.onCallEnd()
    }

    private fun syncDcpRoutePopup(cardJson: String?, dcpRoute: String) {
        if (parseProfileKind(cardJson) == "expired_line") {
            if (dismissing) {
                removeDcpPopupWindow()
                return
            }
            removeDcpPopupWindow()
            val spec = DcpAbnormalWarningView.Spec(
                abnormal = false,
                expired = true,
                agencyName = "",
                shortNumber = currentPhone.ifBlank { parseDcpPhone(cardJson) },
                officialWebsite = "",
                expiredMessage = parseExpiredDetail(cardJson),
                fromMock = false
            )
            attachDcpPopupWindow(spec)
            return
        }
        if (isContactSafeCare(cardJson)) {
            val route = currentDcpRoute.ifBlank { parseDcpRoute(cardJson) }.ifBlank { "normal" }
            val show = ContactSafeCarePolicy.shouldShow(
                profileKind = ContactSafeCarePayload.PROFILE_KIND,
                overlayState = companion.state,
                popupOnly = dcpPopupOnly
            ) && !dismissing
            if (!show) {
                removeDcpPopupWindow()
                return
            }
            val contactName = parseDcpAgencyName(cardJson).ifBlank { currentPhone }
            val pathAbnormal = route == "abnormal"
            val spec = DcpAbnormalWarningView.Spec(
                abnormal = pathAbnormal,
                agencyName = contactName,
                shortNumber = parseDcpPhone(cardJson).ifBlank { currentPhone },
                officialWebsite = "",
                fromMock = dcpPopupOnly || CallPathSession.lastVerdict?.fromMock == true,
                contactSafeCare = true,
                vlueNonMember = true,
                showShareShowcase = true,
                pathVerify = pathAbnormal,
                reasonLine = if (pathAbnormal) {
                    parseDcpWarning(cardJson).ifBlank {
                        CallPathReasonCopy.summary(
                            CallPathSession.lastVerdict?.reasons.orEmpty(),
                            currentOutgoing
                        )
                    }
                } else {
                    ""
                }
            )
            attachDcpPopupWindow(spec)
            return
        }
        if (VlueAuthMemberPopupPolicy.isAuthMemberOnly(
                cardJson,
                verified = pendingVerified || parseIsVerified(cardJson)
            )
        ) {
            val show = VlueAuthMemberPopupPolicy.shouldShow(
                overlayState = companion.state,
                popupOnlyTest = dcpPopupOnly
            ) && !dismissing
            if (!show) {
                /* ContextWatch 가 BIG_PUSH 로 접어도 이미 표시 중인 인증 팝업은 유지 */
                if (dcpPopupView?.isAttachedToWindow == true) return
                removeDcpPopupWindow()
                return
            }
            val name = VlueAuthMemberPopupPolicy.displayName(cardJson, currentPhone)
            val spec = DcpAbnormalWarningView.Spec(
                abnormal = false,
                agencyName = name,
                shortNumber = parseDcpPhone(cardJson).ifBlank { currentPhone },
                officialWebsite = "",
                fromMock = dcpPopupOnly,
                vlueAuthMember = true
            )
            attachDcpPopupWindow(spec)
            return
        }
        val route = NationalAgencyWhitelist.routeForCall(currentPhone, dcpRoute, parseDcpRoute(cardJson))
        val pathVerify = parsePathVerify(cardJson) ||
            (route == "abnormal" && NationalAgencyWhitelist.match(currentPhone) == null)
        val show = DcpPopupPolicy.shouldShow(
            route = route,
            overlayState = companion.state,
            popupOnlyTest = dcpPopupOnly,
            pathVerifyAbnormal = pathVerify
        ) && !dismissing
        if (!show) {
            removeDcpPopupWindow()
            return
        }
        val reason = parseDcpWarning(cardJson).ifBlank {
            CallPathReasonCopy.summary(
                CallPathSession.lastVerdict?.reasons.orEmpty(),
                currentOutgoing
            )
        }
        val spec = if (pathVerify) {
            DcpAbnormalWarningView.Spec(
                abnormal = route == "abnormal",
                agencyName = parseDcpAgencyName(cardJson),
                shortNumber = parseDcpPhone(cardJson).ifBlank { currentPhone },
                officialWebsite = "",
                fromMock = dcpPopupOnly || CallPathSession.lastVerdict?.fromMock == true,
                pathVerify = true,
                reasonLine = reason
            )
        } else {
            DcpAbnormalWarningView.Spec(
                abnormal = route == "abnormal",
                agencyName = parseDcpAgencyName(cardJson).ifBlank { "경찰청" },
                shortNumber = parseDcpPhone(cardJson).ifBlank { "112" },
                officialWebsite = parseDcpWebsite(cardJson).ifBlank { "https://www.police.go.kr" },
                fromMock = dcpPopupOnly || CallPathSession.lastVerdict?.fromMock == true
            )
        }
        attachDcpPopupWindow(spec)
    }

    private fun ensureWindowManager(): android.view.WindowManager? {
        val existing = windowManager
        if (existing != null) return existing
        val wm = getSystemService(WINDOW_SERVICE) as? android.view.WindowManager ?: return null
        windowManager = wm
        return wm
    }

    private fun attachDcpPopupWindow(spec: DcpAbnormalWarningView.Spec) {
        if (dcpPopupView?.isAttachedToWindow == true) return
        val wm = ensureWindowManager() ?: return
        removeDcpPopupWindow()
        val type = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
        } else {
            @Suppress("DEPRECATION")
            WindowManager.LayoutParams.TYPE_PHONE
        }
        val params = WindowManager.LayoutParams(
            dp(320),
            WindowManager.LayoutParams.WRAP_CONTENT,
            type,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN or
                WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL,
            PixelFormat.TRANSLUCENT
        ).apply {
            gravity = Gravity.CENTER
            width = dp(320)
            height = WindowManager.LayoutParams.WRAP_CONTENT
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                layoutInDisplayCutoutMode =
                    WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES
            }
        }
        val view = DcpAbnormalWarningView.build(
            this,
            spec,
            onConfirm = {
                if (spec.vlueAuthMember) {
                    removeDcpPopupWindow()
                    enterMiniCaseAfterAuthPopupConfirm()
                } else if (spec.contactSafeCare) {
                    showcaseHoldUntilElapsed = 0L
                    removeDcpPopupWindow()
                } else if (spec.fromMock || dcpPopupOnly) {
                    dcpPopupOnly = false
                    dismissOverlay()
                } else {
                    removeDcpPopupWindow()
                }
            },
            onShareShowcase = if (spec.showShareShowcase) {
                {
                    hideCompanionOverlayChrome()
                    removeDcpPopupWindow()
                    ShowcaseSmsComposer.openPrefill(
                        this,
                        toPhone = spec.shortNumber.ifBlank { currentPhone },
                        ownerPhone = LetteringPrefs.getMemberPhone(this)
                    )
                }
            } else {
                null
            }
        )
        DcpAbnormalWarningView.bindDrag(view, wm, params, enabled = !spec.abnormal && !spec.expired)
        try {
            wm.addView(view, params)
            dcpPopupView = view
            dcpPopupParams = params
            view.post {
                val h = view.height
                val w = view.width.coerceAtLeast(dp(280))
                if (h > 0 && (params.height != h || params.width != w)) {
                    params.width = w
                    params.height = h
                    try {
                        wm.updateViewLayout(view, params)
                    } catch (_: Exception) {
                    }
                }
            }
        } catch (e: Exception) {
            VlueBigPushTrace.lifecycle("DCP_POPUP_ADD_FAIL", e.message ?: e.javaClass.simpleName)
        }
    }

    private fun removeDcpPopupWindow() {
        val view = dcpPopupView ?: return
        try {
            windowManager?.removeView(view)
        } catch (_: Exception) {
        }
        dcpPopupView = null
        dcpPopupParams = null
        DcpAbnormalWarningView.detach(rootContainer)
    }

    private fun parseDcpRoute(cardJson: String?): String {
        if (cardJson.isNullOrBlank()) return ""
        return try {
            val json = org.json.JSONObject(cardJson)
            json.optJSONObject("dcp")?.optString("routeStatus").orEmpty()
                .ifBlank { json.optString("dcp_route") }
        } catch (_: Exception) {
            ""
        }
    }

    private fun parseDcpWarning(cardJson: String?): String {
        if (cardJson.isNullOrBlank()) return ""
        return try {
            org.json.JSONObject(cardJson).optJSONObject("dcp")?.optString("warning").orEmpty()
        } catch (_: Exception) {
            ""
        }
    }

    private fun parsePathVerify(cardJson: String?): Boolean {
        if (cardJson.isNullOrBlank()) return false
        return try {
            org.json.JSONObject(cardJson).optJSONObject("dcp")?.optBoolean("pathVerify", false) == true
        } catch (_: Exception) {
            false
        }
    }

    private fun parseDcpAgencyName(cardJson: String?): String {
        if (cardJson.isNullOrBlank()) return ""
        return try {
            val json = org.json.JSONObject(cardJson)
            json.optJSONObject("dcp")?.optString("agencyName").orEmpty()
                .ifBlank { json.optString("displayName") }
                .ifBlank { json.optString("contactName") }
                .ifBlank { json.optString("companyName") }
        } catch (_: Exception) {
            ""
        }
    }

    private fun parseDcpPhone(cardJson: String?): String {
        if (cardJson.isNullOrBlank()) return ""
        return try {
            val json = org.json.JSONObject(cardJson)
            json.optJSONObject("dcp")?.optString("shortNumber").orEmpty()
                .ifBlank { json.optString("phoneE164") }
        } catch (_: Exception) {
            ""
        }
    }

    private fun parseProfileKind(cardJson: String?): String {
        if (cardJson.isNullOrBlank()) return ""
        return try {
            org.json.JSONObject(cardJson).optString("profileKind").orEmpty()
        } catch (_: Exception) {
            ""
        }
    }

    private fun isContactSafeCare(cardJson: String?): Boolean =
        parseProfileKind(cardJson) == ContactSafeCarePayload.PROFILE_KIND

    private fun isLookupPendingCard(cardJson: String?): Boolean =
        parseProfileKind(cardJson) == "lookup_pending"

    private fun parseIsVerified(cardJson: String?): Boolean {
        if (cardJson.isNullOrBlank()) return false
        return try {
            val json = org.json.JSONObject(cardJson)
            json.optBoolean("is_verified", false) ||
                json.optBoolean("verified", false) ||
                json.optBoolean("matched", false) ||
                json.optJSONObject("card")?.optBoolean("verified", false) == true
        } catch (_: Exception) {
            false
        }
    }

    /**
     * 미인증 쇼케이스 대신 안심케어 팝업만 남긴다.
     * 오버레이 창이 남아 있으면 문자 앱을 가린다.
     */
    private fun hideCompanionOverlayChrome() {
        nativeBanner?.visibility = View.GONE
        webView?.visibility = View.GONE
        bigPushPeekTab?.visibility = View.GONE
        val root = rootContainer
        val wm = windowManager
        if (root != null && wm != null && root.isAttachedToWindow) {
            try {
                wm.removeView(root)
            } catch (_: Exception) {
            }
        }
        rootContainer = null
        layoutParams = null
        try {
            webView?.destroy()
        } catch (_: Exception) {
        }
        webView = null
        nativeBanner = null
        bigPushPeekTab = null
    }

    private fun parseExpiredDetail(cardJson: String?): String {
        val fallback = "인증기간이 만료된 번호입니다. 직접 확인 부탁드립니다."
        if (cardJson.isNullOrBlank()) return fallback
        return try {
            val json = org.json.JSONObject(cardJson)
            json.optString("expiredDetail").ifBlank { fallback }
        } catch (_: Exception) {
            fallback
        }
    }

    private fun parseDcpWebsite(cardJson: String?): String {
        if (cardJson.isNullOrBlank()) return ""
        return try {
            val json = org.json.JSONObject(cardJson)
            json.optJSONObject("dcp")?.optString("officialWebsite").orEmpty()
                .ifBlank { json.optString("website") }
                .ifBlank { json.optJSONObject("profile")?.optString("website").orEmpty() }
        } catch (_: Exception) {
            ""
        }
    }

    private fun overlayPhoneChanged(nextPhone: String): Boolean {
        if (IncomingNumberResolver.isUnknown(currentPhone)) return true
        return !IncomingNumberResolver.sameCanonicalNumber(currentPhone, nextPhone)
    }

    /**
     * 번호가 바뀌면 `_n` 로 문서를 새로 연다. 해시만 바꾸면 이전 incoming(070)이 CEO 카드와 섞인다.
     */
    private fun loadOverlayDocument(
        wv: WebView,
        phone: String,
        verified: Boolean,
        outgoing: Boolean,
        cardJson: String?,
        forceNewDocument: Boolean
    ) {
        val nonce = if (forceNewDocument) System.currentTimeMillis() else 0L
        if (forceNewDocument) {
            wv.evaluateJavascript("try{window.__VLUE_CARD_LOOKUP__=null;}catch(e){}", null)
        }
        wv.loadUrl(
            VlueLetteringConfig.overlayUrl(phone, verified, outgoing, currentDcpRoute, nonce)
        )
        if (!forceNewDocument && !cardJson.isNullOrBlank()) {
            injectCardLookupJson(wv, cardJson)
        }
        /* forceNewDocument 이면 onPageStarted 의 injectLetteringFlag 가 pendingCardJson 주입 */
    }

    private fun injectCardLookupJson(view: WebView?, cardJson: String) {
        val patched = OverlayCardOrgFill.applyLocalDefaults(cardJson)
        val escaped = org.json.JSONObject.quote(patched)
        view?.evaluateJavascript(
            "try{window.__VLUE_CARD_LOOKUP__=JSON.parse($escaped);" +
                "window.dispatchEvent(new CustomEvent('vlue-card-lookup',{detail:window.__VLUE_CARD_LOOKUP__}));" +
                "}catch(e){}",
            null
        )
    }

    private fun injectLetteringFlag(view: WebView?) {
        val route = currentDcpRoute.replace("'", "")
        val js =
            if (route == "normal" || route == "abnormal") {
                "try{localStorage.setItem('vlue_lettering_enabled','1');" +
                    "sessionStorage.setItem('vlue_dcp_test_route','$route');" +
                    "window.dispatchEvent(new CustomEvent('vlue-lettering-settings-changed',{detail:{enabled:true}}));" +
                    "document.documentElement.style.background='transparent';" +
                    "if(document.body){document.body.style.background='transparent';}" +
                    "}catch(e){}"
            } else {
                "try{localStorage.setItem('vlue_lettering_enabled','1');" +
                    "sessionStorage.removeItem('vlue_dcp_test_route');" +
                    "sessionStorage.removeItem('vlue_dcp_test_number');" +
                    "window.dispatchEvent(new CustomEvent('vlue-lettering-settings-changed',{detail:{enabled:true}}));" +
                    "document.documentElement.style.background='transparent';" +
                    "if(document.body){document.body.style.background='transparent';}" +
                    "}catch(e){}"
            }
        view?.evaluateJavascript(js, null)
        pendingCardJson?.let { injectCardLookupJson(view, it) }
    }

    private fun dp(v: Int): Int =
        TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, v.toFloat(), resources.displayMetrics).toInt()

    private fun screenSizePx(): Pair<Int, Int> {
        val dm = resources.displayMetrics
        return Pair(dm.widthPixels, dm.heightPixels)
    }

    /** 상태바(시간·통신사) 아래부터 BigPush 배치 */
    private fun statusBarHeightPx(): Int {
        val id = resources.getIdentifier("status_bar_height", "dimen", "android")
        if (id > 0) {
            val h = resources.getDimensionPixelSize(id)
            if (h > 0) return h
        }
        return dp(28)
    }

    private fun topBigPushOffsetY(): Int = statusBarHeightPx() + dp(4)

    /** 삼성 미니 수신 팝업 바로 아래 (사진 3 "여기") */
    private fun compactIncomingBelowY(): Int =
        statusBarHeightPx() +
            dp(CompactIncomingMetrics.CARD_HEIGHT_DP) +
            dp(CompactIncomingMetrics.GAP_DP)

    private fun compactBarY(pos: OverlayPosition, barH: Int, screenH: Int): Int =
        when (pos) {
            OverlayPosition.BOTTOM -> (screenH - barH - dp(8)).coerceAtLeast(0)
            OverlayPosition.BELOW_COMPACT_INCOMING -> compactIncomingBelowY()
            else -> topBigPushOffsetY()
        }

    /** MiniCase: WebView 사각 표면을 타원(캡슐)으로 잘라 모서리를 투명하게 */
    private fun applyCapsuleClip(view: android.view.View?, enabled: Boolean) {
        if (view == null) return
        if (!enabled) {
            view.clipToOutline = false
            view.outlineProvider = ViewOutlineProvider.BACKGROUND
            return
        }
        view.outlineProvider = object : ViewOutlineProvider() {
            override fun getOutline(v: android.view.View, outline: Outline) {
                val w = v.width.coerceAtLeast(1)
                val h = v.height.coerceAtLeast(1)
                /* 1px inset — stroke/inset-shadow 가 clip 에 잘리지 않게 */
                val inset = 1
                val radius = (minOf(w, h) / 2f)
                outline.setRoundRect(inset, inset, w - inset, h - inset, radius)
            }
        }
        view.clipToOutline = true
        view.invalidateOutline()
    }

    /**
     * Web Answer Request — telecom accept는 Bridge, Companion 전이는 여기.
     * JS는 layout/state를 직접 바꾸지 않는다.
     */
    fun onAnswerRequestedFromWeb() {
        enterShowcaseFromAnswer(source = "js.answerCall")
    }

    /**
     * Web Minimize / Reveal System Call UI Request.
     * Controller → MINI_CASE → layout.
     */
    fun onMinimizeRequestedFromWeb(source: String = "js.revealSystemCallUi") {
        if (!CompanionRuntimeStabilityDiag.isCallSessionActive()) {
            CompanionRuntimeStabilityDiag.noteStaleEvent("MINI", source)
            return
        }
        companion.onMinimize(
            if (keypadOpen) OverlayContext.KEYPAD else OverlayContext.MINIMIZED
        )
        publishCompanion(OverlayTriggerEvent.HOME_CHANGED, userAction = true)
        userMinimized = true
        applyLayoutFromController(source = source)
        notifyWebCallState("minimize_showcase")
    }

    /**
     * Web Restore Showcase Request.
     * Controller → SHOWCASE/FULLSCREEN → layout.
     */
    fun onRestoreShowcaseRequestedFromWeb(source: String = "js.restoreShowcase") {
        if (!CompanionRuntimeStabilityDiag.isCallSessionActive()) {
            CompanionRuntimeStabilityDiag.noteStaleEvent("RESTORE", source)
            return
        }
        /*
         * Mini→Showcase 직후 ContextWatch 가 OTHER_APP(삼성 인콜 UI)으로 오판하면
         * collapseToBottomShowcaseBar → 156dp 컴팩트 창이 된다.
         * 웹은 restore 로 expanded=true(전화 화면 보기 CTA 포함)인데 네이티브 창만
         * 접혀 CTA·하단이 잘리는 버그가 난다. Answer 와 동일하게 홀드로 보호.
         */
        showcaseHoldUntilElapsed = android.os.SystemClock.elapsedRealtime() + 3500L
        companion.onRestoreShowcase(OverlayContext.IN_CALL)
        if (companion.rejectedTransition != null && companion.state != OverlayState.SHOWCASE) {
            OverlayDiagTracker.recordOverlayFailure(
                OverlayFailureReason.UNKNOWN,
                phase = "MINI_RESTORE",
                detail = companion.rejectedTransition ?: source
            )
        }
        publishCompanion(OverlayTriggerEvent.USER_RESTORE, userAction = true)
        userMinimized = false
        applyLayoutFromController(source = source)
        notifyWebCallState("restore_showcase")
        webView?.evaluateJavascript(
            "try{window.VlueLettering&&window.VlueLettering.setExpanded&&window.VlueLettering.setExpanded(true);" +
                "window.dispatchEvent(new CustomEvent('vlue-native-expand-showcase',{detail:{expanded:true}}));}catch(e){}",
            null
        )
    }

    /**
     * Mini Visibility Request — OverlayState 변경 없음 (MINI_CASE 유지).
     * EDGE_HIDDEN = peek, Window 제거/Call End 아님.
     */
    fun onMiniVisibilityRequestedFromWeb(visibility: MiniCaseVisibility, source: String = "js") {
        companion.onMiniVisibilityChanged(visibility)
        val trigger =
            if (visibility == MiniCaseVisibility.EDGE_HIDDEN) {
                OverlayTriggerEvent.MINI_EDGE_HIDE
            } else {
                OverlayTriggerEvent.MINI_RESTORE
            }
        publishCompanion(trigger, userAction = true)
        VlueBigPushTrace.lifecycle(
            "MINI_VISIBILITY",
            "source=$source vis=${companion.miniCaseVisibility.name} " +
                "state=${companion.state.name} pos=${companion.position.name}"
        )
    }

    /**
     * Companion Mini Case — 좌표만 반영 (MINI_CASE일 때만).
     * OverlayState / MiniCaseVisibility를 변경하지 않는다.
     */
    fun updateMiniOverlayFrame(xPx: Int, yPx: Int, wPx: Int, hPx: Int) {
        mainHandler.post {
            if (companion.state != OverlayState.MINI_CASE) {
                VlueBigPushTrace.lifecycle(
                    "MINI_FRAME_IGNORED",
                    "state=${companion.state.name} (coords only when MINI_CASE)"
                )
                return@post
            }
            val wm = windowManager ?: return@post
            val view = rootContainer ?: return@post
            val params = layoutParams ?: return@post
            val (sw, sh) = screenSizePx()
            val keep = dp(28)
            /* peek(~32dp) 은 좁게, 일반 MiniCase 는 가로형 최소폭 유지 — 정사각 붕괴 방지 */
            val peekLikely = wPx <= dp(48)
            val minW = if (peekLikely) keep else (sw * 0.72f).toInt().coerceIn(dp(260), sw - dp(16))
            val w = wPx.coerceIn(minW, sw)
            val h = hPx.coerceIn(keep, sh)
            /*
             * 좌/우 테두리·라운드가 WebView 창 가장자리에서 잘리지 않게 inset.
             * (증상: 왼쪽 모서리만 수직으로 잘린 것처럼 보임)
             */
            val edgePad = if (peekLikely) 0 else dp(4)
            val minX = keep - w
            val maxX = sw - keep
            val minY = keep - h
            val maxY = sh - keep
            params.width = (w + edgePad * 2).coerceAtMost(sw)
            params.height = (h + edgePad * 2).coerceAtMost(sh)
            params.x = (xPx - edgePad).coerceIn(minX, maxX)
            params.y = (yPx - edgePad).coerceIn(minY, maxY)
            params.gravity = Gravity.TOP or Gravity.START
            params.format = PixelFormat.TRANSLUCENT
            view.visibility = android.view.View.VISIBLE
            nativeBanner?.visibility = android.view.View.GONE
            view.setBackgroundColor(Color.TRANSPARENT)
            webView?.setBackgroundColor(Color.TRANSPARENT)
            (view as? android.view.ViewGroup)?.clipChildren = false
            (view as? android.view.ViewGroup)?.clipToPadding = false
            webView?.clipToOutline = false
            applyCapsuleClip(view, enabled = false)
            try {
                CompanionPerfTracker.measureUpdateViewLayout {
                    wm.updateViewLayout(view, params)
                }
                view.post { applyCapsuleClip(view, enabled = false) }
            } catch (_: Exception) {
            }
        }
    }

    /**
     * Controller position → 단일 Window updateViewLayout.
     * Bridge/boolean fullscreen API가 상태를 밀어 넣지 않는다.
     */
    private fun applyLayoutFromController(source: String) {
        if (dismissing || companion.state == OverlayState.IDLE) {
            if (companion.state == OverlayState.IDLE && !dismissing) {
                CompanionRuntimeStabilityDiag.noteStaleEvent("LAYOUT", source, detail = "state=IDLE")
            }
            return
        }
        val pos = companion.position
        CompanionRuntimeStabilityDiag.noteLayoutCommit(
            state = companion.state.name,
            position = pos.name,
            source = source,
            miniVisibility = companion.miniCaseVisibility.name
        )
        syncOverlayChromeForState(source = source)
        OverlayDiagTracker.beginLayout(pos.name, source = source)
        when (pos) {
            OverlayPosition.FULLSCREEN -> commitFullscreenLayout(source = source)
            OverlayPosition.MINI_CASE -> {
                CompanionRuntimeStabilityDiag.mark("MINI_REQUEST", source)
                commitMiniCaseLayout(source = source)
                CompanionRuntimeStabilityDiag.mark("MINI_VISIBLE", source)
            }
            OverlayPosition.TOP,
            OverlayPosition.BOTTOM,
            OverlayPosition.BELOW_COMPACT_INCOMING -> applyCompactRingingWindow()
            OverlayPosition.HIDDEN -> commitHiddenLayout(source = source)
        }
        publishCompanion(OverlayTriggerEvent.INTERNAL)
    }

    /**
     * Position HIDDEN — view GONE만. removeView / dismiss / Call End 금지.
     * (예: BIG_PUSH + SCREEN_OFF)
     */
    private fun commitHiddenLayout(source: String) {
        val apply = Runnable {
            val view = rootContainer ?: run {
                OverlayDiagTracker.markLayoutFailed(
                    OverlayFailureReason.UNKNOWN,
                    OverlayPosition.HIDDEN.name,
                    null
                )
                return@Runnable
            }
            view.animate().cancel()
            view.visibility = android.view.View.GONE
            OverlayDiagTracker.markLayoutApplied("GONE", OverlayPosition.HIDDEN.name)
            VlueBigPushTrace.lifecycle(
                "LAYOUT_HIDDEN",
                "source=$source state=${companion.state.name} screen=${companion.screenState.name}"
            )
        }
        if (Looper.myLooper() == Looper.getMainLooper()) {
            apply.run()
        } else {
            mainHandler.post(apply)
        }
    }

    private fun commitMiniCaseLayout(source: String) {
        val apply = Runnable {
            val wm = windowManager
            val view = rootContainer
            val params = layoutParams
            if (wm == null || view == null || params == null) {
                OverlayDiagTracker.markLayoutFailed(
                    OverlayFailureReason.UNKNOWN,
                    OverlayPosition.MINI_CASE.name,
                    null
                )
                return@Runnable
            }
            view.animate().cancel()
            view.alpha = 1f
            view.translationY = 0f
            view.visibility = android.view.View.VISIBLE
            userMinimized = true
            val (sw, _) = screenSizePx()
            /* 가로형 기본 창 — JS updateMiniOverlayFrame 이 이어서 정밀 맞춤 */
            val w = (sw * 0.86f).toInt().coerceIn(dp(280), sw - dp(16))
            val h = dp(140)
            val x = ((sw - w) / 2).coerceAtLeast(dp(8))
            val y = (statusBarHeightPx() + dp(48)).coerceAtLeast(dp(72))
            params.width = w
            params.height = h
            params.x = x
            params.y = y
            params.gravity = Gravity.TOP or Gravity.START
            params.format = PixelFormat.TRANSLUCENT
            nativeBanner?.visibility = android.view.View.GONE
            webView?.visibility = android.view.View.VISIBLE
            view.setBackgroundColor(Color.TRANSPARENT)
            webView?.setBackgroundColor(Color.TRANSPARENT)
            applyPassThroughTouchFlags(params)
            /* 캡슐 clip 금지 — 모서리 가위질·테두리 잘림 */
            applyCapsuleClip(view, enabled = false)
            try {
                CompanionPerfTracker.measureUpdateViewLayout {
                    wm.updateViewLayout(view, params)
                }
                view.post { applyCapsuleClip(view, enabled = false) }
                OverlayDiagTracker.markLayoutApplied("MINI_CASE", OverlayPosition.MINI_CASE.name)
                VlueBigPushTrace.milestone(
                    "OVERLAY_ATTACHED",
                    "Overlay Attached",
                    seq = 8,
                    detail = "MINI_CASE layout ($source) pos=${companion.position.name}"
                )
            } catch (e: Exception) {
                OverlayDiagTracker.markLayoutFailed(
                    OemDeviceProbe.classifyFailure(
                        e,
                        LetteringPermissionHelper.canDrawOverlays(this@CallOverlayService)
                    ),
                    OverlayPosition.MINI_CASE.name,
                    e
                )
            }
        }
        if (Looper.myLooper() == Looper.getMainLooper()) {
            apply.run()
        } else {
            mainHandler.post(apply)
        }
    }

    /** Mini/compact: 포커스·모달 점유 없이 창 밖 터치가 하위 앱으로 전달 + 잠금화면 위 표시 */
    private fun applyPassThroughTouchFlags(params: WindowManager.LayoutParams) {
        @Suppress("DEPRECATION")
        params.flags = (
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL or
                WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN or
                WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
                WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON or
                WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON
            )
    }

    /** 신고 시트 등 — 전체 창 + 터치 포커스 (취소 버튼이 compact 창 밖으로 나가 무반응이던 문제) */
    fun setOverlayModal(open: Boolean) {
        mainHandler.post {
            overlayModal = open
            if (open) {
                applyOverlayModalWindow()
            } else if (!dismissing) {
                applyLayoutFromController(source = "setOverlayModal_close")
            }
        }
    }

    private fun applyOverlayModalWindow() {
        val wm = windowManager ?: return
        val view = rootContainer ?: return
        val params = layoutParams ?: return
        params.gravity = Gravity.TOP or Gravity.START
        params.width = WindowManager.LayoutParams.MATCH_PARENT
        params.height = WindowManager.LayoutParams.MATCH_PARENT
        params.x = 0
        params.y = 0
        @Suppress("DEPRECATION")
        params.flags = (
            WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL or
                WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN or
                WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
                WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON or
                WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON
            )
        nativeBanner?.visibility = android.view.View.GONE
        webView?.visibility = android.view.View.VISIBLE
        view.visibility = android.view.View.VISIBLE
        try {
            wm.updateViewLayout(view, params)
        } catch (_: Exception) {
        }
    }

    /** 화면 꺼짐/잠금 수신 시 시스템 전화처럼 화면을 깨워 오버레이를 보이게 함 */
    private fun wakeScreenForCallOverlay() {
        try {
            val pm = getSystemService(POWER_SERVICE) as? android.os.PowerManager ?: return
            if (pm.isInteractive) return
            @Suppress("DEPRECATION")
            val wl = pm.newWakeLock(
                android.os.PowerManager.SCREEN_BRIGHT_WAKE_LOCK or
                    android.os.PowerManager.ACQUIRE_CAUSES_WAKEUP or
                    android.os.PowerManager.ON_AFTER_RELEASE,
                "vlue:call_overlay"
            )
            wl.setReferenceCounted(false)
            wl.acquire(8_000L)
            CompanionPerfTracker.noteWakeLock(true)
            mainHandler.postDelayed({
                try {
                    if (wl.isHeld) wl.release()
                } catch (_: Exception) {
                }
                CompanionPerfTracker.noteWakeLock(false)
            }, 8_500L)
        } catch (e: Exception) {
            VlueBigPushTrace.lifecycle("WAKE_SCREEN_FAIL", e.message ?: e.javaClass.simpleName)
        }
    }

    /** 수신 링잉 — BigPush TOP/BOTTOM (PositionManager) */
    private fun applyCompactRingingWindow() {
        mainHandler.post {
            if (overlayModal) {
                applyOverlayModalWindow()
                return@post
            }
            val wm = windowManager
            val view = rootContainer
            val params = layoutParams
            if (wm == null || view == null || params == null) {
                OverlayDiagTracker.markLayoutFailed(
                    OverlayFailureReason.UNKNOWN,
                    companion.position.name,
                    null
                )
                if (companion.state == OverlayState.BIG_PUSH) {
                    CompanionBigPushDiag.noteLayoutFailed(
                        companion.snapshot(),
                        OverlayFailureReason.UNKNOWN,
                        null,
                        source = "applyCompactRingingWindow_null"
                    )
                }
                return@post
            }
            if (companion.state == OverlayState.BIG_PUSH) {
                CompanionBigPushDiag.noteLayoutRequest(
                    companion.snapshot(),
                    source = "applyCompactRingingWindow"
                )
            }
            applyCompactRingingWindowLocked(params)
            view.visibility = android.view.View.VISIBLE
            try {
                CompanionPerfTracker.measureUpdateViewLayout {
                    wm.updateViewLayout(view, params)
                }
                if (companion.state == OverlayState.BIG_PUSH) {
                    OverlayDiagTracker.markBigPushVisibleCommit()
                    CompanionBigPushDiag.noteLayoutApplied(
                        companion.snapshot(),
                        source = "applyCompactRingingWindow"
                    )
                }
                val result =
                    if (companion.position == OverlayPosition.BOTTOM) "BOTTOM" else "TOP"
                OverlayDiagTracker.markLayoutApplied(result, companion.position.name)
            } catch (e: Exception) {
                val reason = OemDeviceProbe.classifyFailure(
                    e,
                    LetteringPermissionHelper.canDrawOverlays(this@CallOverlayService)
                )
                OverlayDiagTracker.markLayoutFailed(reason, companion.position.name, e)
                if (companion.state == OverlayState.BIG_PUSH) {
                    CompanionBigPushDiag.noteLayoutFailed(
                        companion.snapshot(),
                        reason,
                        e,
                        source = "applyCompactRingingWindow"
                    )
                }
            }
        }
    }

    private fun applyCompactRingingWindowLocked(params: WindowManager.LayoutParams) {
        val pos = companion.position
        val (sw, sh) = screenSizePx()
        val barH = dp(BigPushShowcaseBar.WINDOW_HEIGHT_DP)
        val topY = topBigPushOffsetY()
        /* TOP|START 고정 — 드래그/피크가 BOTTOM gravity 와 충돌하지 않게 */
        params.gravity = Gravity.TOP or Gravity.START
        if (bigPushPeeking) {
            val keep = dp(32)
            val peekH = dp(112)
            params.width = keep
            params.height = peekH
            params.x = if (bigPushPeekOnRight) (sw - keep).coerceAtLeast(0) else 0
            if (params.y < topY) {
                params.y = compactBarY(pos, peekH, sh)
            }
            applyBigPushPeekChrome(onRight = bigPushPeekOnRight)
        } else {
            params.width = WindowManager.LayoutParams.MATCH_PARENT
            params.height = barH
            params.x = 0
            params.y = compactBarY(pos, barH, sh)
            bigPushPeekTab?.visibility = android.view.View.GONE
            if (companion.state == OverlayState.BIG_PUSH) {
                webView?.visibility = android.view.View.VISIBLE
            }
        }
        applyPassThroughTouchFlags(params)
        applyCapsuleClip(rootContainer, enabled = false)
        rootContainer?.setBackgroundColor(Color.TRANSPARENT)
        webView?.setBackgroundColor(Color.TRANSPARENT)
        VlueBigPushTrace.lifecycle(
            "COMPACT_RINGING_LAYOUT",
            "pos=${pos.name} y=${params.y} h=${params.height} peek=$bigPushPeeking " +
                "ctx=${companion.context.name} state=${companion.state.name}"
        )
    }

    /** 좌/우 동일 크롬 — 화면 밖 VLUE 탭 */
    private fun buildBigPushPeekTab(): FrameLayout {
        val tab = FrameLayout(this).apply {
            setBackgroundColor(Color.TRANSPARENT)
            isClickable = true
            isFocusable = true
        }
        val shell = FrameLayout(this).apply {
            setBackgroundColor(Color.parseColor("#0B1220"))
            clipToOutline = true
            outlineProvider = object : ViewOutlineProvider() {
                override fun getOutline(v: View, outline: Outline) {
                    outline.setRoundRect(0, 0, v.width.coerceAtLeast(1), v.height.coerceAtLeast(1), dp(16).toFloat())
                }
            }
        }
        val rail = View(this).apply {
            setBackgroundColor(Color.parseColor("#38BDF8"))
        }
        val chevron = TextView(this).apply {
            text = "‹"
            setTextColor(Color.parseColor("#E0F2FE"))
            textSize = 16f
            typeface = Typeface.DEFAULT_BOLD
            gravity = Gravity.CENTER
            setBackgroundColor(Color.parseColor("#0F172A"))
        }
        shell.addView(
            rail,
            FrameLayout.LayoutParams(dp(4), FrameLayout.LayoutParams.MATCH_PARENT, Gravity.CENTER).apply {
                topMargin = dp(14)
                bottomMargin = dp(14)
            }
        )
        shell.addView(
            chevron,
            FrameLayout.LayoutParams(dp(22), dp(22), Gravity.CENTER)
        )
        tab.addView(
            shell,
            FrameLayout.LayoutParams(dp(32), dp(112), Gravity.CENTER)
        )
        tab.tag = chevron
        return tab
    }

    private fun applyBigPushPeekChrome(onRight: Boolean) {
        bigPushPeekOnRight = onRight
        val tab = bigPushPeekTab ?: return
        webView?.visibility = android.view.View.GONE
        nativeBanner?.visibility = android.view.View.GONE
        tab.visibility = android.view.View.VISIBLE
        (tab.tag as? TextView)?.text = if (onRight) "‹" else "›"
        tab.invalidateOutline()
    }

    /**
     * BigPush MiniCase 패리티: 드래그 + 좌/우 가장자리 피크.
     * OverlayState 는 BIG_PUSH 유지. ▾ 펼침은 계속 금지.
     */
    private fun attachBigPushDragGestures(banner: View) {
        var downRawX = 0f
        var downRawY = 0f
        var startX = 0
        var startY = 0
        var dragging = false
        var moved = false
        banner.setOnTouchListener { _, ev ->
            if (companion.state != OverlayState.BIG_PUSH) return@setOnTouchListener false
            val wm = windowManager ?: return@setOnTouchListener false
            val view = rootContainer ?: return@setOnTouchListener false
            val params = layoutParams ?: return@setOnTouchListener false
            when (ev.actionMasked) {
                MotionEvent.ACTION_DOWN -> {
                    downRawX = ev.rawX
                    downRawY = ev.rawY
                    ensureBigPushTopStartGravity(params)
                    startX = params.x
                    startY = params.y
                    dragging = true
                    moved = false
                    true
                }
                MotionEvent.ACTION_MOVE -> {
                    if (!dragging) return@setOnTouchListener false
                    val dx = (ev.rawX - downRawX).toInt()
                    val dy = (ev.rawY - downRawY).toInt()
                    if (abs(dx) > 10 || abs(dy) > 10) moved = true
                    if (bigPushPeeking && moved) {
                        expandBigPushFromPeekForDrag(params)
                        startX = params.x
                        startY = params.y
                        downRawX = ev.rawX
                        downRawY = ev.rawY
                    }
                    val (sw, sh) = screenSizePx()
                    val keep = dp(28)
                    val w = if (params.width > 0) params.width else sw
                    val h = if (params.height > 0) params.height else dp(BigPushShowcaseBar.WINDOW_HEIGHT_DP)
                    params.x = (startX + dx).coerceIn(keep - w, sw - keep)
                    params.y = (startY + dy).coerceIn(keep - h, sh - keep)
            try {
                wm.updateViewLayout(view, params)
            } catch (_: Exception) {
            }
                    true
                }
                MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> {
                    if (!dragging) return@setOnTouchListener false
                    dragging = false
                    if (!moved) {
                        if (bigPushPeeking) {
                            restoreBigPushFromPeek()
                        } else {
                            openShowcaseFromBigPushTap()
                        }
                        return@setOnTouchListener true
                    }
                    snapBigPushEdgePeek(params)
                    true
                }
                else -> false
            }
        }
    }

    private fun ensureBigPushTopStartGravity(params: WindowManager.LayoutParams) {
        if (params.gravity == (Gravity.TOP or Gravity.START)) return
        val (sw, sh) = screenSizePx()
        val h = if (params.height > 0) params.height else dp(BigPushShowcaseBar.WINDOW_HEIGHT_DP)
        val yAbs = when {
            params.gravity and Gravity.BOTTOM == Gravity.BOTTOM ->
                (sh - h - params.y).coerceAtLeast(0)
            else -> params.y
        }
        params.gravity = Gravity.TOP or Gravity.START
        params.y = yAbs
        if (params.width <= 0) params.width = sw
        try {
            windowManager?.updateViewLayout(rootContainer ?: return, params)
        } catch (_: Exception) {
        }
    }

    private fun expandBigPushFromPeekForDrag(params: WindowManager.LayoutParams) {
        bigPushPeeking = false
        bigPushPeekTab?.visibility = android.view.View.GONE
        webView?.visibility = android.view.View.VISIBLE
        params.width = WindowManager.LayoutParams.MATCH_PARENT
        params.height = dp(BigPushShowcaseBar.WINDOW_HEIGHT_DP)
        params.x = 0
        try {
            windowManager?.updateViewLayout(rootContainer ?: return, params)
        } catch (_: Exception) {
        }
    }

    private fun snapBigPushEdgePeek(params: WindowManager.LayoutParams) {
        val wm = windowManager ?: return
        val view = rootContainer ?: return
        val (sw, sh) = screenSizePx()
        val keep = dp(32)
        val peekH = dp(112)
        val barH = dp(BigPushShowcaseBar.WINDOW_HEIGHT_DP)
        val w = when {
            params.width > 0 && params.width != WindowManager.LayoutParams.MATCH_PARENT -> params.width
            else -> sw
        }
        val mid = params.x + w / 2
        when {
            mid < keep * 3 || params.x < keep - w / 2 -> {
                bigPushPeeking = true
                bigPushPeekOnRight = false
                params.width = keep
                params.height = peekH
                params.x = 0
                params.y = params.y.coerceIn(keep - peekH, sh - keep)
                applyBigPushPeekChrome(onRight = false)
            }
            mid > sw - keep * 3 || params.x + w > sw - keep + w / 2 -> {
                bigPushPeeking = true
                bigPushPeekOnRight = true
                params.width = keep
                params.height = peekH
                params.x = sw - keep
                params.y = params.y.coerceIn(keep - peekH, sh - keep)
                applyBigPushPeekChrome(onRight = true)
            }
            else -> {
                bigPushPeeking = false
                bigPushPeekTab?.visibility = android.view.View.GONE
                webView?.visibility = android.view.View.VISIBLE
                params.width = WindowManager.LayoutParams.MATCH_PARENT
                params.height = barH
                params.x = 0
                params.y = params.y.coerceIn(0, sh - barH)
            }
        }
        params.gravity = Gravity.TOP or Gravity.START
        applyPassThroughTouchFlags(params)
        try {
            wm.updateViewLayout(view, params)
        } catch (_: Exception) {
        }
        VlueBigPushTrace.lifecycle(
            "BIG_PUSH_DRAG",
            "peek=$bigPushPeeking right=$bigPushPeekOnRight x=${params.x} y=${params.y} w=${params.width}"
        )
    }

    private fun restoreBigPushFromPeek() {
        bigPushPeeking = false
        bigPushPeekTab?.visibility = android.view.View.GONE
        webView?.visibility = android.view.View.VISIBLE
        val params = layoutParams ?: return
        val (_, sh) = screenSizePx()
        val h = dp(BigPushShowcaseBar.WINDOW_HEIGHT_DP)
        val wasRight = bigPushPeekOnRight
        params.width = WindowManager.LayoutParams.MATCH_PARENT
        params.height = h
        params.x = 0
        params.y = params.y.coerceIn(0, sh - h)
        params.gravity = Gravity.TOP or Gravity.START
        applyPassThroughTouchFlags(params)
        try {
            windowManager?.updateViewLayout(rootContainer ?: return, params)
        } catch (_: Exception) {
        }
        VlueBigPushTrace.lifecycle("BIG_PUSH_PEEK_RESTORE", "wasRight=$wasRight y=${params.y}")
    }

    /** CSS px 클램프용 — WebView가 Mini Case로 줄어든 뒤에도 전체 화면 크기 제공 */
    fun getScreenSizeJson(): String {
        val dm = resources.displayMetrics
        return """{"w":${dm.widthPixels},"h":${dm.heightPixels},"d":${dm.density}}"""
    }

    fun notifyWebCallState(state: String) {
        /*
         * Web Content / UI sync only (예: "connected").
         * OverlayState 전이는 하지 않는다 — ANSWER/OFFHOOK는 enterShowcaseFromAnswer → onAnswer.
         */
        mainHandler.post {
            val safe = state.replace("'", "").replace("\\", "")
            val js =
                "try{window.__VLUE_LAST_CALL_STATE__='$safe';" +
                    "window.VlueLettering&&window.VlueLettering.onNativeCallState&&window.VlueLettering.onNativeCallState('$safe');" +
                    "window.dispatchEvent(new CustomEvent('vlue-native-call-state',{detail:{callState:'$safe'}}));}catch(e){}"
            webView?.evaluateJavascript(js, null)
        }
    }

    /**
     * 웹 notifyVlueAuthMemberReady — 인증 회원·미송출 수화 시 중앙 팝업.
     * 이름표시 빅푸시가 수화 후에도 남는 것 방지.
     */
    fun onVlueAuthMemberReadyFromWeb(phone: String) {
        mainHandler.post {
            if (dismissing) return@post
            if (phone.isNotBlank() &&
                !IncomingNumberResolver.isUnknown(phone) &&
                currentPhone.isNotBlank() &&
                !IncomingNumberResolver.sameCanonicalNumber(currentPhone, phone)
            ) {
                return@post
            }
            if (!VlueAuthMemberPopupPolicy.isAuthMemberOnly(
                    pendingCardJson,
                    verified = pendingVerified || parseIsVerified(pendingCardJson)
                )
            ) {
                return@post
            }
            presentCenterSafePopup(source = "onVlueAuthMemberReadyFromWeb", authMember = true)
        }
    }

    /**
     * 통화 오버레이(WebView)만 닫고 이 서비스만 stopSelf.
     * MainActivity·LetteringCallMonitorService·앱 프로세스는 종료하지 않는다.
     * Phase 6-G FINAL: 애니 대기 없이 즉시 remove — CallEnd→Gone &lt; 300ms.
     */
    fun dismissOverlay() {
        if (dismissing) return
        dismissing = true
        cancelBigPushSettle()
        stopContextWatch()
        CompanionRuntimeStabilityDiag.mark("CONTROLLER_ON_CALL_END", "dismissOverlay")
        CompanionRuntimeStabilityDiag.endCallSession("dismissOverlay")
        companion.onCallEnd()
        remoteConnected = false
        userMinimized = false
        bigPushPeeking = false
        overlayModal = false
        dcpPopupOnly = false
        publishCompanion(OverlayTriggerEvent.CALL_END)
        /* 애니/큐보다 먼저 Web idle — stale connected 가 UI 를 되살리지 않게 */
        notifyWebCallState("idle")
        CompanionRuntimeStabilityDiag.mark("WEB_CALL_STATE_IDLE", "dismissOverlay")
        CompanionRuntimeStabilityDiag.mark("OVERLAY_HIDE_BEGIN", "dismissOverlay")
        rootContainer?.animate()?.cancel()
                removeOverlayImmediate()
        CompanionRuntimeStabilityDiag.mark("OVERLAY_HIDE_COMPLETE", "dismissOverlay_immediate")
        LetteringRingingActivity.requestFinish(this)
        val queued = pendingShowAfterDismiss
        pendingShowAfterDismiss = null
        if (queued != null) {
            CompanionRuntimeStabilityDiag.mark("SHOW_OVERLAY_AFTER_DISMISS", "dismissOverlay")
            mainHandler.post {
                showOverlay(
                    queued.phone,
                    queued.verified,
                    queued.outgoing,
                    queued.cardJson,
                    queued.dcpRoute
                )
            }
            return
        }
        stopSelfTraced("dismissOverlay_immediate")
    }

    private fun removeOverlayImmediate() {
        cancelBigPushSettle()
        ShowcaseProximitySensor.detach()
        webView?.destroy()
        webView = null
        rootContainer?.let { v ->
            try {
                OverlayDiagTracker.onRemoveView()
                windowManager?.removeView(v)
                VlueBigPushTrace.lifecycle(
                    "REMOVE_VIEW",
                    "attachedWas=${v.isAttachedToWindow} ${OverlayDiagTracker.detailSuffix()}"
                )
            } catch (e: Exception) {
                VlueBigPushTrace.lifecycle(
                    "REMOVE_VIEW_EXCEPTION",
                    "${e.javaClass.simpleName}: ${e.message}"
                )
            }
        }
        rootContainer = null
        layoutParams = null
        nativeBanner = null
        bigPushPeekTab = null
        bigPushPeeking = false
        currentDcpRoute = ""
        removeDcpPopupWindow()
        webView = null
        dismissing = false
    }

    override fun onTaskRemoved(rootIntent: Intent?) {
        CompanionRecoveryTracker.recordServiceLifecycle("ON_TASK_REMOVED")
        super.onTaskRemoved(rootIntent)
    }

    override fun onConfigurationChanged(newConfig: Configuration) {
        CompanionRecoveryTracker.recordServiceLifecycle(
            "CONFIGURATION_CHANGE",
            "orientation=${newConfig.orientation}"
        )
        super.onConfigurationChanged(newConfig)
    }

    override fun onDestroy() {
        CompanionRecoveryTracker.recordServiceLifecycle("ON_DESTROY")
        unregisterMemoryCallbackObserver()
        stopContextWatch()
        stopScreenStateDetector()
        OverlayDiagTracker.onDestroy()
        VlueBigPushTrace.lifecycle(
            "ON_DESTROY",
            "fgsEndedAt=${OverlayDiagTracker.foregroundEndedAtMs} ${OverlayDiagTracker.detailSuffix()}"
        )
        if (activeInstance === this) activeInstance = null
        removeOverlayImmediate()
        super.onDestroy()
    }

    private fun registerMemoryCallbackObserver() {
        unregisterMemoryCallbackObserver()
        val cb = object : ComponentCallbacks2 {
            override fun onTrimMemory(level: Int) {
                CompanionRecoveryTracker.recordMemoryCallback(
                    kind = "onTrimMemory",
                    level = level
                )
            }

            override fun onConfigurationChanged(newConfig: Configuration) {
                /* Service.onConfigurationChanged에서도 기록 — 중복 허용(관찰) */
            }

            override fun onLowMemory() {
                CompanionRecoveryTracker.recordMemoryCallback(kind = "onLowMemory")
            }
        }
        memoryCallbacks = cb
        applicationContext.registerComponentCallbacks(cb)
    }

    private fun unregisterMemoryCallbackObserver() {
        memoryCallbacks?.let {
            try {
                applicationContext.unregisterComponentCallbacks(it)
            } catch (_: Exception) {
            }
        }
        memoryCallbacks = null
    }

    private fun startScreenStateDetector() {
        stopScreenStateDetector()
        val detector = ScreenStateDetector(applicationContext) { next ->
            mainHandler.post { handleScreenStateChanged(next) }
        }
        screenStateDetector = detector
        detector.start()
    }

    private fun stopScreenStateDetector() {
        screenStateDetector?.stop()
        screenStateDetector = null
    }

    /**
     * ScreenState → Controller Position Context만.
     * OverlayState / dismiss / Call End를 유발하지 않는다.
     */
    private fun handleScreenStateChanged(next: ScreenState) {
        val previous = companion.screenState
        if (previous == next) return
        companion.onScreenStateChanged(next)
        publishCompanion(OverlayTriggerEvent.SCREEN_CHANGED)
        val detail = org.json.JSONObject()
            .put("event", "SCREEN_CHANGED")
            .put("previous", previous.name)
            .put("current", next.name)
            .put("overlayState", companion.state.name)
            .put("position", companion.position.name)
            .put("screenState", companion.screenState.name)
            .toString()
        VlueBigPushTrace.milestone(
            "SCREEN_CHANGED",
            "Screen Changed",
            seq = 0,
            detail = detail
        )
        applyLayoutFromController(source = "screen:$previous→$next")
    }

    /**
     * HOME / 다른 앱 전환 시 Activity lifecycle 또는 ContextWatch 에서 호출.
     * SHOWCASE → MINI: 확정된 OTHER_APP / HOME 만 (InCallUI 오판 유예 후).
     */
    private fun reevaluateForegroundContext(source: String) {
        if (dismissing || !CompanionRuntimeStabilityDiag.isCallSessionActive()) return
        if (companion.state != OverlayState.SHOWCASE &&
            companion.state != OverlayState.MINI_CASE &&
            companion.state != OverlayState.BIG_PUSH
        ) {
            return
        }
        val prevState = companion.state
        val prevPos = companion.position
        val prevCtx = companion.context
        val forceRinging = companion.state == OverlayState.BIG_PUSH && !isCallAlreadyAnswered()
        val ourAppForeground =
            VlueCallOverlayApp.currentActivityName.orEmpty().let { activity ->
                activity.contains("kr.vlue", ignoreCase = true) &&
                    !activity.contains("(paused)", ignoreCase = true)
            }
        val detected = detectOverlayContext(forceRinging = forceRinging)
        val tasksPkg = ForegroundPackageProbe.runningTaskPackage(this)
        /*
         * 풀 InCallUI 확정은 tasks 가 전체 InCall 일 때만.
         * stale resume / detected==INCOMING 만으로 confirmed 하면
         * BELOW 핀이 풀려 미니 수신 뒤로 TOP 겹침 (연속 수신·다이얼러 최근기록).
         */
        val confirmedFullInCall =
            OverlayContextDetector.isLikelyFullInCallUiPackage(tasksPkg)
        val ctx = OverlayPositionManager.holdBelowCompactIncoming(
            previous = prevPos,
            previousContext = prevCtx,
            nextContext = detected,
            ringing = forceRinging,
            ourAppForeground = ourAppForeground,
            confirmedFullInCall = confirmedFullInCall
        )
        if (ctx != detected) {
            android.util.Log.i(
                "VlueOverlayCtx",
                "holdBelowHun source=$source prevPos=$prevPos detected=${detected.name} held=${ctx.name}"
            )
        }
        if (companion.state == OverlayState.SHOWCASE || companion.state == OverlayState.MINI_CASE) {
            /* 중앙 안심/인증 팝업 표시 중 — 하단 바로 collapse 금지 (팝업 소실 방지) */
            if (dcpPopupView?.isAttachedToWindow == true) {
                companion.updateContext(OverlayContext.IN_CALL)
                return
            }
            val hold =
                android.os.SystemClock.elapsedRealtime() < showcaseHoldUntilElapsed
            /*
             * 사용자가 팝업 확인/접기로 MiniCase 를 택한 뒤 ContextWatch 가
             * InCallUI 를 OTHER_APP 으로 오판하면 collapse→BigPush 로 되돌린다.
             * userMinimized 유지 중에는 MiniCase 를 빅푸시로 바꾸지 않는다.
             */
            if (!hold &&
                !userMinimized &&
                (ctx == OverlayContext.OTHER_APP || ctx == OverlayContext.HOME_SCREEN)
            ) {
                /* 다른 앱/홈/삼성 미니푸시 — 하단 쇼케이스 바 (MiniCase 아님) */
                companion.collapseToBottomShowcaseBar(ctx)
                userMinimized = false
                publishCompanion(OverlayTriggerEvent.HOME_CHANGED)
                syncOverlayChromeForState(source = "reeval:$source:bottomBar")
                applyLayoutFromController(source = "reeval:$source:bottomBar")
                notifyWebCallState("big_push_bar")
                CompanionRuntimeStabilityDiag.mark(
                    "HOME_CONTEXT_REEVAL",
                    source,
                    org.json.JSONObject()
                        .put("context", ctx.name)
                        .put("state", companion.state.name)
                        .put("position", companion.position.name)
                )
                return
            }
            if (companion.state == OverlayState.MINI_CASE) {
                companion.updateContext(
                    if (ctx == OverlayContext.OTHER_APP || ctx == OverlayContext.HOME_SCREEN) {
                        OverlayContext.MINIMIZED
                    } else {
                        OverlayContext.IN_CALL
                    }
                )
                return
            }
            if (companion.state == OverlayState.SHOWCASE) {
                companion.updateContext(OverlayContext.IN_CALL)
                val h = layoutParams?.height ?: 0
                if (h > 0 && h < dp(400)) {
                    commitFullscreenLayout(source = "reeval:$source:pinFull")
                }
                return
            }
        }
        companion.updateContext(ctx)
        if (companion.state != prevState || companion.position != prevPos) {
            publishCompanion(OverlayTriggerEvent.HOME_CHANGED)
            applyLayoutFromController(source = "reeval:$source")
            if (companion.state == OverlayState.BIG_PUSH) {
                notifyWebCallState("big_push_bar")
            }
            CompanionRuntimeStabilityDiag.mark(
                "HOME_CONTEXT_REEVAL",
                source,
                org.json.JSONObject()
                    .put("context", ctx.name)
                    .put("state", companion.state.name)
                    .put("position", companion.position.name)
            )
        } else if (companion.state == OverlayState.BIG_PUSH) {
            applyCompactRingingWindow()
        }
    }

    private val contextWatchRunnable = object : Runnable {
        override fun run() {
            if (dismissing) return
            when (companion.state) {
                OverlayState.BIG_PUSH, OverlayState.SHOWCASE, OverlayState.MINI_CASE -> {
                    reevaluateForegroundContext("contextWatch")
                    mainHandler.postDelayed(this, 450L)
                }
                else -> Unit
            }
        }
    }

    private fun startContextWatch() {
        mainHandler.removeCallbacks(contextWatchRunnable)
        mainHandler.postDelayed(contextWatchRunnable, 450L)
    }

    private fun stopContextWatch() {
        mainHandler.removeCallbacks(contextWatchRunnable)
    }

    private fun stopSelfTraced(reason: String) {
        OverlayDiagTracker.onStopSelf()
        VlueBigPushTrace.lifecycle("STOP_SELF", reason)
        stopSelf()
    }

    /**
     * 통화 중 showOverlay 와 동일 type / flags / size / gravity.
     * NORMAL_OVERLAY_PROBE 비교 실험용 단일 소스.
     */
    /**
     * BigPush LayoutParams — PositionManager TOP/BOTTOM.
     * NORMAL_OVERLAY_PROBE 는 TOP 기준 동일 type/flags 사용.
     */
    private fun buildBigPushLayoutParams(position: OverlayPosition): WindowManager.LayoutParams {
        val type = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
        } else {
            @Suppress("DEPRECATION")
            WindowManager.LayoutParams.TYPE_PHONE
        }
        /*
         * Phase 6-I + Showcase Bar: 컴팩트 높이만.
         * Companion Overlay 는 NOT_FOCUSABLE + NOT_TOUCH_MODAL 로 하위 앱 터치 통과.
         */
        return WindowManager.LayoutParams(
            WindowManager.LayoutParams.MATCH_PARENT,
            dp(BigPushShowcaseBar.WINDOW_HEIGHT_DP),
            type,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN or
                WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL,
            PixelFormat.TRANSLUCENT
        ).apply {
            /* 항상 TOP|START + y — BOTTOM gravity 와 드래그/피크 충돌 방지 */
            gravity = Gravity.TOP or Gravity.START
            val (_, sh) = screenSizePx()
            val barH = dp(BigPushShowcaseBar.WINDOW_HEIGHT_DP)
            y = compactBarY(position, barH, sh)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                layoutInDisplayCutoutMode =
                    WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES
            }
        }
    }

    private fun buildShowcaseLayoutParams(): WindowManager.LayoutParams =
        buildBigPushLayoutParams(OverlayPosition.TOP).apply {
            height = WindowManager.LayoutParams.MATCH_PARENT
            width = WindowManager.LayoutParams.MATCH_PARENT
            gravity = Gravity.TOP or Gravity.START
        }

    /** @deprecated use buildBigPushLayoutParams — probe 호환 */
    private fun buildStandardOverlayLayoutParams(): WindowManager.LayoutParams =
        buildBigPushLayoutParams(OverlayPosition.TOP)

    /**
     * 통화 중이 아닐 때 동일 Context(CallOverlayService) + LayoutParams 로 addView.
     * 뷰는 비가시(alpha=0)이며 즉시 remove — 제품 UI 미표시.
     */
    private fun runNormalOverlayProbe() {
        VlueBigPushTrace.bind(this)
        if (!NormalOverlayProbe.isPhoneIdle(this)) {
            VlueBigPushTrace.recordOverlayAddViewProbe(
                context = this,
                probeKind = "NORMAL_OVERLAY_PROBE",
                result = "FAIL",
                params = null,
                extra = org.json.JSONObject().put("phase", "skipped").put("reason", "phone_not_idle")
            )
            DiagnosticsSessionStore.endSessionIfFeature(this, DiagnosticsFeature.OVERLAY, "SKIPPED")
            if (rootContainer == null) stopSelfTraced("normalProbeSkippedNotIdle")
            return
        }
        if (rootContainer?.isAttachedToWindow == true) {
            VlueBigPushTrace.recordOverlayAddViewProbe(
                context = this,
                probeKind = "NORMAL_OVERLAY_PROBE",
                result = "FAIL",
                params = layoutParams,
                extra = org.json.JSONObject().put("phase", "skipped").put("reason", "overlay_already_attached")
            )
            DiagnosticsSessionStore.endSessionIfFeature(this, DiagnosticsFeature.OVERLAY, "SKIPPED")
            return
        }

        windowManager = getSystemService(WINDOW_SERVICE) as WindowManager
        val params = buildStandardOverlayLayoutParams()
        val probeView = FrameLayout(this).apply {
            alpha = 0f
            importantForAccessibility = android.view.View.IMPORTANT_FOR_ACCESSIBILITY_NO
        }

        VlueBigPushTrace.dumpOverlayPermissionProbe(
            context = this,
            params = params,
            phase = "NORMAL_OVERLAY_PROBE pre-addView"
        )
        VlueBigPushTrace.dumpLayoutParams(params, "NORMAL_OVERLAY_PROBE LayoutParams")

        var status = "OK"
        try {
            windowManager?.addView(probeView, params)
            VlueBigPushTrace.recordOverlayAddViewProbe(
                context = this,
                probeKind = "NORMAL_OVERLAY_PROBE",
                result = "SUCCESS",
                params = params,
                extra = org.json.JSONObject()
                    .put("phase", "idle")
                    .put("callState", "IDLE")
                    .put("viewClass", probeView.javaClass.name)
            )
            try {
                windowManager?.removeViewImmediate(probeView)
            } catch (_: Exception) {
                try {
                    windowManager?.removeView(probeView)
                } catch (_: Exception) {
                }
            }
        } catch (e: Exception) {
            status = "FAILED"
            VlueBigPushTrace.recordOverlayAddViewProbe(
                context = this,
                probeKind = "NORMAL_OVERLAY_PROBE",
                result = "EXCEPTION",
                params = params,
                error = e,
                extra = org.json.JSONObject().put("phase", "idle").put("callState", "IDLE")
            )
        }

        DiagnosticsSessionStore.endSessionIfFeature(this, DiagnosticsFeature.OVERLAY, status)
        if (rootContainer == null) {
            stopSelfTraced("normalOverlayProbeDone")
        }
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val channel = NotificationChannel(
            CHANNEL_ID,
            getString(R.string.lettering_channel_name),
            NotificationManager.IMPORTANCE_LOW
        ).apply {
            description = getString(R.string.lettering_channel_desc)
        }
        (getSystemService(NOTIFICATION_SERVICE) as NotificationManager)
            .createNotificationChannel(channel)
    }

    private fun buildNotification(): Notification {
        val pending = PendingIntent.getActivity(
            this, 0,
            Intent(this, MainActivity::class.java),
            PendingIntent.FLAG_IMMUTABLE
        )
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle(getString(R.string.lettering_notification_title))
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentIntent(pending)
            .setOngoing(true)
            .build()
    }

    fun setKeypadOpen(open: Boolean) {
        keypadOpen = open
        companion.onKeypad(open)
        publishCompanion(
            if (open) OverlayTriggerEvent.KEYPAD_OPEN else OverlayTriggerEvent.KEYPAD_CLOSE,
            userAction = true
        )
        if (open) {
            applyLayoutFromController(source = "keypadOpen")
        }
    }

    companion object {
        const val EXTRA_PHONE = "phone"
        const val EXTRA_VERIFIED = "verified"
        const val EXTRA_OUTGOING = "outgoing"
        const val EXTRA_CARD_JSON = "card_json"
        const val EXTRA_DCP_ROUTE = "dcp_route"
        const val ACTION_DISMISS = "kr.vlue.calloverlay.DISMISS"
        const val ACTION_CONNECTED = "kr.vlue.calloverlay.CONNECTED"
        const val ACTION_ENDED_KEEP = "kr.vlue.calloverlay.ENDED_KEEP"
        const val ACTION_UPDATE_CALL_INFO = "kr.vlue.calloverlay.UPDATE_CALL_INFO"
        /** 설정 DCP 테스트 — 팝업만 (전체 오버레이 없음) */
        const val ACTION_DCP_TEST_POPUP = "kr.vlue.calloverlay.DCP_TEST_POPUP"
        /** 유휴 상태 동일 LayoutParams addView 실험 — 제품 UI 없음 */
        const val ACTION_NORMAL_OVERLAY_PROBE = "kr.vlue.calloverlay.NORMAL_OVERLAY_PROBE"
        private const val CHANNEL_ID = "vlue_lettering_overlay"
        private const val NOTIFICATION_ID = 41001

        @Volatile
        private var activeInstance: CallOverlayService? = null

        fun isRunning(): Boolean = activeInstance != null

        /** BigPush/Showcase/Mini 가 화면에 있으면 HUN 폴백 금지 */
        fun isCompanionSurfaceVisible(): Boolean {
            val svc = activeInstance ?: return false
            if (svc.dismissing) return false
            if (svc.rootContainer == null) return false
            return when (svc.companion.state) {
                OverlayState.BIG_PUSH,
                OverlayState.SHOWCASE,
                OverlayState.MINI_CASE -> true
                else -> false
            }
        }

        /**
         * PHONE_STATE OFFHOOK 시 Showcase 진입 여부.
         * 발신 다이얼 중(currentOutgoing && !remoteConnected) 은 false.
         */
        fun shouldConnectOnOffhook(): Boolean {
            val svc = activeInstance ?: return false
            if (svc.remoteConnected) return true
            if (svc.currentOutgoing) return false
            return svc.companion.state == OverlayState.BIG_PUSH ||
                svc.isInCallOverlayState()
        }

        /** Activity pause/stop → HOME 점유 해제용 Context 재평가 */
        fun notifyForegroundContextChanged(source: String = "activityLifecycle") {
            val svc = activeInstance ?: return
            svc.mainHandler.post { svc.reevaluateForegroundContext(source) }
        }

        fun updateCallInfo(
            context: android.content.Context,
            phone: String,
            verified: Boolean,
            cardJson: String?,
            outgoing: Boolean,
            dcpRoute: String = ""
        ) {
            try {
                val intent = Intent(context, CallOverlayService::class.java).apply {
                    action = ACTION_UPDATE_CALL_INFO
                    putExtra(EXTRA_PHONE, phone)
                    putExtra(EXTRA_VERIFIED, verified)
                    putExtra(EXTRA_OUTGOING, outgoing)
                    putExtra(EXTRA_CARD_JSON, cardJson)
                    putExtra(EXTRA_DCP_ROUTE, dcpRoute)
                }
                if (activeInstance != null) {
                    context.startService(intent)
                } else {
                    context.startForegroundService(
                        Intent(context, CallOverlayService::class.java).apply {
                            putExtra(EXTRA_PHONE, phone)
                            putExtra(EXTRA_VERIFIED, verified)
                            putExtra(EXTRA_OUTGOING, outgoing)
                            putExtra(EXTRA_CARD_JSON, cardJson)
                            putExtra(EXTRA_DCP_ROUTE, dcpRoute)
                        }
                    )
                }
            } catch (e: Exception) {
                activeInstance?.applyCallInfoUpdate(phone, verified, outgoing, cardJson, dcpRoute)
            }
        }

        fun notifyConnected(context: android.content.Context) {
            /* Native Call Event (OFFHOOK/ACTIVE) → Controller.onAnswer — Web "connected" 알림과 역할 분리 */
            if (!CompanionRuntimeStabilityDiag.isCallSessionActive()) {
                CompanionRuntimeStabilityDiag.noteStaleEvent(
                    "CONNECTED",
                    "notifyConnected",
                    detail = "session inactive — skip startService"
                )
                return
            }
            try {
                val intent = Intent(context, CallOverlayService::class.java).apply {
                    action = ACTION_CONNECTED
                }
                context.startService(intent)
            } catch (_: Exception) {
                activeInstance?.enterShowcaseFromAnswer(source = "notifyConnected_fallback")
            }
        }

        fun notifyKeepAfterEnd(context: android.content.Context) {
            try {
                val intent = Intent(context, CallOverlayService::class.java).apply {
                    action = ACTION_ENDED_KEEP
                }
                context.startService(intent)
            } catch (_: Exception) {
                activeInstance?.onRestoreShowcaseRequestedFromWeb(source = "notifyKeepAfterEnd_fallback")
                activeInstance?.notifyWebCallState("ended_keep_overlay")
            }
        }
    }
}
