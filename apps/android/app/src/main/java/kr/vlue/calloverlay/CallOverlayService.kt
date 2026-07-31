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
    private var webView: WebView? = null
    private var layoutParams: WindowManager.LayoutParams? = null
    private var dismissing = false
    private val mainHandler = Handler(Looper.getMainLooper())

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
        startForeground(NOTIFICATION_ID, buildNotification())
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
        }
        val phone = intent?.getStringExtra(EXTRA_PHONE).orEmpty()
        val verified = intent?.getBooleanExtra(EXTRA_VERIFIED, false) ?: false
        val outgoing = intent?.getBooleanExtra(EXTRA_OUTGOING, false) ?: false
        showOverlay(phone, verified, outgoing)
        return START_NOT_STICKY
    }

    private fun showOverlay(phone: String, verified: Boolean, outgoing: Boolean) {
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
        }
        val phoneTv = TextView(this).apply {
            text = if (phone.isBlank() || phone == "unknown") "번호 확인 중…" else phone
            setTextColor(Color.parseColor("#E2E8F0"))
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 20f)
            typeface = Typeface.DEFAULT_BOLD
            setPadding(0, dp(6), 0, 0)
        }
        val hint = TextView(this).apply {
            text = if (verified) "VLUE 인증 · 쇼케이스 불러오는 중" else "쇼케이스 불러오는 중…"
            setTextColor(Color.parseColor("#94A3B8"))
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 12f)
            setPadding(0, dp(4), 0, 0)
        }
        banner.addView(title)
        banner.addView(phoneTv)
        banner.addView(hint)
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
                WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL,
            PixelFormat.TRANSLUCENT
        ).apply {
            gravity = Gravity.TOP or Gravity.START
            y = 0
        }

        container.alpha = 0f
        container.translationY = -120f
        try {
            windowManager?.addView(container, params)
        } catch (e: Exception) {
            android.util.Log.e("CallOverlay", "addView failed — overlay permission?", e)
            stopSelf()
            return
        }
        rootContainer = container
        webView = wv
        layoutParams = params
        ShowcaseProximitySensor.attach(this, wv)

        wv.loadUrl(VlueLetteringConfig.overlayUrl(phone, verified, outgoing))

        container.animate()
            .alpha(1f)
            .translationY(0f)
            .setDuration(320)
            .setInterpolator(DecelerateInterpolator())
            .start()
    }

    private fun injectLetteringFlag(view: WebView?) {
        view?.evaluateJavascript(
            "try{localStorage.setItem('vlue_lettering_enabled','1');" +
                "window.dispatchEvent(new CustomEvent('vlue-lettering-settings-changed',{detail:{enabled:true}}));" +
                "}catch(e){}",
            null
        )
    }

    private fun dp(v: Int): Int =
        TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, v.toFloat(), resources.displayMetrics).toInt()

    fun setOverlayFullscreen(fullscreen: Boolean) {
        mainHandler.post {
            val wm = windowManager ?: return@post
            val view = rootContainer ?: return@post
            val params = layoutParams ?: return@post
            if (fullscreen) {
                params.height = WindowManager.LayoutParams.MATCH_PARENT
                params.width = WindowManager.LayoutParams.MATCH_PARENT
                params.y = 0
                params.gravity = Gravity.TOP or Gravity.START
                params.flags = params.flags or WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL
            } else {
                params.height = WindowManager.LayoutParams.WRAP_CONTENT
                params.width = WindowManager.LayoutParams.MATCH_PARENT
                params.y = 48
                params.gravity = Gravity.TOP or Gravity.CENTER_HORIZONTAL
            }
            try {
                wm.updateViewLayout(view, params)
            } catch (_: Exception) {
            }
        }
    }

    fun notifyWebCallState(state: String) {
        mainHandler.post {
            val js =
                "try{window.VlueLettering&&window.VlueLettering.onNativeCallState&&window.VlueLettering.onNativeCallState('${state}');" +
                    "window.dispatchEvent(new CustomEvent('vlue-native-call-state',{detail:{callState:'${state}'}}));}catch(e){}"
            webView?.evaluateJavascript(js, null)
        }
    }

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
        private const val CHANNEL_ID = "vlue_lettering_overlay"
        private const val NOTIFICATION_ID = 41001

        @Volatile
        private var activeInstance: CallOverlayService? = null

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
