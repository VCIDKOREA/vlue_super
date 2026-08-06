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
import kr.vlue.calloverlay.showcase.ShowcaseProximitySensor

/**
 * SYSTEM_ALERT_WINDOW + WebView 천막 쇼케이스
 * 링잉: 상단 네이티브 빅푸시 배너 + 웹 오버레이
 */
class CallOverlayService : Service() {
    private var windowManager: WindowManager? = null
    private var rootContainer: FrameLayout? = null
    private var nativeBanner: LinearLayout? = null
    private var webView: WebView? = null
    private var layoutParams: WindowManager.LayoutParams? = null
    private var dismissing = false
    private var miniMode = false
    private val mainHandler = Handler(Looper.getMainLooper())

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
        VlueForegroundHelper.start(this, NOTIFICATION_ID, buildNotification())
        activeInstance = this
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_DISMISS -> {
                dismissOverlay()
                return START_NOT_STICKY
            }
            ACTION_CONNECTED -> {
                setOverlayFullscreen(true)
                notifyWebCallState("connected")
                return START_NOT_STICKY
            }
            ACTION_ENDED_KEEP -> {
                setOverlayFullscreen(true)
                notifyWebCallState("ended_keep_overlay")
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
        showOverlay(phone, verified, outgoing, cardJson)
        return START_NOT_STICKY
    }

    private fun showOverlay(phone: String, verified: Boolean, outgoing: Boolean, cardJson: String? = null) {
        removeOverlayImmediate()
        windowManager = getSystemService(WINDOW_SERVICE) as WindowManager
        val container = FrameLayout(this)

        /* 네이티브 빅푸시 — 웹이 비어도 항상 보이도록 (진단·폴백) */
        val banner = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundColor(Color.parseColor("#E60B101B"))
            setPadding(dp(20), dp(28), dp(20), dp(20))
            elevation = dp(8).toFloat()
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
                Gravity.TOP
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
        wv.webViewClient = object : WebViewClient() {
            override fun onPageStarted(view: WebView?, url: String?, favicon: android.graphics.Bitmap?) {
                injectLetteringFlag(view)
            }

            override fun onPageFinished(view: WebView?, url: String?) {
                injectLetteringFlag(view)
            }
        }
        container.addView(
            wv,
            FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT
            )
        )

        val type = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
        } else {
            @Suppress("DEPRECATION")
            WindowManager.LayoutParams.TYPE_PHONE
        }
        val params = WindowManager.LayoutParams(
            WindowManager.LayoutParams.MATCH_PARENT,
            WindowManager.LayoutParams.MATCH_PARENT,
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
            gravity = Gravity.TOP or Gravity.START
            y = 0
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                layoutInDisplayCutoutMode =
                    WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES
            }
        }

        container.alpha = 0f
        container.translationY = -120f
        try {
            windowManager?.addView(container, params)
            LetteringPrefs.setLastCallEvent(this, "overlay_shown:$phone")
        } catch (e: Exception) {
            android.util.Log.e("CallOverlay", "addView failed — overlay permission?", e)
            LetteringPrefs.setLastOverlayError(this, "addView:${e.message}")
            LetteringIncomingNotifier.post(this, phone, outgoing)
            LetteringRingingActivity.launch(this, phone, outgoing)
            stopSelf()
            return
        }
        rootContainer = container
        webView = wv
        layoutParams = params
        ShowcaseProximitySensor.attach(this, wv)

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
            .start()
    }

    private var pendingCardJson: String? = null
    private var currentPhone: String = ""
    private var currentOutgoing: Boolean = false

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
                /* 이미 통화 연결 중이면 쇼케이스 확장을 다시 알림 */
                notifyWebCallState("connected")
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
                miniMode = false
                params.height = WindowManager.LayoutParams.MATCH_PARENT
                params.width = WindowManager.LayoutParams.MATCH_PARENT
                params.x = 0
                params.y = 0
                params.gravity = Gravity.TOP or Gravity.START
                params.flags = params.flags or WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL
                /* 연결 후 Showcase — 네이티브 폴백 배너는 웹 UI에 맡김 */
                nativeBanner?.visibility = android.view.View.GONE
            } else {
                /* Companion Mini Case — 기본 프레임은 최초 진입 시에만. JS session 위치가 곧 이어짐 */
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
                nativeBanner?.visibility = android.view.View.GONE
                params.gravity = Gravity.TOP or Gravity.START
            }
            try {
                wm.updateViewLayout(view, params)
            } catch (_: Exception) {
            }
        }
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
        val container = rootContainer ?: run {
            stopSelf()
            return
        }
        container.animate()
            .alpha(0f)
            .translationY(-100f)
            .setDuration(260)
            .withEndAction {
                removeOverlayImmediate()
                stopSelf()
            }
            .start()
    }

    private fun removeOverlayImmediate() {
        ShowcaseProximitySensor.detach()
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
        webView = null
        miniMode = false
        dismissing = false
    }

    override fun onDestroy() {
        if (activeInstance === this) activeInstance = null
        removeOverlayImmediate()
        super.onDestroy()
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

    companion object {
        const val EXTRA_PHONE = "phone"
        const val EXTRA_VERIFIED = "verified"
        const val EXTRA_OUTGOING = "outgoing"
        const val EXTRA_CARD_JSON = "card_json"
        const val ACTION_DISMISS = "kr.vlue.calloverlay.DISMISS"
        const val ACTION_CONNECTED = "kr.vlue.calloverlay.CONNECTED"
        const val ACTION_ENDED_KEEP = "kr.vlue.calloverlay.ENDED_KEEP"
        const val ACTION_UPDATE_CALL_INFO = "kr.vlue.calloverlay.UPDATE_CALL_INFO"
        private const val CHANNEL_ID = "vlue_lettering_overlay"
        private const val NOTIFICATION_ID = 41001

        @Volatile
        private var activeInstance: CallOverlayService? = null

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
