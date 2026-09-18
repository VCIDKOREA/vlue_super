package kr.vlue.calloverlay

import android.app.Dialog
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
import java.io.ByteArrayOutputStream
import kotlin.math.roundToInt

/**
 * 홈 클립 = 커스텀 UI(에셋만 전달). NativeAdView는 쇼케이스 오버레이에서만.
 * 1차 탭 → openShowcase / 2차 CTA → 광고주 랜딩.
 */
class VlueNativeAdManager(
    private val activity: MainActivity,
    private val host: FrameLayout,
    private val webView: android.webkit.WebView,
) {
    private var nativeAd: NativeAd? = null
    private var loading = false
    private var showcaseDialog: Dialog? = null
    private var lastStatus: String = "idle"
    private var lastMessage: String = ""
    private var lastCode: Int = -1
    private var lastHeadline: String = ""
    private var lastBody: String = ""
    private var lastAdvertiser: String = ""
    private var lastCta: String = ""
    private var lastMediaUrl: String = ""
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
            .put("source", "admob")
            .toString()

    /** 홈 오버레이 없이 에셋만 로드 → 웹 커스텀 클립 렌더 */
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
        activity.runOnUiThread { showShowcaseDialog(ad) }
    }

    fun retry(rectJson: String?) {
        cancelLoadTimeout()
        loading = false
        lastStatus = "idle"
        lastMessage = ""
        lastCode = -1
        lastHeadline = ""
        lastBody = ""
        lastAdvertiser = ""
        lastCta = ""
        lastMediaUrl = ""
        nativeAd?.destroy()
        nativeAd = null
        host.removeAllViews()
        host.visibility = View.GONE
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
                    captureAssets(ad)
                    host.visibility = View.GONE
                    host.removeAllViews()
                    publishAssets("loaded", "assets ready", 0)
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
    }

    private fun clearAssetFields() {
        lastHeadline = ""
        lastBody = ""
        lastAdvertiser = ""
        lastCta = ""
        lastMediaUrl = ""
    }

    /** mediaContent/images 우선 — 웹 클립용 URL 또는 data URI */
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

    private fun scheduleLoadTimeout() {
        cancelLoadTimeout()
        val r =
            Runnable {
                if (!loading || nativeAd != null) return@Runnable
                loading = false
                val msg = "타임아웃: 광고 로드 실패"
                clearAssetFields()
                publishAssets("timeout", msg, 408)
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
        closeShowcase()
    }

    fun destroy() {
        cancelLoadTimeout()
        closeShowcase()
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

    /** 전체화면 쇼케이스 — VLUE 표준 쇼케이스 UI + NativeAdView 매핑 유지 */
    private fun showShowcaseDialog(ad: NativeAd) {
        closeShowcase()
        val dialog =
            Dialog(activity, android.R.style.Theme_Black_NoTitleBar_Fullscreen).apply {
                requestWindowFeature(Window.FEATURE_NO_TITLE)
                setCancelable(true)
                setOnDismissListener {
                    showcaseDialog = null
                    lastStatus = "loaded"
                    notifyWeb()
                }
            }
        val adView = NativeAdView(activity)
        val root =
            FrameLayout(activity).apply {
                setBackgroundColor(Color.BLACK)
            }

        /* 풀블리드 미디어 */
        val media =
            MediaView(activity).apply {
                setImageScaleType(ImageView.ScaleType.CENTER_CROP)
                if (ad.mediaContent != null) mediaContent = ad.mediaContent
            }
        root.addView(
            media,
            FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT),
        )

        /* 상단 그라데이션 (숏폼 헤더 가독성) */
        val topFade =
            View(activity).apply {
                background =
                    GradientDrawable(
                        GradientDrawable.Orientation.TOP_BOTTOM,
                        intArrayOf(Color.argb(180, 0, 0, 0), Color.TRANSPARENT),
                    )
            }
        root.addView(
            topFade,
            FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, dp(120)).apply {
                gravity = Gravity.TOP
            },
        )

        /* —— 상단 프로필 헤더 (VLUE 스타일) —— */
        val header =
            LinearLayout(activity).apply {
                orientation = LinearLayout.HORIZONTAL
                gravity = Gravity.CENTER_VERTICAL
                setPadding(dp(14), dp(16), dp(10), dp(12))
            }

        val icon =
            ImageView(activity).apply {
                scaleType = ImageView.ScaleType.CENTER_CROP
                background =
                    GradientDrawable().apply {
                        shape = GradientDrawable.OVAL
                        setColor(Color.rgb(30, 41, 59))
                    }
                clipToOutline = true
                outlineProvider = android.view.ViewOutlineProvider.BACKGROUND
                ad.icon?.drawable?.let { setImageDrawable(it) }
                    ?: run {
                        /* 아이콘 없으면 이니셜 대체는 advertiser 옆 텍스트로 충분 */
                        setBackgroundColor(Color.rgb(37, 99, 235))
                    }
            }
        header.addView(icon, LinearLayout.LayoutParams(dp(40), dp(40)))

        val nameCol =
            LinearLayout(activity).apply {
                orientation = LinearLayout.VERTICAL
                setPadding(dp(10), 0, dp(8), 0)
            }
        val nameRow =
            LinearLayout(activity).apply {
                orientation = LinearLayout.HORIZONTAL
                gravity = Gravity.CENTER_VERTICAL
            }
        val advertiser =
            TextView(activity).apply {
                text = ad.advertiser?.takeIf { it.isNotBlank() } ?: "스폰서"
                textSize = 15f
                setTextColor(Color.WHITE)
                setTypeface(typeface, Typeface.BOLD)
                maxLines = 1
                ellipsize = android.text.TextUtils.TruncateAt.END
            }
        /* VLUE 공식 인증 배지 (파란 체크) */
        val verified =
            TextView(activity).apply {
                text = "✓"
                textSize = 11f
                setTextColor(Color.WHITE)
                gravity = Gravity.CENTER
                background =
                    GradientDrawable().apply {
                        shape = GradientDrawable.OVAL
                        setColor(Color.rgb(37, 99, 235))
                    }
                setPadding(0, 0, 0, 0)
            }
        nameRow.addView(
            advertiser,
            LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f),
        )
        nameRow.addView(
            verified,
            LinearLayout.LayoutParams(dp(18), dp(18)).apply { marginStart = dp(6) },
        )
        val subLabel =
            TextView(activity).apply {
                text = "VLUE 스폰서 쇼케이스"
                textSize = 11f
                setTextColor(Color.rgb(148, 163, 184))
                maxLines = 1
            }
        nameCol.addView(nameRow)
        nameCol.addView(subLabel)
        header.addView(nameCol, LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f))

        val adBadge =
            TextView(activity).apply {
                text = "[광고] AD"
                textSize = 10f
                setTextColor(Color.WHITE)
                setTypeface(typeface, Typeface.BOLD)
                setPadding(dp(8), dp(5), dp(8), dp(5))
                background =
                    GradientDrawable().apply {
                        setColor(Color.argb(160, 15, 23, 42))
                        cornerRadius = dp(8).toFloat()
                    }
            }
        header.addView(
            adBadge,
            LinearLayout.LayoutParams(LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT).apply {
                marginEnd = dp(6)
            },
        )

        val adChoices =
            AdChoicesView(activity).apply {
                layoutParams = LinearLayout.LayoutParams(dp(22), dp(22)).apply { marginEnd = dp(4) }
            }
        header.addView(adChoices)

        val close =
            TextView(activity).apply {
                text = "×"
                textSize = 22f
                setTextColor(Color.WHITE)
                gravity = Gravity.CENTER
                background =
                    GradientDrawable().apply {
                        shape = GradientDrawable.OVAL
                        setColor(Color.argb(140, 15, 23, 42))
                    }
                setOnClickListener { dialog.dismiss() }
                contentDescription = "닫기"
            }
        header.addView(close, LinearLayout.LayoutParams(dp(36), dp(36)))

        root.addView(
            header,
            FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.WRAP_CONTENT).apply {
                gravity = Gravity.TOP
            },
        )

        /* —— 하단 그라데이션 + 타이틀/본문 + VLUE CTA —— */
        val bottom =
            LinearLayout(activity).apply {
                orientation = LinearLayout.VERTICAL
                setPadding(dp(18), dp(28), dp(18), dp(32))
                background =
                    GradientDrawable(
                        GradientDrawable.Orientation.BOTTOM_TOP,
                        intArrayOf(
                            Color.argb(240, 2, 6, 23),
                            Color.argb(160, 2, 6, 23),
                            Color.TRANSPARENT,
                        ),
                    )
            }
        val headline =
            TextView(activity).apply {
                text = ad.headline.orEmpty()
                textSize = 22f
                setTextColor(Color.WHITE)
                setTypeface(typeface, Typeface.BOLD)
                maxLines = 3
                setLineSpacing(0f, 1.15f)
            }
        val body =
            TextView(activity).apply {
                text = ad.body.orEmpty()
                textSize = 13f
                setTextColor(Color.rgb(203, 213, 225))
                maxLines = 4
                setLineSpacing(0f, 1.25f)
            }
        /* VLUE 시그니처 버튼 — 브랜드 블루 + 둥근 코너 */
        val cta =
            Button(activity).apply {
                text = ad.callToAction ?: "방문하기"
                textSize = 16f
                isAllCaps = false
                setTypeface(typeface, Typeface.BOLD)
                setTextColor(Color.WHITE)
                background =
                    GradientDrawable().apply {
                        setColor(Color.rgb(37, 99, 235)) /* blue-600 */
                        cornerRadius = dp(16).toFloat()
                    }
                setPadding(dp(18), dp(16), dp(18), dp(16))
                elevation = dp(4).toFloat()
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
                topMargin = dp(16)
            },
        )
        root.addView(
            bottom,
            FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.WRAP_CONTENT).apply {
                gravity = Gravity.BOTTOM
            },
        )

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
        lastStatus = "showcase_open"
        notifyWeb()
    }

    private fun closeShowcase() {
        runCatching { showcaseDialog?.dismiss() }
        showcaseDialog = null
    }

    companion object {
        private const val TAG = "VlueNativeAd"
        private const val LOAD_TIMEOUT_MS = 12_000L
    }
}
