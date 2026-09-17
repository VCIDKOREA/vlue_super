package kr.vlue.calloverlay

import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.view.Gravity
import android.view.View
import android.widget.Button
import android.widget.FrameLayout
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView
import com.google.android.gms.ads.AdLoader
import com.google.android.gms.ads.AdRequest
import com.google.android.gms.ads.nativead.MediaView
import com.google.android.gms.ads.nativead.NativeAd
import com.google.android.gms.ads.nativead.NativeAdOptions
import com.google.android.gms.ads.nativead.NativeAdView
import org.json.JSONObject
import kotlin.math.roundToInt

/** WebView의 메인 배너 DOM 좌표에 AdMob NativeAdView를 안전하게 겹쳐 렌더한다. */
class VlueNativeAdManager(
    private val activity: MainActivity,
    private val host: FrameLayout,
    private val webView: android.webkit.WebView,
) {
    private var nativeAd: NativeAd? = null
    private var loading = false
    private var pendingRect: JSONObject? = null

    fun show(rectJson: String?) {
        val rect = runCatching { JSONObject(rectJson ?: "{}") }.getOrNull() ?: return
        pendingRect = rect
        if (!rect.optBoolean("visible", false)) {
            host.visibility = View.GONE
            return
        }
        applyRect(rect)
        if (nativeAd != null || loading) return
        loading = true
        AdLoader.Builder(activity, rect.optString("unitId").trim().ifEmpty { BuildConfig.ADMOB_NATIVE_ID })
            .forNativeAd { ad ->
                loading = false
                nativeAd?.destroy()
                nativeAd = ad
                render(ad)
                pendingRect?.let(::applyRect)
            }
            .withNativeAdOptions(NativeAdOptions.Builder().build())
            .withAdListener(
                object : com.google.android.gms.ads.AdListener() {
                    override fun onAdFailedToLoad(error: com.google.android.gms.ads.LoadAdError) {
                        loading = false
                        host.visibility = View.GONE
                    }
                },
            )
            .build()
            .loadAd(AdRequest.Builder().build())
    }

    fun hide() {
        pendingRect = null
        host.visibility = View.GONE
    }

    fun destroy() {
        nativeAd?.destroy()
        nativeAd = null
        host.removeAllViews()
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

    private fun render(ad: NativeAd) {
        val density = activity.resources.displayMetrics.density
        fun dp(value: Int) = (value * density).roundToInt()
        fun text(size: Float, color: Int, bold: Boolean = false) =
            TextView(activity).apply {
                textSize = size
                setTextColor(color)
                if (bold) setTypeface(typeface, Typeface.BOLD)
                maxLines = 2
            }

        val adView = NativeAdView(activity)
        val root =
            LinearLayout(activity).apply {
                orientation = LinearLayout.VERTICAL
                setPadding(dp(12), dp(10), dp(12), dp(10))
                background =
                    GradientDrawable().apply {
                        setColor(Color.WHITE)
                        cornerRadius = dp(22).toFloat()
                        setStroke(dp(1), Color.rgb(226, 232, 240))
                    }
            }
        val label = text(10f, Color.rgb(37, 99, 235), true).apply { text = "광고 · AdMob" }
        val headline = text(16f, Color.rgb(15, 23, 42), true).apply { text = ad.headline }
        val media = MediaView(activity)
        val mediaParams = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dp(105)).apply {
            topMargin = dp(6)
        }
        val bottom = LinearLayout(activity).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
        }
        val icon = ImageView(activity).apply {
            layoutParams = LinearLayout.LayoutParams(dp(36), dp(36)).apply { marginEnd = dp(8) }
            scaleType = ImageView.ScaleType.CENTER_CROP
            setImageDrawable(ad.icon?.drawable)
            visibility = if (ad.icon?.drawable != null) View.VISIBLE else View.GONE
        }
        val body = text(11f, Color.rgb(71, 85, 105)).apply { text = ad.body.orEmpty() }
        val action = Button(activity).apply {
            text = ad.callToAction ?: "자세히"
            textSize = 11f
            isAllCaps = false
        }
        bottom.addView(icon)
        bottom.addView(body, LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f))
        bottom.addView(action, LinearLayout.LayoutParams(LinearLayout.LayoutParams.WRAP_CONTENT, dp(42)))
        root.addView(label)
        root.addView(headline)
        root.addView(media, mediaParams)
        root.addView(bottom)
        adView.addView(root, FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT))
        adView.headlineView = headline
        adView.bodyView = body
        adView.callToActionView = action
        adView.iconView = icon
        adView.mediaView = media
        media.mediaContent = ad.mediaContent
        adView.setNativeAd(ad)
        host.removeAllViews()
        host.addView(adView)
        pendingRect?.let(::applyRect)
    }
}
