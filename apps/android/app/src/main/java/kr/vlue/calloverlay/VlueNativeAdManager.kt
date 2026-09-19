package kr.vlue.calloverlay

import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.BitmapDrawable
import android.graphics.drawable.Drawable
import android.graphics.drawable.GradientDrawable
import android.os.Handler
import android.os.Looper
import android.util.Base64
import android.util.Log
import android.view.MotionEvent
import android.view.View
import android.widget.Button
import android.widget.FrameLayout
import android.widget.ImageView
import com.google.android.gms.ads.AdLoader
import com.google.android.gms.ads.AdRequest
import com.google.android.gms.ads.LoadAdError
import com.google.android.gms.ads.VideoController
import com.google.android.gms.ads.VideoOptions
import com.google.android.gms.ads.nativead.MediaView
import com.google.android.gms.ads.nativead.NativeAd
import com.google.android.gms.ads.nativead.NativeAdOptions
import com.google.android.gms.ads.nativead.NativeAdView
import org.json.JSONObject
import java.io.ByteArrayOutputStream
import kotlin.math.roundToInt

/**
 * 홈 클립 = 에셋만 웹.
 * 쇼케이스 = 웹 VLUE UI + NativeAdView.
 * - 이미지: MediaView 숨김(웹 이미지 표시) · CTA만 하단 슬롯
 * - 동영상: MediaView를 미디어 카드 슬롯에만 (전체화면 덮지 않음)
 * 띠배너는 쇼케이스 동안 강제 숨김.
 */
class VlueNativeAdManager(
    private val activity: MainActivity,
    private val host: FrameLayout,
    private val webView: android.webkit.WebView,
) {
    private var nativeAd: NativeAd? = null
    private var loading = false
    private var showcaseAdView: NativeAdView? = null
    private var showcaseMediaView: MediaView? = null
    private var showcaseCta: Button? = null
    private var showcaseHasVideo = false
    private var showcaseUserMuted = false
    private var showcaseVideoController: VideoController? = null
    private var lastStatus: String = "idle"
    private var lastMessage: String = ""
    private var lastCode: Int = -1
    private var lastHeadline: String = ""
    private var lastBody: String = ""
    private var lastAdvertiser: String = ""
    private var lastCta: String = ""
    private var lastMediaUrl: String = ""
    private var lastHasVideo: Boolean = false
    private val mainHandler = Handler(Looper.getMainLooper())
    private var loadTimeoutRunnable: Runnable? = null

    fun statusJson(): String =
        JSONObject()
            .put("status", lastStatus)
            .put("message", lastMessage)
            .put("code", lastCode)
            .put("headline", lastHeadline)
            .put("body", lastBody)
            .put("advertiser", lastAdvertiser)
            .put("ctaLabel", lastCta)
            .put("mediaUrl", lastMediaUrl)
            .put("hasVideoContent", lastHasVideo)
            .put("source", "admob")
            .toString()

    fun show(rectJson: String?) {
        host.visibility = View.GONE
        host.removeAllViews()
        val rect = runCatching { JSONObject(rectJson ?: "{}") }.getOrNull()
        if (nativeAd != null && lastStatus == "loaded") {
            publishAssets("loaded", "cached", 0)
            return
        }
        if (lastStatus == "failed" || lastStatus == "timeout") {
            publishAssets(lastStatus, lastMessage, lastCode)
            return
        }
        if (loading) return
        loading = true
        publishAssets("loading", "AdLoader starting", -1)
        val rawUnit = rect?.optString("unitId")?.trim().orEmpty()
        val unitId =
            when {
                rawUnit.contains("2241692110") -> BuildConfig.ADMOB_NATIVE_ID
                rawUnit.isNotEmpty() -> rawUnit
                else -> BuildConfig.ADMOB_NATIVE_ID
            }
        Log.i(TAG, "loadAd(assets-only) unitId=$unitId")
        scheduleLoadTimeout()
        VlueCallOverlayApp.whenMobileAdsReady {
            activity.runOnUiThread {
                if (!loading || nativeAd != null) return@runOnUiThread
                startAdLoad(unitId)
            }
        }
    }

    fun openShowcase() {
        val ad = nativeAd
        if (ad == null) {
            Log.w(TAG, "openShowcase: no nativeAd")
            return
        }
        suppressBanners(true)
        lastStatus = "showcase_open"
        notifyWeb()
        val detail = statusJson()
        val script =
            """
            (function(){
              try{
                var d=$detail;
                window.__vlueNativeAdStatus=d;
                window.dispatchEvent(new CustomEvent('vlue-open-admob-showcase',{detail:d}));
                window.dispatchEvent(new CustomEvent('vlue-native-ad-status',{detail:d}));
                window.dispatchEvent(new CustomEvent('vlue-hide-all-ads'));
              }catch(e){}
            })();
            """.trimIndent()
        webView.post {
            runCatching { webView.evaluateJavascript(script, null) }
        }
    }

    fun syncShowcaseSlots(rectJson: String?) {
        val ad = nativeAd ?: return
        val root = runCatching { JSONObject(rectJson ?: "{}") }.getOrNull() ?: return
        if (!root.optBoolean("visible", false)) {
            hideShowcaseSlots()
            return
        }
        activity.runOnUiThread {
            suppressBanners(true)
            ensureShowcaseAdView(ad)
            applySlotRects(root)
            bindVideoAudio(ad, root.optBoolean("hasVideoContent", lastHasVideo))
            lastStatus = "showcase_open"
            notifyWeb()
        }
    }

    fun closeShowcaseSlots() {
        activity.runOnUiThread {
            hideShowcaseSlots()
            suppressBanners(false)
        }
    }

    fun toggleShowcaseAudio() {
        activity.runOnUiThread {
            if (!showcaseHasVideo) return@runOnUiThread
            showcaseUserMuted = !showcaseUserMuted
            runCatching { showcaseVideoController?.mute(showcaseUserMuted) }
        }
    }

    fun retry(rectJson: String?) {
        cancelLoadTimeout()
        loading = false
        lastStatus = "idle"
        lastMessage = ""
        lastCode = -1
        clearAssetFields()
        hideShowcaseSlots()
        suppressBanners(false)
        nativeAd?.destroy()
        nativeAd = null
        host.removeAllViews()
        host.visibility = View.GONE
        show(rectJson)
    }

    private fun suppressBanners(on: Boolean) {
        runCatching {
            activity.bannerAds().setSuppressed(on)
            if (on) activity.bannerAds().hide(null)
        }
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
                    hideShowcaseSlots()
                    nativeAd?.destroy()
                    nativeAd = ad
                    captureAssets(ad)
                    host.visibility = View.GONE
                    host.removeAllViews()
                    publishAssets("loaded", "assets ready", 0)
                }
                .withNativeAdOptions(
                    NativeAdOptions.Builder()
                        .setMediaAspectRatio(NativeAdOptions.NATIVE_MEDIA_ASPECT_RATIO_PORTRAIT)
                        .setVideoOptions(
                            VideoOptions.Builder()
                                .setCustomControlsRequested(true)
                                .setStartMuted(false)
                                .build(),
                        )
                        .build(),
                )
                .withAdListener(
                    object : com.google.android.gms.ads.AdListener() {
                        override fun onAdFailedToLoad(error: LoadAdError) {
                            cancelLoadTimeout()
                            loading = false
                            val msg = "Error Code: ${error.code} - ${error.message}"
                            Log.w(TAG, "onAdFailedToLoad $msg")
                            host.visibility = View.GONE
                            host.removeAllViews()
                            clearAssetFields()
                            publishAssets("failed", msg, error.code)
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
            clearAssetFields()
            publishAssets("failed", msg, -1)
        }
    }

    private fun captureAssets(ad: NativeAd) {
        lastHeadline = ad.headline.orEmpty()
        lastBody = ad.body.orEmpty()
        lastAdvertiser = ad.advertiser?.takeIf { it.isNotBlank() } ?: "스폰서"
        lastCta = ad.callToAction?.takeIf { it.isNotBlank() } ?: "방문하기"
        lastMediaUrl = extractMediaUrl(ad)
        val media = ad.mediaContent
        lastHasVideo =
            media?.hasVideoContent() == true || media?.videoController?.hasVideoContent() == true
    }

    private fun clearAssetFields() {
        lastHeadline = ""
        lastBody = ""
        lastAdvertiser = ""
        lastCta = ""
        lastMediaUrl = ""
        lastHasVideo = false
    }

    private fun extractMediaUrl(ad: NativeAd): String {
        ad.images?.firstOrNull()?.uri?.toString()?.takeIf { it.isNotBlank() }?.let { return it }
        ad.images?.firstOrNull()?.drawable?.let { d ->
            drawableToDataUri(d)?.let { return it }
        }
        ad.mediaContent?.let { mc ->
            runCatching {
                val main = mc.javaClass.methods.firstOrNull { it.name == "getMainImage" }?.invoke(mc) as? Drawable
                drawableToDataUri(main)
            }.getOrNull()?.let { return it }
        }
        ad.icon?.uri?.toString()?.takeIf { it.isNotBlank() }?.let { return it }
        ad.icon?.drawable?.let { d -> drawableToDataUri(d)?.let { return it } }
        return ""
    }

    private fun drawableToDataUri(drawable: Drawable?): String? {
        if (drawable == null) return null
        return runCatching {
            val bitmap =
                when (drawable) {
                    is BitmapDrawable -> drawable.bitmap
                    else -> {
                        val w = drawable.intrinsicWidth.coerceAtLeast(1).coerceAtMost(720)
                        val h = drawable.intrinsicHeight.coerceAtLeast(1).coerceAtMost(1280)
                        val bmp = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888)
                        val canvas = Canvas(bmp)
                        drawable.setBounds(0, 0, canvas.width, canvas.height)
                        drawable.draw(canvas)
                        bmp
                    }
                } ?: return null
            val out = ByteArrayOutputStream()
            bitmap.compress(Bitmap.CompressFormat.JPEG, 72, out)
            "data:image/jpeg;base64," + Base64.encodeToString(out.toByteArray(), Base64.NO_WRAP)
        }.getOrNull()
    }

    private fun ensureShowcaseAdView(ad: NativeAd) {
        if (showcaseAdView != null) {
            host.visibility = View.VISIBLE
            return
        }
        val adView = NativeAdView(activity)
        val media =
            MediaView(activity).apply {
                setImageScaleType(ImageView.ScaleType.CENTER_CROP)
                if (ad.mediaContent != null) mediaContent = ad.mediaContent
                /* 좌표 확정 전 절대 보이지 않음 — 전체화면 점유 방지 */
                visibility = View.GONE
            }
        val cta =
            Button(activity).apply {
                text = ad.callToAction ?: lastCta.ifBlank { "방문하기" }
                textSize = 16f
                isAllCaps = false
                setTypeface(typeface, Typeface.BOLD)
                setTextColor(Color.WHITE)
                background =
                    GradientDrawable().apply {
                        setColor(Color.rgb(37, 99, 235))
                        cornerRadius = dp(16).toFloat()
                    }
                setPadding(dp(12), dp(12), dp(12), dp(12))
                visibility = View.GONE
            }

        adView.addView(media, FrameLayout.LayoutParams(1, 1))
        adView.addView(cta, FrameLayout.LayoutParams(1, 1))
        adView.mediaView = media
        adView.callToActionView = cta
        adView.setNativeAd(ad)

        val passThrough =
            object : FrameLayout(activity) {
                override fun dispatchTouchEvent(ev: MotionEvent): Boolean {
                    val targets = listOfNotNull(showcaseMediaView, showcaseCta)
                    for (child in targets) {
                        if (child.visibility != View.VISIBLE) continue
                        if (
                            ev.x >= child.left &&
                            ev.x < child.right &&
                            ev.y >= child.top &&
                            ev.y < child.bottom
                        ) {
                            return super.dispatchTouchEvent(ev)
                        }
                    }
                    return false
                }
            }
        passThrough.addView(
            adView,
            FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT,
            ),
        )

        host.removeAllViews()
        host.addView(
            passThrough,
            FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT,
            ),
        )
        host.setBackgroundColor(Color.TRANSPARENT)
        host.visibility = View.VISIBLE
        host.isClickable = false
        host.isFocusable = false
        media.isClickable = true
        cta.isClickable = true

        showcaseAdView = adView
        showcaseMediaView = media
        showcaseCta = cta
    }

    private fun applySlotRects(root: JSONObject) {
        val media = showcaseMediaView ?: return
        val cta = showcaseCta ?: return
        val mediaRect = root.optJSONObject("media") ?: return
        val ctaRect = root.optJSONObject("cta") ?: return
        val viewportWidth = root.optDouble("viewportWidth", 0.0)
        val viewportHeight = root.optDouble("viewportHeight", 0.0)
        if (viewportWidth <= 0.0 || viewportHeight <= 0.0 || webView.width <= 0 || webView.height <= 0) {
            return
        }
        val sx = webView.width / viewportWidth
        val sy = webView.height / viewportHeight
        val webLeft = webView.x
        val webTop = webView.y
        val hasVideo = root.optBoolean("hasVideoContent", lastHasVideo)

        fun place(child: View, left: Double, top: Double, width: Double, height: Double) {
            val lp =
                FrameLayout.LayoutParams(
                    (width * sx).roundToInt().coerceAtLeast(1),
                    (height * sy).roundToInt().coerceAtLeast(1),
                ).apply {
                    leftMargin = (webLeft + left * sx).roundToInt()
                    topMargin = (webTop + top * sy).roundToInt()
                }
            child.layoutParams = lp
        }

        /* CTA — 댓글 시트 등에서 visible:false 로 일시 숨김 */
        place(
            cta,
            ctaRect.optDouble("left"),
            ctaRect.optDouble("top"),
            ctaRect.optDouble("width"),
            ctaRect.optDouble("height"),
        )
        val label = ctaRect.optString("label").trim()
        if (label.isNotEmpty()) cta.text = label
        cta.visibility =
            if (ctaRect.optBoolean("visible", true)) View.VISIBLE else View.GONE

        if (hasVideo) {
            /* 동영상만 MediaView — 우측·하단 inset 으로 소셜/프로필 바 확보 */
            val insetR = 56.0
            val insetB = 72.0
            val mw = (mediaRect.optDouble("width") - insetR).coerceAtLeast(80.0)
            val mh = (mediaRect.optDouble("height") - insetB).coerceAtLeast(80.0)
            place(media, mediaRect.optDouble("left"), mediaRect.optDouble("top"), mw, mh)
            media.visibility = View.VISIBLE
        } else {
            /* 이미지: 웹이 미디어 표시 — MediaView 는 등록만(1px 오프스크린) */
            place(media, -8.0, -8.0, 1.0, 1.0)
            media.visibility = View.INVISIBLE
        }

        showcaseAdView?.layoutParams =
            FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT,
            )
        host.bringToFront()
        host.visibility = View.VISIBLE
    }

    private fun bindVideoAudio(ad: NativeAd, hasVideoHint: Boolean) {
        val media = ad.mediaContent
        val vc = media?.videoController
        val hasVideo =
            hasVideoHint ||
                media?.hasVideoContent() == true ||
                vc?.hasVideoContent() == true
        showcaseHasVideo = hasVideo
        showcaseVideoController = vc
        showcaseUserMuted = false
        if (hasVideo) {
            runCatching { vc?.mute(false) }
        }
    }

    private fun hideShowcaseSlots() {
        runCatching { showcaseAdView?.removeAllViews() }
        showcaseAdView = null
        showcaseMediaView = null
        showcaseCta = null
        showcaseVideoController = null
        showcaseHasVideo = false
        showcaseUserMuted = false
        host.removeAllViews()
        host.visibility = View.GONE
        if (lastStatus == "showcase_open") {
            lastStatus = "loaded"
            notifyWeb()
        }
    }

    private fun scheduleLoadTimeout() {
        cancelLoadTimeout()
        val r =
            Runnable {
                if (!loading || nativeAd != null) return@Runnable
                loading = false
                clearAssetFields()
                publishAssets("timeout", "타임아웃: 광고 로드 실패", 408)
            }
        loadTimeoutRunnable = r
        mainHandler.postDelayed(r, LOAD_TIMEOUT_MS)
    }

    private fun cancelLoadTimeout() {
        loadTimeoutRunnable?.let { mainHandler.removeCallbacks(it) }
        loadTimeoutRunnable = null
    }

    fun hide() {
        host.visibility = View.GONE
        host.removeAllViews()
        hideShowcaseSlots()
        suppressBanners(false)
    }

    fun destroy() {
        cancelLoadTimeout()
        hideShowcaseSlots()
        suppressBanners(false)
        nativeAd?.destroy()
        nativeAd = null
        host.removeAllViews()
    }

    private fun publishAssets(status: String, message: String, code: Int) {
        lastStatus = status
        lastMessage = message
        lastCode = code
        notifyWeb()
    }

    private fun notifyWeb() {
        val detail = statusJson()
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

    private fun dp(value: Int): Int {
        val density = activity.resources.displayMetrics.density
        return (value * density).roundToInt()
    }

    companion object {
        private const val TAG = "VlueNativeAd"
        private const val LOAD_TIMEOUT_MS = 12_000L
    }
}
