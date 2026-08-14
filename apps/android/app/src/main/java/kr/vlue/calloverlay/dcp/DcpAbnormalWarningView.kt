package kr.vlue.calloverlay.dcp

import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.net.Uri
import android.util.TypedValue
import android.view.Gravity
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.TextView

/** 비정상 경로 — WebView 로드 전에도 즉시 보이는 네이티브 경고 */
object DcpAbnormalWarningView {
    const val TAG = "vlue_dcp_abnormal_warning"

    fun attach(
        parent: FrameLayout,
        agencyName: String = "",
        shortNumber: String = "",
        officialWebsite: String = ""
    ) {
        detach(parent)
        val ctx = parent.context
        val card = LinearLayout(ctx).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER_HORIZONTAL
            background = GradientDrawable().apply {
                setColor(Color.parseColor("#1C1917"))
                setStroke(dp(ctx, 1), Color.parseColor("#FB7185"))
                cornerRadius = dp(ctx, 22).toFloat()
            }
            val pad = dp(ctx, 20)
            setPadding(pad, pad, pad, pad)
        }
        card.addView(
            TextView(ctx).apply {
                text = "경로 검증 · 비정상"
                setTextColor(Color.parseColor("#FDA4AF"))
                setTextSize(TypedValue.COMPLEX_UNIT_SP, 11f)
                typeface = Typeface.DEFAULT_BOLD
                gravity = Gravity.CENTER
            }
        )
        card.addView(
            TextView(ctx).apply {
                text = NationalAgencyWhitelist.ABNORMAL_WARNING
                setTextColor(Color.WHITE)
                setTextSize(TypedValue.COMPLEX_UNIT_SP, 15f)
                typeface = Typeface.DEFAULT_BOLD
                gravity = Gravity.CENTER
                setPadding(0, dp(ctx, 10), 0, 0)
            }
        )
        if (agencyName.isNotBlank()) {
            card.addView(
                TextView(ctx).apply {
                    text = agencyName
                    setTextColor(Color.WHITE)
                    setTextSize(TypedValue.COMPLEX_UNIT_SP, 16f)
                    typeface = Typeface.DEFAULT_BOLD
                    gravity = Gravity.CENTER
                    setPadding(0, dp(ctx, 10), 0, 0)
                }
            )
        }
        if (shortNumber.isNotBlank()) {
            card.addView(
                TextView(ctx).apply {
                    text = shortNumber
                    setTextColor(Color.parseColor("#93C5FD"))
                    setTextSize(TypedValue.COMPLEX_UNIT_SP, 20f)
                    typeface = Typeface.DEFAULT_BOLD
                    gravity = Gravity.CENTER
                    paint.isUnderlineText = true
                    setPadding(0, dp(ctx, 6), 0, 0)
                    setOnClickListener { openUri(ctx, "tel:$shortNumber") }
                }
            )
        }
        if (officialWebsite.isNotBlank()) {
            val href = if (officialWebsite.startsWith("http")) officialWebsite else "https://$officialWebsite"
            val label = officialWebsite.removePrefix("https://").removePrefix("http://").trimEnd('/')
            card.addView(
                TextView(ctx).apply {
                    text = "해당 공식 웹사이트\n$label"
                    setTextColor(Color.parseColor("#FDE047"))
                    setTextSize(TypedValue.COMPLEX_UNIT_SP, 13f)
                    typeface = Typeface.DEFAULT_BOLD
                    gravity = Gravity.CENTER
                    paint.isUnderlineText = true
                    setPadding(0, dp(ctx, 10), 0, 0)
                    setOnClickListener { openUri(ctx, href) }
                }
            )
        }
        val wrap = FrameLayout(ctx).apply {
            this.tag = TAG
            setBackgroundColor(Color.parseColor("#00000000"))
            val lp = FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.WRAP_CONTENT,
                Gravity.CENTER
            ).apply {
                marginStart = dp(ctx, 24)
                marginEnd = dp(ctx, 24)
            }
            addView(card, lp)
        }
        parent.addView(
            wrap,
            FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.WRAP_CONTENT,
                Gravity.CENTER
            )
        )
    }

    fun detach(parent: FrameLayout?) {
        if (parent == null) return
        val existing = parent.findViewWithTag<android.view.View>(TAG) ?: return
        parent.removeView(existing)
    }

    private fun openUri(context: Context, uri: String) {
        try {
            val intent = Intent(Intent.ACTION_VIEW, Uri.parse(uri)).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            context.startActivity(intent)
        } catch (_: Exception) {
            /* ignore */
        }
    }

    private fun dp(context: Context, value: Int): Int =
        (value * context.resources.displayMetrics.density).toInt()
}
