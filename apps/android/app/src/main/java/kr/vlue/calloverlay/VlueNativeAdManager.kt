package kr.vlue.calloverlay

import android.app.Dialog
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.view.Window
import android.view.WindowManager
import android.widget.Button
import android.widget.FrameLayout
import android.widget.ImageButton
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView
import com.google.android.gms.ads.AdLoader
import com.google.android.gms.ads.AdRequest
import com.google.android.gms.ads.LoadAdError
import com.google.android.gms.ads.nativead.AdChoicesView
import com.google.android.gms.ads.nativead.MediaView
import com.google.android.gms.ads.nativead.NativeAd
import com.google.android.gms.ads.nativead.NativeAdOptions
import com.google.android.gms.ads.nativead.NativeAdView
import org.json.JSONObject
import kotlin.math.roundToInt

/**
 * 홈 「추천 스폰서」 — AdMob Native.
 * mediaContent(고화질 미디어)를 썸네일 히어로로 쓰고, 탭 시 전체화면 쇼케이스 후 CTA로 랜딩.
 */
class VlueNativeAdManager(
    private val activity: MainActivity,
    private val host: FrameLayout,
    private val webView: android.webkit.WebView,
) {
    private var nativeAd: NativeAd? = null
    private var loading = false
    private var pendingRect: JSONObject? = null
    private var showcaseDialog: Dialog? = null
    private var lastStatus: String = "idle"
    private var lastMessage: String = ""
    private var lastCode: Int = -1
    private val mainHandler = Handler(Looper.getMainLooper())
    private var loadTimeoutRunnable: Runnable? = null

    fun statusJson(): String =
        JSONObject()
            .put("status", lastStatus)
            .put("message", lastMessage)
            .put("code", lastCode)
            .toString()

    fun show(rectJson: String?) {
        val rect = runCatching { JSONObject(rectJson ?: "{}") }.getOrNull() ?: return
        pendingRect = rect
        if (!rect.optBoolean("visible", false)) {
            host.visibility = View.GONE
            return
        }
        applyRect(rect)
        if (nativeAd != null) {
            publishStatus("loaded", "ok", 0)
            return
        }
        /* 실패/타임아웃: 네이티브 오버레이는 숨기고 웹 슬롯에만 에러 표시 (DCC 침범 방지) */
        if (lastStatus == "failed" || lastStatus == "timeout") {
            host.visibility = View.GONE
            host.removeAllViews()
            notifyWeb(lastStatus, lastMessage, lastCode)
            return
        }
        if (loading) return
        loading = true
        publishStatus("loading", "AdLoader starting", -1)
        val unitId = rect.optString("unitId").trim().ifEmpty { BuildConfig.ADMOB_NATIVE_ID }
        Log.i(TAG, "loadAd unitId=$unitId adsReady=${VlueCallOverlayApp.isMobileAdsInitialized()}")
        scheduleLoadTimeout()
        VlueCallOverlayApp.whenMobileAdsReady {
            activity.runOnUiThread {
                if (!loading || nativeAd != null) return@runOnUiThread
                startAdLoad(unitId)
            }
        }
    }

    /** 웹 타임아웃/재시도용 — 실패 상태 초기화 후 다시 로드 */
    fun retry(rectJson: String?) {
        cancelLoadTimeout()
        loading = false
        lastStatus = "idle"
        lastMessage = ""
        lastCode = -1
        nativeAd?.destroy()
        nativeAd = null
        host.removeAllViews()
        show(rectJson)
    }

    private fun startAdLoad(unitId: String) {
        try {
            AdLoader.Builder(activity, unitId)
                .forNativeAd { ad ->
                    if (activity.isDestroyed || activity.isFinishing) {
                        ad.destroy()
                        return@forNativeAd
                    }
                    cancelLoadTimeout()
                    loading = false
                    nativeAd?.destroy()
                    nativeAd = ad
                    renderThumb(ad)
                    pendingRect?.let(::applyRect)
                    publishStatus("loaded", "native ad bound", 0)
                }
                .withNativeAdOptions(
                    NativeAdOptions.Builder()
                        .setMediaAspectRatio(NativeAdOptions.NATIVE_MEDIA_ASPECT_RATIO_PORTRAIT)
                        .build(),
                )
                .withAdListener(
                    object : com.google.android.gms.ads.AdListener() {
                        override fun onAdFailedToLoad(error: LoadAdError) {
                            cancelLoadTimeout()
                            loading = false
                            val msg = "Error Code: ${error.code} - ${error.message}"
                            Log.w(TAG, "onAdFailedToLoad $msg domain=${error.domain} cause=${error.cause}")
                            /* DCC·쇼케이스 위를 덮지 않음 — 웹 썸네일 슬롯에만 메시지 */
                            host.visibility = View.GONE
                            host.removeAllViews()
                            publishStatus("failed", msg, error.code)
                        }
                    },
                )
                .build()
                .loadAd(AdRequest.Builder().build())
        } catch (e: Exception) {
            cancelLoadTimeout()
            loading = false
            val msg = "Error Code: -1 - ${e.message ?: "AdLoader exception"}"
            Log.e(TAG, "startAdLoad exception", e)
            host.visibility = View.GONE
            host.removeAllViews()
            publishStatus("failed", msg, -1)
        }
    }

    private fun scheduleLoadTimeout() {
        cancelLoadTimeout()
        val r =
            Runnable {
                if (!loading || nativeAd != null) return@Runnable
                loading = false
                val msg = "타임아웃: 광고 로드 실패"
                Log.w(TAG, msg)
                host.visibility = View.GONE
                host.removeAllViews()
                publishStatus("timeout", msg, 408)
            }
        loadTimeoutRunnable = r
        mainHandler.postDelayed(r, LOAD_TIMEOUT_MS)
    }

    private fun cancelLoadTimeout() {
        loadTimeoutRunnable?.let { mainHandler.removeCallbacks(it) }
        loadTimeoutRunnable = null
    }

    fun hide() {
        pendingRect = null
        host.visibility = View.GONE
        host.removeAllViews()
        closeShowcase()
    }

    fun destroy() {
        cancelLoadTimeout()
        closeShowcase()
        nativeAd?.destroy()
        nativeAd = null
        host.removeAllViews()
    }

    private fun publishStatus(status: String, message: String, code: Int) {
        lastStatus = status
        lastMessage = message
        lastCode = code
        notifyWeb(status, message, code)
    }

    private fun notifyWeb(status: String, message: String? = null, code: Int = -1) {
        val detail =
            JSONObject()
                .put("status", status)
                .put("message", message ?: "")
                .put("code", code)
                .toString()
        /* window 전역 + CustomEvent — WebView에서 이벤트 유실 대비 폴링용 */
        val script =
            """
            (function(){
              try{
                var d=$detail;
                window.__vlueNativeAdStatus=d;
                window.dispatchEvent(new CustomEvent('vlue-native-ad-status',{detail:d}));
              }catch(e){}
            })();
            """.trimIndent()
        webView.post {
            runCatching { webView.evaluateJavascript(script, null) }
        }
    }

    private fun applyRect(rect: JSONObject) {
        if (!rect.optBoolean("visible", false)) {
            host.visibility = View.GONE
            return
        }
        val viewportWidth = rect.optDouble("viewportWidth", 0.0)
        val viewportHeight = rect.optDouble("viewportHeight", 0.0)
        if (viewportWidth <= 0.0 || viewportHeight <= 0.0 || webView.width <= 0 || webView.height <= 0) return
        val sx = webView.width / viewportWidth
        val sy = webView.height / viewportHeight
        val params =
            FrameLayout.LayoutParams(
                (rect.optDouble("width") * sx).roundToInt().coerceAtLeast(1),
                (rect.optDouble("height") * sy).roundToInt().coerceAtLeast(1),
            ).apply {
                leftMargin = (webView.x + rect.optDouble("left") * sx).roundToInt()
                topMargin = (webView.y + rect.optDouble("top") * sy).roundToInt()
            }
        host.layoutParams = params
        host.visibility = if (nativeAd != null) View.VISIBLE else View.GONE
    }

    private fun dp(value: Int): Int {
        val density = activity.resources.displayMetrics.density
        return (value * density).roundToInt()
    }

    companion object {
        private const val TAG = "VlueNativeAd"
        private const val LOAD_TIMEOUT_MS = 12_000L
    }

    /** 홈 썸네일 — mediaContent 가득 채움 (icon 단독 금지) */
    private fun renderThumb(ad: NativeAd) {
        val adView = NativeAdView(activity)
        val root =
            FrameLayout(activity).apply {
                background =
                    GradientDrawable().apply {
                        setColor(Color.rgb(15, 23, 42))
                        cornerRadius = dp(18).toFloat()
                    }
                clipToOutline = true
            }

        val media = MediaView(activity).apply {
            setImageScaleType(ImageView.ScaleType.CENTER_CROP)
        }
        val hasMedia = ad.mediaContent != null || !ad.images.isNullOrEmpty()
        if (ad.mediaContent != null) {
            media.mediaContent = ad.mediaContent
        }

        val gradient =
            View(activity).apply {
                background =
                    GradientDrawable(
                        GradientDrawable.Orientation.BOTTOM_TOP,
                        intArrayOf(Color.argb(210, 0, 0, 0), Color.TRANSPARENT),
                    )
            }

        val adBadge =
            TextView(activity).apply {
                text = "AD"
                textSize = 9f
                setTextColor(Color.WHITE)
                setTypeface(typeface, Typeface.BOLD)
                setPadding(dp(6), dp(3), dp(6), dp(3))
                background =
                    GradientDrawable().apply {
                        setColor(Color.argb(160, 15, 23, 42))
                        cornerRadius = dp(4).toFloat()
                    }
            }

        val advertiser =
            TextView(activity).apply {
                text = ad.advertiser?.takeIf { it.isNotBlank() } ?: "스폰서"
                textSize = 11f
                setTextColor(Color.rgb(96, 165, 250))
                setTypeface(typeface, Typeface.BOLD)
                maxLines = 1
            }
        val headline =
            TextView(activity).apply {
                text = ad.headline.orEmpty()
                textSize = 13f
                setTextColor(Color.WHITE)
                setTypeface(typeface, Typeface.BOLD)
                maxLines = 2
            }
        val body =
            TextView(activity).apply {
                text = ad.body.orEmpty()
                textSize = 10f
                setTextColor(Color.rgb(203, 213, 225))
                maxLines = 1
            }

        val nameRow =
            LinearLayout(activity).apply {
                orientation = LinearLayout.HORIZONTAL
                gravity = Gravity.CENTER_VERTICAL
                addView(advertiser, LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f))
                addView(
                    adBadge,
                    LinearLayout.LayoutParams(LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT).apply {
                        marginStart = dp(6)
                    },
                )
            }

        val textCol =
            LinearLayout(activity).apply {
                orientation = LinearLayout.VERTICAL
                setPadding(dp(10), 0, dp(10), dp(10))
                addView(nameRow)
                addView(
                    headline,
                    LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT).apply {
                        topMargin = dp(4)
                    },
                )
                if (body.text.isNotBlank()) {
                    addView(
                        body,
                        LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT).apply {
                            topMargin = dp(2)
                        },
                    )
                }
            }

        /* 숨김 CTA — 정책상 등록 유지, 노출은 전체화면 쇼케이스 */
        val hiddenCta =
            Button(activity).apply {
                text = ad.callToAction ?: "자세히 보기"
                visibility = View.GONE
            }

        val icon =
            ImageView(activity).apply {
                visibility = View.GONE
                layoutParams = FrameLayout.LayoutParams(1, 1)
                ad.icon?.drawable?.let { setImageDrawable(it) }
            }

        val adChoices =
            AdChoicesView(activity).apply {
                layoutParams =
                    FrameLayout.LayoutParams(dp(22), dp(22)).apply {
                        gravity = Gravity.TOP or Gravity.START
                        setMargins(dp(6), dp(6), 0, 0)
                    }
            }

        root.addView(
            media,
            FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT),
        )
        if (!hasMedia && ad.icon?.drawable != null) {
            val fallbackIcon =
                ImageView(activity).apply {
                    scaleType = ImageView.ScaleType.FIT_CENTER
                    setImageDrawable(ad.icon?.drawable)
                    setPadding(dp(48), dp(48), dp(48), dp(48))
                }
            root.addView(
                fallbackIcon,
                FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT),
            )
        }
        root.addView(
            gradient,
            FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, dp(110)).apply {
                gravity = Gravity.BOTTOM
            },
        )
        root.addView(
            textCol,
            FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.WRAP_CONTENT).apply {
                gravity = Gravity.BOTTOM
            },
        )
        root.addView(hiddenCta)
        root.addView(icon)

        /* 탭 → 외부 브라우저 대신 전체화면 쇼케이스 (AdChoices 영역은 제외) */
        val tapCatcher =
            View(activity).apply {
                setOnClickListener { openShowcase(ad) }
                isClickable = true
                isFocusable = true
            }
        root.addView(
            tapCatcher,
            FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT),
        )
        root.addView(adChoices)

        adView.addView(
            root,
            FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT),
        )
        adView.mediaView = media
        adView.headlineView = headline
        adView.bodyView = body
        adView.callToActionView = hiddenCta
        adView.iconView = icon
        adView.adChoicesView = adChoices
        adView.setNativeAd(ad)

        host.removeAllViews()
        host.addView(adView)
        pendingRect?.let(::applyRect)
    }

    /** 전체화면 쇼케이스 — 동일 NativeAd, CTA만 랜딩 */
    private fun openShowcase(ad: NativeAd) {
        closeShowcase()
        val dialog =
            Dialog(activity, android.R.style.Theme_Black_NoTitleBar_Fullscreen).apply {
                requestWindowFeature(Window.FEATURE_NO_TITLE)
                setCancelable(true)
                setOnDismissListener { showcaseDialog = null }
            }
        val adView = NativeAdView(activity)
        val root =
            FrameLayout(activity).apply {
                setBackgroundColor(Color.BLACK)
            }

        val media = MediaView(activity).apply {
            setImageScaleType(ImageView.ScaleType.CENTER_CROP)
            if (ad.mediaContent != null) mediaContent = ad.mediaContent
        }
        root.addView(
            media,
            FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT),
        )

        val topBar =
            LinearLayout(activity).apply {
                orientation = LinearLayout.HORIZONTAL
                gravity = Gravity.CENTER_VERTICAL
                setPadding(dp(12), dp(14), dp(12), dp(10))
                setBackgroundColor(Color.argb(120, 0, 0, 0))
            }
        val adLabel =
            TextView(activity).apply {
                text = "[광고] AD"
                textSize = 12f
                setTextColor(Color.WHITE)
                setTypeface(typeface, Typeface.BOLD)
            }
        val spacer = View(activity)
        val close =
            ImageButton(activity).apply {
                setImageResource(android.R.drawable.ic_menu_close_clear_cancel)
                setBackgroundColor(Color.TRANSPARENT)
                setColorFilter(Color.WHITE)
                setOnClickListener { dialog.dismiss() }
                contentDescription = "닫기"
            }
        topBar.addView(adLabel)
        topBar.addView(spacer, LinearLayout.LayoutParams(0, 1, 1f))
        topBar.addView(close, LinearLayout.LayoutParams(dp(40), dp(40)))
        root.addView(
            topBar,
            FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.WRAP_CONTENT).apply {
                gravity = Gravity.TOP
            },
        )

        val bottom =
            LinearLayout(activity).apply {
                orientation = LinearLayout.VERTICAL
                setPadding(dp(16), dp(18), dp(16), dp(28))
                background =
                    GradientDrawable(
                        GradientDrawable.Orientation.BOTTOM_TOP,
                        intArrayOf(Color.argb(230, 0, 0, 0), Color.TRANSPARENT),
                    )
            }
        val headline =
            TextView(activity).apply {
                text = ad.headline.orEmpty()
                textSize = 20f
                setTextColor(Color.WHITE)
                setTypeface(typeface, Typeface.BOLD)
                maxLines = 3
            }
        val body =
            TextView(activity).apply {
                text = ad.body.orEmpty()
                textSize = 13f
                setTextColor(Color.rgb(226, 232, 240))
                maxLines = 4
            }
        val cta =
            Button(activity).apply {
                text = ad.callToAction ?: "방문하기"
                textSize = 15f
                isAllCaps = false
                setTextColor(Color.WHITE)
                background =
                    GradientDrawable().apply {
                        setColor(Color.rgb(37, 99, 235))
                        cornerRadius = dp(14).toFloat()
                    }
                setPadding(dp(18), dp(14), dp(18), dp(14))
            }
        bottom.addView(headline)
        if (body.text.isNotBlank()) {
            bottom.addView(
                body,
                LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT).apply {
                    topMargin = dp(8)
                },
            )
        }
        bottom.addView(
            cta,
            LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT).apply {
                topMargin = dp(14)
            },
        )
        root.addView(
            bottom,
            FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.WRAP_CONTENT).apply {
                gravity = Gravity.BOTTOM
            },
        )

        val icon =
            ImageView(activity).apply {
                visibility = View.GONE
                layoutParams = FrameLayout.LayoutParams(1, 1)
            }
        val adChoices =
            AdChoicesView(activity).apply {
                layoutParams =
                    FrameLayout.LayoutParams(dp(24), dp(24)).apply {
                        gravity = Gravity.TOP or Gravity.START
                        setMargins(dp(10), dp(52), 0, 0)
                    }
            }
        root.addView(adChoices)

        adView.addView(
            root,
            FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT),
        )
        adView.mediaView = media
        adView.headlineView = headline
        adView.bodyView = body
        adView.callToActionView = cta
        adView.iconView = icon
        adView.adChoicesView = adChoices
        adView.setNativeAd(ad)

        dialog.setContentView(
            adView,
            ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT),
        )
        dialog.window?.setLayout(WindowManager.LayoutParams.MATCH_PARENT, WindowManager.LayoutParams.MATCH_PARENT)
        showcaseDialog = dialog
        dialog.show()
        notifyWeb("showcase_open", "showcase dialog open", 0)
    }

    private fun closeShowcase() {
        runCatching { showcaseDialog?.dismiss() }
        showcaseDialog = null
    }
}
