package kr.vlue.calloverlay.dcp

import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.net.Uri
import android.util.TypedValue
import android.view.Gravity
import android.view.MotionEvent
import android.view.View
import android.view.WindowManager
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.TextView
import kotlin.math.hypot

/**
 * 정상·비정상 공통 DCP 팝업.
 * 비정상은 고정 + 확인=공식 제보 사이트. 정상은 미니케이스처럼 드래그·가장자리 피크.
 */
object DcpAbnormalWarningView {
    const val TAG = "vlue_dcp_route_popup"

    const val NORMAL_MESSAGE =
        "공식 국가기관 번호로 확인되었습니다. 디지털인증프로필을 확인하세요."

    const val CONTACT_NORMAL_MESSAGE =
        "기기에 저장된 번호입니다. VLUE 비회원 · 안심케어 정상 경로입니다."

    const val ACTION_TAG = "dcp_action"

    data class Spec(
        val abnormal: Boolean,
        val agencyName: String = "",
        val shortNumber: String = "",
        val officialWebsite: String = "",
        val fromMock: Boolean = false,
        val expired: Boolean = false,
        val expiredMessage: String = "인증기간이 만료된 번호입니다. 직접 확인 부탁드립니다.",
        val contactSafeCare: Boolean = false,
        val vlueNonMember: Boolean = false,
        val showShareShowcase: Boolean = false,
        val reasonLine: String = "",
        val pathVerify: Boolean = false
    )

    fun build(
        context: Context,
        spec: Spec,
        onConfirm: () -> Unit,
        onShareShowcase: (() -> Unit)? = null
    ): View {
        val ctx = context
        val card = LinearLayout(ctx).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER_HORIZONTAL
            background = GradientDrawable().apply {
                setColor(Color.parseColor("#1C1917"))
                setStroke(
                    dp(ctx, 1),
                    Color.parseColor(
                        when {
                            spec.expired -> "#FBBF24"
                            spec.abnormal -> "#FB7185"
                            else -> "#60A5FA"
                        }
                    )
                )
                cornerRadius = dp(ctx, 22).toFloat()
            }
            val pad = dp(ctx, 20)
            setPadding(pad, pad, pad, pad)
            tag = TAG
            layoutParams = LinearLayout.LayoutParams(dp(ctx, 320), LinearLayout.LayoutParams.WRAP_CONTENT)
        }
        card.addView(
            TextView(ctx).apply {
                text = when {
                    spec.expired -> "인증기간 만료"
                    spec.abnormal -> "경로 검증 · 비정상"
                    else -> "경로 검증 · 정상"
                }
                setTextColor(
                    Color.parseColor(
                        when {
                            spec.expired -> "#FDE68A"
                            spec.abnormal -> "#FDA4AF"
                            else -> "#93C5FD"
                        }
                    )
                )
                setTextSize(TypedValue.COMPLEX_UNIT_SP, 11f)
                typeface = Typeface.DEFAULT_BOLD
                gravity = Gravity.CENTER
            }
        )
        card.addView(
            TextView(ctx).apply {
                text = when {
                    spec.expired -> spec.expiredMessage
                    spec.abnormal && spec.reasonLine.isNotBlank() -> spec.reasonLine
                    spec.abnormal && spec.pathVerify ->
                        "비정상 경로로 확인된 전화입니다."
                    spec.abnormal -> NationalAgencyWhitelist.ABNORMAL_WARNING
                    spec.contactSafeCare -> CONTACT_NORMAL_MESSAGE
                    else -> NORMAL_MESSAGE
                }
                setTextColor(Color.WHITE)
                setTextSize(TypedValue.COMPLEX_UNIT_SP, 15f)
                typeface = Typeface.DEFAULT_BOLD
                gravity = Gravity.CENTER
                setPadding(0, dp(ctx, 10), 0, 0)
            }
        )
        if (spec.agencyName.isNotBlank()) {
            card.addView(
                TextView(ctx).apply {
                    text = spec.agencyName
                    setTextColor(Color.WHITE)
                    setTextSize(TypedValue.COMPLEX_UNIT_SP, 16f)
                    typeface = Typeface.DEFAULT_BOLD
                    gravity = Gravity.CENTER
                    setPadding(0, dp(ctx, 10), 0, 0)
                }
            )
        }
        if (spec.shortNumber.isNotBlank()) {
            card.addView(
                TextView(ctx).apply {
                    text = spec.shortNumber
                    setTextColor(Color.parseColor("#93C5FD"))
                    setTextSize(TypedValue.COMPLEX_UNIT_SP, 20f)
                    typeface = Typeface.DEFAULT_BOLD
                    gravity = Gravity.CENTER
                    paint.isUnderlineText = true
                    setPadding(0, dp(ctx, 6), 0, 0)
                    setOnClickListener { openUri(ctx, "tel:${spec.shortNumber}") }
                }
            )
        }
        if (spec.vlueNonMember) {
            card.addView(
                TextView(ctx).apply {
                    text = "VLUE 비회원"
                    setTextColor(Color.parseColor("#FDE047"))
                    setTextSize(TypedValue.COMPLEX_UNIT_SP, 13f)
                    typeface = Typeface.DEFAULT_BOLD
                    gravity = Gravity.CENTER
                    setPadding(0, dp(ctx, 8), 0, 0)
                }
            )
        }
        val href = websiteHref(spec.officialWebsite)
        if (href.isNotBlank()) {
            val label = spec.officialWebsite
                .removePrefix("https://")
                .removePrefix("http://")
                .trimEnd('/')
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
        val confirm = TextView(ctx).apply {
            text = if (spec.expired) "닫기" else "확인"
            setTextColor(Color.WHITE)
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 14f)
            typeface = Typeface.DEFAULT_BOLD
            gravity = Gravity.CENTER
            background = GradientDrawable().apply {
                setColor(Color.parseColor(if (spec.abnormal) "#E11D48" else "#2563EB"))
                cornerRadius = dp(ctx, 12).toFloat()
            }
            setPadding(dp(ctx, 12), dp(ctx, 12), dp(ctx, 12), dp(ctx, 12))
            val lp = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply { topMargin = dp(ctx, 14) }
            layoutParams = lp
            tag = ACTION_TAG
            setOnClickListener {
                if (spec.abnormal && !spec.pathVerify) {
                    openUri(ctx, NationalAgencyWhitelist.ABNORMAL_REPORT_URL)
                }
                onConfirm()
            }
        }
        card.addView(confirm)
        if (spec.showShareShowcase && onShareShowcase != null) {
            card.addView(
                TextView(ctx).apply {
                    text = "쇼케이스 전달하기"
                    setTextColor(Color.parseColor("#E2E8F0"))
                    setTextSize(TypedValue.COMPLEX_UNIT_SP, 14f)
                    typeface = Typeface.DEFAULT_BOLD
                    gravity = Gravity.CENTER
                    background = GradientDrawable().apply {
                        setColor(Color.parseColor("#334155"))
                        cornerRadius = dp(ctx, 12).toFloat()
                    }
                    setPadding(dp(ctx, 12), dp(ctx, 12), dp(ctx, 12), dp(ctx, 12))
                    val lp = LinearLayout.LayoutParams(
                        LinearLayout.LayoutParams.MATCH_PARENT,
                        LinearLayout.LayoutParams.WRAP_CONTENT
                    ).apply { topMargin = dp(ctx, 8) }
                    layoutParams = lp
                    tag = ACTION_TAG
                    setOnClickListener { onShareShowcase() }
                }
            )
        }
        return card
    }

    /**
     * 정상 경로만 드래그·피크. 비정상은 터치해도 창이 움직이지 않음.
     */
    fun bindDrag(
        host: View,
        wm: WindowManager,
        params: WindowManager.LayoutParams,
        enabled: Boolean
    ) {
        if (!enabled) {
            host.setOnTouchListener(null)
            return
        }
        val peekKeep = dp(host.context, 32)
        var downRawX = 0f
        var downRawY = 0f
        var startX = 0
        var startY = 0
        var dragging = false
        var moved = false
        var peeking = false
        val listener = View.OnTouchListener { v, ev ->
            if (!dragging && touchOnAction(v, ev)) {
                return@OnTouchListener false
            }
            when (ev.actionMasked) {
                MotionEvent.ACTION_DOWN -> {
                    downRawX = ev.rawX
                    downRawY = ev.rawY
                    if (params.gravity != (Gravity.TOP or Gravity.START)) {
                        val dm = host.resources.displayMetrics
                        val w = host.width.coerceAtLeast(1)
                        val h = host.height.coerceAtLeast(1)
                        params.gravity = Gravity.TOP or Gravity.START
                        params.x = ((dm.widthPixels - w) / 2 + params.x).coerceAtLeast(0)
                        params.y = ((dm.heightPixels - h) / 2 + params.y).coerceAtLeast(0)
                    }
                    startX = params.x
                    startY = params.y
                    dragging = true
                    moved = false
                    true
                }
                MotionEvent.ACTION_MOVE -> {
                    if (!dragging) return@OnTouchListener false
                    val dx = (ev.rawX - downRawX).toInt()
                    val dy = (ev.rawY - downRawY).toInt()
                    if (hypot(dx.toDouble(), dy.toDouble()) > 10) moved = true
                    val dm = host.resources.displayMetrics
                    val sw = dm.widthPixels
                    val sh = dm.heightPixels
                    val w = host.width.coerceAtLeast(1)
                    val h = host.height.coerceAtLeast(1)
                    params.x = (startX + dx).coerceIn(peekKeep - w, sw - peekKeep)
                    params.y = (startY + dy).coerceIn(peekKeep - h, sh - peekKeep)
                    try {
                        wm.updateViewLayout(host, params)
                    } catch (_: Exception) {
                    }
                    true
                }
                MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> {
                    if (!dragging) return@OnTouchListener false
                    dragging = false
                    val dm = host.resources.displayMetrics
                    val sw = dm.widthPixels
                    val w = host.width.coerceAtLeast(1)
                    if (!moved) {
                        if (peeking) {
                            params.x = ((sw - w) / 2).coerceAtLeast(0)
                            peeking = false
                            try {
                                wm.updateViewLayout(host, params)
                            } catch (_: Exception) {
                            }
                        }
                        return@OnTouchListener true
                    }
                    val visibleLeft = params.x.coerceAtLeast(0)
                    val visibleRight = (params.x + w).coerceAtMost(sw)
                    val visibleW = (visibleRight - visibleLeft).coerceAtLeast(0)
                    if (visibleW <= peekKeep + dp(host.context, 8)) {
                        peeking = true
                        params.x = if (params.x > sw / 2) sw - peekKeep else peekKeep - w
                        try {
                            wm.updateViewLayout(host, params)
                        } catch (_: Exception) {
                        }
                    }
                    true
                }
                else -> false
            }
        }
        host.setOnTouchListener(listener)
    }

    private fun touchOnAction(card: View, ev: MotionEvent): Boolean {
        val group = card as? android.view.ViewGroup ?: return false
        val x = ev.rawX
        val y = ev.rawY
        for (i in 0 until group.childCount) {
            val child = group.getChildAt(i) ?: continue
            if (child.tag != ACTION_TAG) continue
            val loc = IntArray(2)
            child.getLocationOnScreen(loc)
            if (x >= loc[0] && x <= loc[0] + child.width && y >= loc[1] && y <= loc[1] + child.height) {
                return true
            }
        }
        return false
    }

    fun detach(parent: FrameLayout?) {
        if (parent == null) return
        val existing = parent.findViewWithTag<View>(TAG) ?: return
        parent.removeView(existing)
    }

    fun websiteHref(raw: String): String {
        val site = raw.trim()
        if (site.isEmpty()) return ""
        return if (site.startsWith("http")) site else "https://$site"
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
