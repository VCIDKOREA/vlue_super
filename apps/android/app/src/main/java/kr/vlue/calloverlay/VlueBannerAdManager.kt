package kr.vlue.calloverlay

import android.util.DisplayMetrics
import android.view.View
import android.widget.FrameLayout
import com.google.android.gms.ads.AdRequest
import com.google.android.gms.ads.AdSize
import com.google.android.gms.ads.AdView
import org.json.JSONObject
import kotlin.math.roundToInt

/**
 * WebView DOM 좌표에 Adaptive Banner(AdView)를 슬롯별로 겹쳐 렌더.
 * slot: ribbon | bottom | …
 */
class VlueBannerAdManager(
    private val activity: MainActivity,
    private val root: FrameLayout,
    private val webView: android.webkit.WebView,
) {
    private data class Slot(
        val host: FrameLayout,
        var adView: AdView? = null,
        var unitId: String = BuildConfig.ADMOB_BANNER_ID,
        var pendingRect: JSONObject? = null,
        var loading: Boolean = false,
    )

    private val slots = linkedMapOf<String, Slot>()
    @Volatile
    private var suppressed: Boolean = false

    /** AdMob 네이티브 쇼케이스 중 띠배너 표시 차단 */
    fun setSuppressed(value: Boolean) {
        suppressed = value
        if (value) {
            slots.values.forEach { it.host.visibility = View.GONE }
        }
        /* false 시 pendingRect 유지 — 웹 AdMobBannerSlot 이 vlue-resume-ads 로 재 show */
    }

    fun show(slotKey: String?, rectJson: String?) {
        if (suppressed) return
        val key = slotKey?.trim().orEmpty().ifEmpty { return }
        val rect = runCatching { JSONObject(rectJson ?: "{}") }.getOrNull() ?: return
        val unitId =
            rect.optString("unitId").trim().ifEmpty { BuildConfig.ADMOB_BANNER_ID }
        val slot = slots.getOrPut(key) {
            val host =
                FrameLayout(activity).apply {
                    layoutParams =
                        FrameLayout.LayoutParams(1, 1).apply {
                            leftMargin = 0
                            topMargin = 0
                        }
                    visibility = View.GONE
                }
            root.addView(host)
            Slot(host = host)
        }
        slot.unitId = unitId
        slot.pendingRect = rect
        if (!rect.optBoolean("visible", false)) {
            slot.host.visibility = View.GONE
            return
        }
        applyRect(slot, rect)
        ensureAd(slot)
    }

    fun hide(slotKey: String?) {
        val key = slotKey?.trim().orEmpty()
        if (key.isEmpty()) {
            slots.values.forEach {
                /* pendingRect 유지 — 재 show 시 좌표 복원 */
                it.host.visibility = View.GONE
            }
            return
        }
        slots[key]?.host?.visibility = View.GONE
    }

    fun destroy() {
        slots.values.forEach { slot ->
            slot.adView?.destroy()
            slot.adView = null
            root.removeView(slot.host)
        }
        slots.clear()
    }

    private fun ensureAd(slot: Slot) {
        val existing = slot.adView
        if (existing != null && existing.adUnitId == slot.unitId) return
        if (slot.loading) return
        slot.loading = true
        existing?.destroy()
        slot.adView = null
        slot.host.removeAllViews()

        val preferred =
            slot.pendingRect?.optString("preferredSize")?.trim()?.uppercase().orEmpty()
        val size =
            when (preferred) {
                "BANNER" -> AdSize.BANNER // 320x50 — 폰 표준 띠배너
                "LARGE_BANNER" -> AdSize.LARGE_BANNER
                else -> adaptiveSize() // 화면폭 Adaptive (테스트 문구에 468x60 등이 표시될 수 있음)
            }

        val adView =
            AdView(activity).apply {
                adUnitId = slot.unitId
                setAdSize(size)
            }
        slot.adView = adView
        slot.host.addView(
            adView,
            FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT,
            ),
        )
        adView.adListener =
            object : com.google.android.gms.ads.AdListener() {
                override fun onAdLoaded() {
                    slot.loading = false
                    slot.pendingRect?.let { applyRect(slot, it) }
                }

                override fun onAdFailedToLoad(error: com.google.android.gms.ads.LoadAdError) {
                    slot.loading = false
                    slot.host.visibility = View.GONE
                }
            }
        adView.loadAd(AdRequest.Builder().build())
    }

    private fun adaptiveSize(): AdSize {
        val dm: DisplayMetrics = activity.resources.displayMetrics
        val adWidth = (dm.widthPixels / dm.density).roundToInt().coerceAtLeast(320)
        return AdSize.getCurrentOrientationAnchoredAdaptiveBannerAdSize(activity, adWidth)
    }

    private fun applyRect(slot: Slot, rect: JSONObject) {
        if (!rect.optBoolean("visible", false)) {
            slot.host.visibility = View.GONE
            return
        }
        val viewportWidth = rect.optDouble("viewportWidth", 0.0)
        val viewportHeight = rect.optDouble("viewportHeight", 0.0)
        if (viewportWidth <= 0.0 || viewportHeight <= 0.0 || webView.width <= 0 || webView.height <= 0) {
            return
        }
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
        slot.host.layoutParams = params
        /* hide() 후 재 show 시 AdView 가 GONE 으로 남는 버그 방지 */
        slot.adView?.visibility = View.VISIBLE
        slot.host.visibility = if (slot.adView != null && !slot.loading) View.VISIBLE else View.INVISIBLE
    }
}
