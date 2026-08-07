package kr.vlue.calloverlay

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.graphics.Color
import android.graphics.PixelFormat
import android.graphics.Typeface
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.util.TypedValue
import android.telephony.TelephonyManager
import android.view.Gravity
import android.view.WindowManager
import android.view.animation.DecelerateInterpolator
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.TextView
import androidx.core.app.NotificationCompat
import kr.vlue.calloverlay.companion.CompanionOverlayController
import kr.vlue.calloverlay.companion.OverlayContext
import kr.vlue.calloverlay.companion.OverlayContextDetector
import kr.vlue.calloverlay.companion.OverlayPosition
import kr.vlue.calloverlay.companion.OverlayState
import kr.vlue.calloverlay.diagnostics.DiagnosticsFeature
import kr.vlue.calloverlay.diagnostics.DiagnosticsSessionStore
import kr.vlue.calloverlay.diagnostics.NormalOverlayProbe
import kr.vlue.calloverlay.diagnostics.OverlayDiagTracker
import kr.vlue.calloverlay.showcase.ShowcaseProximitySensor

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
    /** @deprecated Controller.state 사용 — 브리지 호환용 adapter */
    private var miniMode = false
    /** @deprecated Controller.state 사용 — ringing compact adapter */
    private var callPhaseCompact = true
    private val companion = CompanionOverlayController()
    private val mainHandler = Handler(Looper.getMainLooper())
    private var pendingConnectedNotify = false
    private var pendingCardJson: String? = null
    private var currentPhone: String = ""
    private var currentOutgoing: Boolean = false
    private var keypadOpen = false
    private var userMinimized = false

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
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
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_NORMAL_OVERLAY_PROBE -> {
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
                    setOverlayFullscreen(true)
                    notifyWebCallState("ended_keep_overlay")
                }
                return START_NOT_STICKY
            }
            ACTION_UPDATE_CALL_INFO -> {
                val phone = intent.getStringExtra(EXTRA_PHONE).orEmpty()
                val verified = intent.getBooleanExtra(EXTRA_VERIFIED, false)
                val outgoing = intent.getBooleanExtra(EXTRA_OUTGOING, false)
                val cardJson = intent.getStringExtra(EXTRA_CARD_JSON)
                applyCallInfoUpdate(phone, verified, outgoing, cardJson)
                return START_NOT_STICKY
            }
        }
        val phone = intent?.getStringExtra(EXTRA_PHONE).orEmpty()
        val verified = intent?.getBooleanExtra(EXTRA_VERIFIED, false) ?: false
        val outgoing = intent?.getBooleanExtra(EXTRA_OUTGOING, false) ?: false
        val cardJson = intent?.getStringExtra(EXTRA_CARD_JSON)
        VlueBigPushTrace.step(
            5,
            "CallOverlayService.onStartCommand()",
            "phone=$phone verified=$verified outgoing=$outgoing action=${intent?.action} " +
                "alreadyAttached=${rootContainer?.isAttachedToWindow == true}"
        )
        showOverlay(phone, verified, outgoing, cardJson)
        return START_NOT_STICKY
    }

    private fun showOverlay(phone: String, verified: Boolean, outgoing: Boolean, cardJson: String? = null) {
        val alreadyAttached = rootContainer?.isAttachedToWindow == true
        val answered = isCallAlreadyAnswered()
        val ctx = detectOverlayContext(forceRinging = !answered)
        companion.onIncoming(ctx)
        OverlayDiagTracker.onShowOverlay()
        OverlayDiagTracker.setCompanionSnapshot(companion.snapshot())
        VlueBigPushTrace.step(
            6,
            "showOverlay()",
            "file=CallOverlayService.kt phone=$phone verified=$verified outgoing=$outgoing " +
                "answered=$answered alreadyAttached=$alreadyAttached " +
                companion.snapshot().toJson().toString() + " " +
                OverlayDiagTracker.detailSuffix()
        )

        /* Answer-before-BigPush: BigPush 생성 금지 → Showcase 경로 */
        if (answered) {
            VlueBigPushTrace.milestone(
                "SHOWCASE_REQUESTED",
                "Showcase Requested",
                seq = 6,
                detail = "answerBeforeBigPush skip BigPush"
            )
            companion.onAnswer(OverlayContext.IN_CALL)
            OverlayDiagTracker.setCompanionSnapshot(companion.snapshot())
            removeOverlayImmediate()
            attachOverlayWindow(
                phone = phone,
                verified = verified,
                outgoing = outgoing,
                cardJson = cardJson,
                asBigPush = false
            )
            enterShowcaseLayout(source = "answerBeforeBigPush")
            notifyWebCallState("connected")
            pendingConnectedNotify = true
            return
        }

        val allowBigPush = companion.requestBigPush(ctx, callAlreadyAnswered = false)
        OverlayDiagTracker.setCompanionSnapshot(companion.snapshot())
        if (!allowBigPush) {
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
        removeOverlayImmediate()
        attachOverlayWindow(
            phone = phone,
            verified = verified,
            outgoing = outgoing,
            cardJson = cardJson,
            asBigPush = true
        )
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
        windowManager = getSystemService(WINDOW_SERVICE) as WindowManager
        val container = FrameLayout(this)
        val bannerGravity =
            if (asBigPush && companion.position == OverlayPosition.BOTTOM) Gravity.BOTTOM else Gravity.TOP

        val banner = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundColor(Color.parseColor("#E60B101B"))
            setPadding(dp(20), dp(28), dp(20), dp(20))
            elevation = dp(8).toFloat()
            visibility = android.view.View.VISIBLE
        }
        val title = TextView(this).apply {
            text = if (outgoing) "VLUE 발신 레터링" else "VLUE 수신 빅푸시"
            setTextColor(Color.WHITE)
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 13f)
            typeface = Typeface.DEFAULT_BOLD
            tag = "banner_title"
        }
        val phoneTv = TextView(this).apply {
            text = bannerPrimaryText(phone, cardJson)
            setTextColor(Color.parseColor("#E2E8F0"))
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 20f)
            typeface = Typeface.DEFAULT_BOLD
            setPadding(0, dp(6), 0, 0)
            tag = "banner_phone"
        }
        val hint = TextView(this).apply {
            text = bannerHintText(phone, verified, cardJson)
            setTextColor(Color.parseColor("#94A3B8"))
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 12f)
            setPadding(0, dp(4), 0, 0)
            tag = "banner_hint"
        }
        banner.addView(title)
        banner.addView(phoneTv)
        banner.addView(hint)
        nativeBanner = banner
        container.addView(
            banner,
            FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.WRAP_CONTENT,
                bannerGravity
            )
        )

        val wv = WebView(this)
        LetteringJavascriptBridge.attach(wv, this)
        wv.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            cacheMode = WebSettings.LOAD_DEFAULT
            val ua = userAgentString.orEmpty()
            if (!ua.contains(VlueLetteringConfig.ANDROID_APP_UA_TOKEN)) {
                userAgentString = "$ua ${VlueLetteringConfig.ANDROID_APP_UA_TOKEN}"
            }
        }
        wv.setBackgroundColor(Color.TRANSPARENT)
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
                injectLetteringFlag(view)
                nativeBanner?.visibility = android.view.View.GONE
                if (pendingConnectedNotify || companion.state == OverlayState.SHOWCASE) {
                    pendingConnectedNotify = false
                    enterShowcaseLayout(source = "onPageFinished")
                    notifyWebCallState("connected")
                } else if (companion.state == OverlayState.BIG_PUSH) {
                    applyCompactRingingWindow()
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

        val params = if (asBigPush) {
            buildBigPushLayoutParams(companion.position)
        } else {
            buildShowcaseLayoutParams()
        }
        callPhaseCompact = asBigPush
        miniMode = false

        VlueBigPushTrace.dumpOverlayPermissionProbe(
            context = this,
            params = params,
            phase = "pre-addView"
        )
        VlueBigPushTrace.dumpLayoutParams(params, "showOverlay LayoutParams pre-addView")

        val fromBottom = asBigPush && companion.position == OverlayPosition.BOTTOM
        container.alpha = 0f
        container.translationY = if (fromBottom) 120f else -120f
        try {
            VlueBigPushTrace.addViewCall(
                "phone=$phone type=${params.type} w=${params.width} h=${params.height} " +
                    "pos=${companion.position.name} state=${companion.state.name} " +
                    "canDrawOverlays=${LetteringPermissionHelper.canDrawOverlays(this)} " +
                    OverlayDiagTracker.detailSuffix()
            )
            OverlayDiagTracker.onAddView()
            windowManager?.addView(container, params)
            VlueBigPushTrace.addViewSuccess(container, params, "phone=$phone")
            if (asBigPush) {
                VlueBigPushTrace.milestone(
                    "BIG_PUSH_VISIBLE",
                    "BigPush Visible",
                    seq = 8,
                    detail = "addView SUCCESS pos=${companion.position.name}"
                )
            }
            VlueBigPushTrace.recordOverlayAddViewProbe(
                context = this,
                probeKind = "CALL_OVERLAY_PROBE",
                result = "SUCCESS",
                params = params,
                extra = org.json.JSONObject()
                    .put("phone", phone)
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
        } catch (e: Exception) {
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
                    .put("phone", phone)
                    .put("overlayState", companion.state.name)
                    .put("overlayPosition", companion.position.name)
            )
            android.util.Log.e("CallOverlay", "addView failed — overlay permission?", e)
            LetteringPrefs.setLastOverlayError(this, "addView:${e.message}")
            LetteringIncomingNotifier.post(this, phone, outgoing)
            LetteringRingingActivity.launch(this, phone, outgoing)
            companion.onCallEnd()
            OverlayDiagTracker.setCompanionSnapshot(companion.snapshot())
            stopSelfTraced("addViewException")
            return
        }
        rootContainer = container
        webView = wv
        layoutParams = params
        ShowcaseProximitySensor.attach(this, wv)
        OverlayDiagTracker.setCompanionSnapshot(companion.snapshot())

        currentPhone = phone
        currentOutgoing = outgoing
        pendingCardJson = cardJson
        wv.loadUrl(VlueLetteringConfig.overlayUrl(phone, verified, outgoing))
        if (!cardJson.isNullOrBlank()) {
            injectCardLookupJson(wv, cardJson)
        }

        container.animate()
            .alpha(1f)
            .translationY(0f)
            .setDuration(320)
            .setInterpolator(DecelerateInterpolator())
            .withEndAction {
                VlueBigPushTrace.dumpOverlayVisibility(
                    rootContainer,
                    layoutParams,
                    reactHint = "post-animate alpha=${rootContainer?.alpha} webView=${webView != null}"
                )
            }
            .start()
    }

    private fun enterShowcaseFromAnswer(source: String) {
        VlueBigPushTrace.milestone(
            "ANSWER_DETECTED",
            "Answer Detected",
            seq = 8,
            detail = source
        )
        VlueBigPushTrace.milestone(
            "SHOWCASE_REQUESTED",
            "Showcase Requested",
            seq = 8,
            detail = "after answer ($source)"
        )
        companion.onAnswer(OverlayContext.IN_CALL)
        OverlayDiagTracker.setCompanionSnapshot(companion.snapshot())
        callPhaseCompact = false
        miniMode = false
        userMinimized = false
        pendingConnectedNotify = true
        if (rootContainer?.isAttachedToWindow == true) {
            enterShowcaseLayout(source = source)
        } else {
            /* BigPush 없이 Answer만 온 경우 — Showcase 윈도우 생성 */
            attachOverlayWindow(
                phone = currentPhone.ifBlank { "unknown" },
                verified = false,
                outgoing = currentOutgoing,
                cardJson = pendingCardJson,
                asBigPush = false
            )
            enterShowcaseLayout(source = source)
        }
        notifyWebCallState("connected")
    }

    private fun enterShowcaseLayout(source: String) {
        companion.onRestoreShowcase(OverlayContext.IN_CALL)
        OverlayDiagTracker.setCompanionSnapshot(companion.snapshot())
        setOverlayFullscreen(true)
        VlueBigPushTrace.milestone(
            "OVERLAY_ATTACHED",
            "Overlay Attached",
            seq = 8,
            detail = "Showcase layout ($source)"
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
        val ourApp = activity.contains("kr.vlue", ignoreCase = true)
        /* Activity name만으로는 패키지 확정 불가 — InCall 추정은 링잉+비홈 휴리스틱 */
        val launcher = activity.contains("Launcher", ignoreCase = true) ||
            activity.contains("launcher", ignoreCase = true)
        val inCallUi = phase == OverlayContextDetector.CallPhase.RINGING && !ourApp && !launcher
        return OverlayContextDetector.detect(
            callPhase = phase,
            foregroundIsOurApp = ourApp,
            foregroundIsLauncher = launcher || (!ourApp && phase == OverlayContextDetector.CallPhase.RINGING && activity.isBlank()),
            foregroundIsInCallUi = inCallUi ||
                (phase == OverlayContextDetector.CallPhase.OFFHOOK && !userMinimized),
            userMinimized = userMinimized,
            keypadOpen = keypadOpen
        )
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
        if (pendingConnectedNotify) return true
        if (companion.state == OverlayState.SHOWCASE || companion.state == OverlayState.MINI_CASE) return true
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
        cardJson: String?
    ) {
        mainHandler.post {
            if (IncomingNumberResolver.isUnknown(phone) && cardJson.isNullOrBlank()) return@post
            currentPhone = phone
            currentOutgoing = outgoing
            pendingCardJson = cardJson
            val banner = nativeBanner
            if (banner != null) {
                (banner.findViewWithTag<TextView>("banner_phone"))?.text =
                    bannerPrimaryText(phone, cardJson)
                (banner.findViewWithTag<TextView>("banner_hint"))?.text =
                    bannerHintText(phone, verified, cardJson)
                (banner.findViewWithTag<TextView>("banner_title"))?.text =
                    if (outgoing) "VLUE 발신 레터링" else "VLUE 수신 빅푸시"
            }
            val wv = webView
            if (wv != null && !IncomingNumberResolver.isUnknown(phone)) {
                wv.loadUrl(VlueLetteringConfig.overlayUrl(phone, verified, outgoing))
                if (!cardJson.isNullOrBlank()) {
                    injectCardLookupJson(wv, cardJson)
                }
                /* 이미 수화(연결) 상태일 때만 전체 쇼케이스 재알림 */
                if (!callPhaseCompact) {
                    notifyWebCallState("connected")
                }
            } else if (rootContainer == null) {
                showOverlay(phone, verified, outgoing, cardJson)
            }
            LetteringPrefs.setLastCallEvent(this, "overlay_updated:$phone")
        }
    }

    private fun injectCardLookupJson(view: WebView?, cardJson: String) {
        val escaped = org.json.JSONObject.quote(cardJson)
        view?.evaluateJavascript(
            "try{window.__VLUE_CARD_LOOKUP__=JSON.parse($escaped);" +
                "window.dispatchEvent(new CustomEvent('vlue-card-lookup',{detail:window.__VLUE_CARD_LOOKUP__}));" +
                "}catch(e){}",
            null
        )
    }

    private fun injectLetteringFlag(view: WebView?) {
        view?.evaluateJavascript(
            "try{localStorage.setItem('vlue_lettering_enabled','1');" +
                "window.dispatchEvent(new CustomEvent('vlue-lettering-settings-changed',{detail:{enabled:true}}));" +
                "}catch(e){}",
            null
        )
        pendingCardJson?.let { injectCardLookupJson(view, it) }
    }

    private fun dp(v: Int): Int =
        TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, v.toFloat(), resources.displayMetrics).toInt()

    private fun screenSizePx(): Pair<Int, Int> {
        val dm = resources.displayMetrics
        return Pair(dm.widthPixels, dm.heightPixels)
    }

    /**
     * Companion Mini Case — 작은 플로팅 윈도우.
     * 자동 가장자리 스냅 없음. JS가 드래그한 x/y를 그대로 반영. 화면 밖 완전 이탈은 JS에서 clamp.
     */
    fun updateMiniOverlayFrame(xPx: Int, yPx: Int, wPx: Int, hPx: Int) {
        mainHandler.post {
            val wm = windowManager ?: return@post
            val view = rootContainer ?: return@post
            val params = layoutParams ?: return@post
            val (sw, sh) = screenSizePx()
            val keep = dp(28)
            val w = wPx.coerceIn(keep, sw)
            val h = hPx.coerceIn(keep, sh)
            val minX = keep - w
            val maxX = sw - keep
            val minY = keep - h
            val maxY = sh - keep
            params.width = w
            params.height = h
            params.x = xPx.coerceIn(minX, maxX)
            params.y = yPx.coerceIn(minY, maxY)
            params.gravity = Gravity.TOP or Gravity.START
            miniMode = true
            nativeBanner?.visibility = android.view.View.GONE
            try {
                wm.updateViewLayout(view, params)
            } catch (_: Exception) {
            }
        }
    }

    fun setOverlayFullscreen(fullscreen: Boolean) {
        mainHandler.post {
            val wm = windowManager ?: return@post
            val view = rootContainer ?: return@post
            val params = layoutParams ?: return@post
            if (fullscreen) {
                when (companion.state) {
                    OverlayState.BIG_PUSH, OverlayState.IDLE ->
                        companion.onAnswer(OverlayContext.IN_CALL)
                    else ->
                        companion.onRestoreShowcase(OverlayContext.IN_CALL)
                }
                callPhaseCompact = false
                miniMode = false
                userMinimized = false
                params.height = WindowManager.LayoutParams.MATCH_PARENT
                params.width = WindowManager.LayoutParams.MATCH_PARENT
                params.x = 0
                params.y = 0
                params.gravity = Gravity.TOP or Gravity.START
                params.flags = params.flags or WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL
                nativeBanner?.visibility = android.view.View.GONE
            } else if (companion.state == OverlayState.BIG_PUSH || callPhaseCompact) {
                applyCompactRingingWindowLocked(params)
            } else {
                companion.onMinimize(
                    if (keypadOpen) OverlayContext.KEYPAD else OverlayContext.MINIMIZED
                )
                userMinimized = true
                if (!miniMode) {
                    val (sw, _) = screenSizePx()
                    val w = (sw * 0.78f).toInt().coerceIn(dp(200), sw - dp(24))
                    val h = dp(110)
                    val x = ((sw - w) / 2).coerceAtLeast(dp(12))
                    val y = dp(56)
                    params.width = w
                    params.height = h
                    params.x = x
                    params.y = y
                }
                miniMode = true
                callPhaseCompact = false
                nativeBanner?.visibility = android.view.View.GONE
                params.gravity = Gravity.TOP or Gravity.START
            }
            OverlayDiagTracker.setCompanionSnapshot(companion.snapshot())
            try {
                wm.updateViewLayout(view, params)
            } catch (_: Exception) {
            }
        }
    }

    /** 수신 링잉 — BigPush TOP/BOTTOM (PositionManager) */
    private fun applyCompactRingingWindow() {
        mainHandler.post {
            val wm = windowManager ?: return@post
            val view = rootContainer ?: return@post
            val params = layoutParams ?: return@post
            applyCompactRingingWindowLocked(params)
            try {
                wm.updateViewLayout(view, params)
            } catch (_: Exception) {
            }
        }
    }

    private fun applyCompactRingingWindowLocked(params: WindowManager.LayoutParams) {
        callPhaseCompact = true
        miniMode = false
        val pos = companion.position
        params.width = WindowManager.LayoutParams.MATCH_PARENT
        params.height = dp(300)
        params.x = 0
        params.y = 0
        params.gravity = when (pos) {
            OverlayPosition.BOTTOM -> Gravity.BOTTOM or Gravity.START
            else -> Gravity.TOP or Gravity.START
        }
        params.flags = params.flags or WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL
    }

    /** CSS px 클램프용 — WebView가 Mini Case로 줄어든 뒤에도 전체 화면 크기 제공 */
    fun getScreenSizeJson(): String {
        val dm = resources.displayMetrics
        return """{"w":${dm.widthPixels},"h":${dm.heightPixels},"d":${dm.density}}"""
    }

    fun notifyWebCallState(state: String) {
        mainHandler.post {
            val js =
                "try{window.VlueLettering&&window.VlueLettering.onNativeCallState&&window.VlueLettering.onNativeCallState('${state}');" +
                    "window.dispatchEvent(new CustomEvent('vlue-native-call-state',{detail:{callState:'${state}'}}));}catch(e){}"
            webView?.evaluateJavascript(js, null)
        }
    }

    /**
     * 통화 오버레이(WebView)만 닫고 이 서비스만 stopSelf.
     * MainActivity·LetteringCallMonitorService·앱 프로세스는 종료하지 않는다.
     */
    fun dismissOverlay() {
        if (dismissing) return
        dismissing = true
        companion.onCallEnd()
        OverlayDiagTracker.setCompanionSnapshot(companion.snapshot())
        val container = rootContainer ?: run {
            stopSelfTraced("dismissOverlay_noContainer")
            return
        }
        container.animate()
            .alpha(0f)
            .translationY(-100f)
            .setDuration(260)
            .withEndAction {
                removeOverlayImmediate()
                stopSelfTraced("dismissOverlay_animateEnd")
            }
            .start()
    }

    private fun removeOverlayImmediate() {
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
        webView = null
        miniMode = false
        callPhaseCompact = true
        dismissing = false
    }

    override fun onDestroy() {
        OverlayDiagTracker.onDestroy()
        VlueBigPushTrace.lifecycle(
            "ON_DESTROY",
            "fgsEndedAt=${OverlayDiagTracker.foregroundEndedAtMs} ${OverlayDiagTracker.detailSuffix()}"
        )
        if (activeInstance === this) activeInstance = null
        removeOverlayImmediate()
        super.onDestroy()
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
        return WindowManager.LayoutParams(
            WindowManager.LayoutParams.MATCH_PARENT,
            dp(300),
            type,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN or
                WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS or
                WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL or
                WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
                WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON or
                WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON,
            PixelFormat.TRANSLUCENT
        ).apply {
            gravity = when (position) {
                OverlayPosition.BOTTOM -> Gravity.BOTTOM or Gravity.START
                else -> Gravity.TOP or Gravity.START
            }
            y = 0
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

    /** JS answerCall — Companion onAnswer + Diagnostics */
    fun notifyCompanionAnswerFromJs() {
        companion.onAnswer(OverlayContext.IN_CALL)
        OverlayDiagTracker.setCompanionSnapshot(companion.snapshot())
        VlueBigPushTrace.milestone(
            "ANSWER_DETECTED",
            "Answer Detected",
            seq = 8,
            detail = "js.answerCall"
        )
    }

    fun setKeypadOpen(open: Boolean) {
        keypadOpen = open
        companion.onKeypad(open)
        OverlayDiagTracker.setCompanionSnapshot(companion.snapshot())
        if (open) setOverlayFullscreen(false)
    }

    companion object {
        const val EXTRA_PHONE = "phone"
        const val EXTRA_VERIFIED = "verified"
        const val EXTRA_OUTGOING = "outgoing"
        const val EXTRA_CARD_JSON = "card_json"
        const val ACTION_DISMISS = "kr.vlue.calloverlay.DISMISS"
        const val ACTION_CONNECTED = "kr.vlue.calloverlay.CONNECTED"
        const val ACTION_ENDED_KEEP = "kr.vlue.calloverlay.ENDED_KEEP"
        const val ACTION_UPDATE_CALL_INFO = "kr.vlue.calloverlay.UPDATE_CALL_INFO"
        /** 유휴 상태 동일 LayoutParams addView 실험 — 제품 UI 없음 */
        const val ACTION_NORMAL_OVERLAY_PROBE = "kr.vlue.calloverlay.NORMAL_OVERLAY_PROBE"
        private const val CHANNEL_ID = "vlue_lettering_overlay"
        private const val NOTIFICATION_ID = 41001

        @Volatile
        private var activeInstance: CallOverlayService? = null

        fun isRunning(): Boolean = activeInstance != null

        fun updateCallInfo(
            context: android.content.Context,
            phone: String,
            verified: Boolean,
            cardJson: String?,
            outgoing: Boolean
        ) {
            try {
                val intent = Intent(context, CallOverlayService::class.java).apply {
                    action = ACTION_UPDATE_CALL_INFO
                    putExtra(EXTRA_PHONE, phone)
                    putExtra(EXTRA_VERIFIED, verified)
                    putExtra(EXTRA_OUTGOING, outgoing)
                    putExtra(EXTRA_CARD_JSON, cardJson)
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
                        }
                    )
                }
            } catch (e: Exception) {
                activeInstance?.applyCallInfoUpdate(phone, verified, outgoing, cardJson)
            }
        }

        fun notifyConnected(context: android.content.Context) {
            try {
                val intent = Intent(context, CallOverlayService::class.java).apply {
                    action = ACTION_CONNECTED
                }
                context.startService(intent)
            } catch (_: Exception) {
                activeInstance?.setOverlayFullscreen(true)
                activeInstance?.notifyWebCallState("connected")
            }
        }

        fun notifyKeepAfterEnd(context: android.content.Context) {
            try {
                val intent = Intent(context, CallOverlayService::class.java).apply {
                    action = ACTION_ENDED_KEEP
                }
                context.startService(intent)
            } catch (_: Exception) {
                activeInstance?.setOverlayFullscreen(true)
                activeInstance?.notifyWebCallState("ended_keep_overlay")
            }
        }
    }
}
