package kr.vlue.calloverlay

import android.animation.ObjectAnimator
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.graphics.PixelFormat
import android.os.Build
import android.os.IBinder
import android.view.Gravity
import android.view.View
import android.view.WindowManager
import android.view.animation.DecelerateInterpolator
import android.webkit.WebSettings
import android.webkit.WebView
import android.widget.FrameLayout
import androidx.core.app.NotificationCompat

/**
 * SYSTEM_ALERT_WINDOW + WebView 레터링 UI
 * 페이드·슬라이드 인 / 아웃 후 removeView
 */
class CallOverlayService : Service() {
    private var windowManager: WindowManager? = null
    private var rootContainer: FrameLayout? = null
    private var webView: WebView? = null
    private var dismissing = false

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
        startForeground(NOTIFICATION_ID, buildNotification())
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action == ACTION_DISMISS) {
            dismissOverlay()
            return START_NOT_STICKY
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
        val wv = WebView(this)
        LetteringJavascriptBridge.attach(wv, this)
        wv.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            cacheMode = WebSettings.LOAD_NO_CACHE
        }
        wv.setBackgroundColor(0x00000000)
        container.addView(wv, FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT,
            FrameLayout.LayoutParams.WRAP_CONTENT
        ))

        val type = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
        } else {
            @Suppress("DEPRECATION")
            WindowManager.LayoutParams.TYPE_PHONE
        }
        val params = WindowManager.LayoutParams(
            WindowManager.LayoutParams.MATCH_PARENT,
            WindowManager.LayoutParams.WRAP_CONTENT,
            type,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
            PixelFormat.TRANSLUCENT
        ).apply {
            gravity = Gravity.TOP or Gravity.CENTER_HORIZONTAL
            y = 48
        }

        container.alpha = 0f
        container.translationY = -120f
        windowManager?.addView(container, params)
        rootContainer = container
        webView = wv

        wv.loadUrl(VlueLetteringConfig.overlayUrl(phone, verified, outgoing))

        container.animate()
            .alpha(1f)
            .translationY(0f)
            .setDuration(320)
            .setInterpolator(DecelerateInterpolator())
            .start()
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
        webView?.destroy()
        webView = null
        rootContainer?.let { v ->
            try {
                windowManager?.removeView(v)
            } catch (_: Exception) { }
        }
        rootContainer = null
        dismissing = false
    }

    override fun onDestroy() {
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
        private const val CHANNEL_ID = "vlue_lettering_overlay"
        private const val NOTIFICATION_ID = 41001
    }
}
