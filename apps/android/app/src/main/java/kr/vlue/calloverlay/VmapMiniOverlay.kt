package kr.vlue.calloverlay

import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.graphics.PixelFormat
import android.graphics.drawable.GradientDrawable
import android.os.Build
import android.provider.Settings
import android.util.TypedValue
import android.view.Gravity
import android.view.MotionEvent
import android.view.View
import android.view.WindowManager
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.TextView
import org.json.JSONObject

/**
 * V-Map 미니맵 — 다른 앱 위 SYSTEM_ALERT_WINDOW 플로팅 카드.
 * 탭하면 앱을 다시 연다.
 */
object VmapMiniOverlay {
    private var windowManager: WindowManager? = null
    @Volatile
    private var container: FrameLayout? = null
    private var params: WindowManager.LayoutParams? = null
    private var titleView: TextView? = null
    private var subView: TextView? = null
    private var glyphView: TextView? = null
    private var remainView: TextView? = null
    private var instructionView: TextView? = null
    private var touchSlop = 12
    private var downX = 0f
    private var downY = 0f
    private var startX = 0
    private var startY = 0
    private var moved = false

    @Volatile
    var backgroundHold: Boolean = false
    @Volatile
    var lastPayloadJson: String = "{}"
    @Volatile
    var lastRemainM: Double? = null
    @Volatile
    var lastLat: Double? = null
    @Volatile
    var lastLng: Double? = null
    @Volatile
    var destLat: Double? = null
    @Volatile
    var destLng: Double? = null
    @Volatile
    var statusLine: String = "길안내 중"

    fun isAttached(): Boolean = container != null

    fun show(context: Context, payloadJson: String?): String {
        if (!payloadJson.isNullOrBlank()) lastPayloadJson = payloadJson
        val app = context.applicationContext
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !Settings.canDrawOverlays(app)) {
            return """{"ok":false,"error":"overlay_permission"}"""
        }
        val payload = try {
            JSONObject(payloadJson ?: "{}")
        } catch (_: Exception) {
            JSONObject()
        }
        app.mainExecutorOrHandler().execute {
            ensureAttached(app)
            applyPayload(payload)
        }
        return """{"ok":true}"""
    }

    fun update(context: Context, payloadJson: String?) {
        if (!payloadJson.isNullOrBlank()) lastPayloadJson = payloadJson
        val payload = try {
            JSONObject(lastPayloadJson.ifBlank { "{}" })
        } catch (_: Exception) {
            JSONObject()
        }
        val app = context.applicationContext
        app.mainExecutorOrHandler().execute {
            if (container == null) {
                if (!backgroundHold) return@execute
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !Settings.canDrawOverlays(app)) return@execute
                ensureAttached(app)
            }
            applyPayload(payload)
        }
    }

    fun hide(context: Context) {
        if (backgroundHold) return
        context.applicationContext.mainExecutorOrHandler().execute {
            detach(context.applicationContext)
        }
    }

    fun forceHide(context: Context) {
        backgroundHold = false
        context.applicationContext.mainExecutorOrHandler().execute {
            detach(context.applicationContext)
        }
    }

    private fun Context.mainExecutorOrHandler(): java.util.concurrent.Executor {
        return if (Build.VERSION.SDK_INT >= 28) {
            mainExecutor
        } else {
            java.util.concurrent.Executor { runnable ->
                android.os.Handler(android.os.Looper.getMainLooper()).post(runnable)
            }
        }
    }

    private fun applyPayload(payload: JSONObject) {
        val label = payload.optString("label").ifBlank { "V-Map" }
        val eta = payload.optString("eta").trim()
        val place = payload.optString("place").trim()
        val glyph = payload.optString("glyph").trim()
        val remain = payload.optString("remain").trim()
        val instruction = payload.optString("instruction").trim()
        if (payload.has("remainM") && !payload.isNull("remainM")) {
            val meters = payload.optDouble("remainM", Double.NaN)
            if (!meters.isNaN()) lastRemainM = meters
        }
        val lat = payload.optDouble("lat", Double.NaN)
        val lng = payload.optDouble("lng", Double.NaN)
        if (!lat.isNaN() && !lng.isNaN()) {
            lastLat = lat
            lastLng = lng
        }
        val dLat = payload.optDouble("destLat", Double.NaN)
        val dLng = payload.optDouble("destLng", Double.NaN)
        if (!dLat.isNaN() && !dLng.isNaN()) {
            destLat = dLat
            destLng = dLng
        }
        titleView?.text = label
        /* heading 으로 View.rotation 을 주면 카드 레이어까지 대각선으로 돌아간다. 화살표 글리프만 정자세로 둔다. */
        resetOverlayTransform()
        glyphView?.text = if (glyph.isNotEmpty()) glyph else "↑"
        val remainText = remain.ifBlank { "—" }
        remainView?.text = remainText
        val instructionText = instruction.ifBlank { "경로 안내" }
        instructionView?.text = instructionText
        statusLine = listOf(remainText, instructionText)
            .filter { it.isNotBlank() && it != "—" }
            .joinToString(" · ")
            .ifBlank { "길안내 중" }
        glyphView?.visibility = View.VISIBLE
        remainView?.visibility = View.VISIBLE
        instructionView?.visibility = View.VISIBLE
        subView?.text = when {
            eta.isNotEmpty() && place.isNotEmpty() -> "$eta · $place"
            eta.isNotEmpty() -> eta
            place.isNotEmpty() -> place
            else -> "탭하면 지도 열기"
        }
    }

    /** 회전 변환이 카드 통째로 붙지 않도록 오버레이 트리의 transform 을 항상 정자세로 되돌린다. */
    private fun resetOverlayTransform() {
        val root = container
        root?.animate()?.cancel()
        root?.rotation = 0f
        root?.rotationX = 0f
        root?.rotationY = 0f
        root?.scaleX = 1f
        root?.scaleY = 1f
        glyphView?.animate()?.cancel()
        glyphView?.rotation = 0f
        glyphView?.rotationX = 0f
        glyphView?.rotationY = 0f
        val column = root?.getChildAt(0)
        column?.animate()?.cancel()
        column?.rotation = 0f
        column?.rotationX = 0f
        column?.rotationY = 0f
    }

    private fun ensureAttached(app: Context) {
        if (container != null) return
        val wm = app.getSystemService(Context.WINDOW_SERVICE) as WindowManager
        windowManager = wm
        touchSlop = TypedValue.applyDimension(
            TypedValue.COMPLEX_UNIT_DIP,
            8f,
            app.resources.displayMetrics
        ).toInt()

        val width = TypedValue.applyDimension(
            TypedValue.COMPLEX_UNIT_DIP,
            176f,
            app.resources.displayMetrics
        ).toInt()
        val height = TypedValue.applyDimension(
            TypedValue.COMPLEX_UNIT_DIP,
            228f,
            app.resources.displayMetrics
        ).toInt()

        fun dp(value: Float): Int = TypedValue.applyDimension(
            TypedValue.COMPLEX_UNIT_DIP,
            value,
            app.resources.displayMetrics
        ).toInt()

        val root = FrameLayout(app).apply {
            background = GradientDrawable().apply {
                cornerRadius = dp(22f).toFloat()
                setColor(Color.parseColor("#F20C1220"))
                setStroke(dp(2f), Color.parseColor("#00D2FF"))
            }
            elevation = 12f
            clipChildren = true
            clipToPadding = true
            clipToOutline = true
            rotation = 0f
        }

        val column = LinearLayout(app).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            clipChildren = true
            clipToPadding = true
            rotation = 0f
            setPadding(dp(14f), dp(16f), dp(14f), dp(16f))
        }
        val badge = TextView(app).apply {
            text = "V-Map"
            setTextColor(Color.parseColor("#04121A"))
            textSize = 11f
            gravity = Gravity.CENTER
            textAlignment = View.TEXT_ALIGNMENT_CENTER
            setPadding(dp(10f), dp(4f), dp(10f), dp(4f))
            background = GradientDrawable().apply {
                cornerRadius = dp(20f).toFloat()
                setColor(Color.parseColor("#00D2FF"))
            }
            typeface = android.graphics.Typeface.DEFAULT_BOLD
        }
        val arrowSize = dp(52f)
        val arrowBox = FrameLayout(app).apply {
            background = GradientDrawable().apply {
                cornerRadius = dp(16f).toFloat()
                setColor(Color.parseColor("#00D2FF"))
            }
            clipChildren = true
            clipToPadding = true
            rotation = 0f
        }
        glyphView = TextView(app).apply {
            text = "↑"
            setTextColor(Color.parseColor("#04121A"))
            textSize = 26f
            typeface = android.graphics.Typeface.DEFAULT_BOLD
            gravity = Gravity.CENTER
            textAlignment = View.TEXT_ALIGNMENT_CENTER
            includeFontPadding = false
            rotation = 0f
        }
        arrowBox.addView(
            glyphView,
            FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT,
                Gravity.CENTER
            )
        )
        remainView = TextView(app).apply {
            text = "—"
            setTextColor(Color.parseColor("#00D2FF"))
            textSize = 18f
            typeface = android.graphics.Typeface.DEFAULT_BOLD
            gravity = Gravity.CENTER
            textAlignment = View.TEXT_ALIGNMENT_CENTER
            setPadding(0, dp(8f), 0, 0)
        }
        instructionView = TextView(app).apply {
            text = "경로 안내"
            setTextColor(Color.WHITE)
            textSize = 12f
            typeface = android.graphics.Typeface.DEFAULT_BOLD
            gravity = Gravity.CENTER
            textAlignment = View.TEXT_ALIGNMENT_CENTER
            maxLines = 2
            ellipsize = android.text.TextUtils.TruncateAt.END
            setPadding(0, dp(2f), 0, dp(2f))
        }
        titleView = TextView(app).apply {
            text = "V-Map"
            setTextColor(Color.WHITE)
            textSize = 13f
            typeface = android.graphics.Typeface.DEFAULT_BOLD
            gravity = Gravity.CENTER
            textAlignment = View.TEXT_ALIGNMENT_CENTER
            maxLines = 1
            ellipsize = android.text.TextUtils.TruncateAt.END
            setPadding(0, dp(4f), 0, dp(1f))
        }
        subView = TextView(app).apply {
            text = "탭하면 지도 열기"
            setTextColor(Color.parseColor("#B3FFFFFF"))
            textSize = 10f
            gravity = Gravity.CENTER
            textAlignment = View.TEXT_ALIGNMENT_CENTER
            maxLines = 2
            ellipsize = android.text.TextUtils.TruncateAt.END
        }
        fun centeredWrap() = LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.WRAP_CONTENT,
            LinearLayout.LayoutParams.WRAP_CONTENT
        ).apply { gravity = Gravity.CENTER_HORIZONTAL }
        fun centeredText() = LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT,
            LinearLayout.LayoutParams.WRAP_CONTENT
        ).apply { gravity = Gravity.CENTER_HORIZONTAL }
        column.addView(badge, centeredWrap())
        column.addView(arrowBox, LinearLayout.LayoutParams(arrowSize, arrowSize).apply {
            gravity = Gravity.CENTER_HORIZONTAL
            topMargin = dp(8f)
        })
        column.addView(remainView, centeredText())
        column.addView(instructionView, centeredText())
        column.addView(titleView, centeredText())
        column.addView(subView, centeredText())
        root.addView(
            column,
            FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT
            )
        )

        val lp = WindowManager.LayoutParams(
            width,
            height,
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
            } else {
                @Suppress("DEPRECATION")
                WindowManager.LayoutParams.TYPE_PHONE
            },
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS or
                WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED,
            PixelFormat.TRANSLUCENT
        ).apply {
            gravity = Gravity.TOP or Gravity.START
            x = app.resources.displayMetrics.widthPixels - width - 24
            y = TypedValue.applyDimension(
                TypedValue.COMPLEX_UNIT_DIP,
                48f,
                app.resources.displayMetrics
            ).toInt()
        }

        root.setOnTouchListener { _, event ->
            when (event.actionMasked) {
                MotionEvent.ACTION_DOWN -> {
                    downX = event.rawX
                    downY = event.rawY
                    startX = lp.x
                    startY = lp.y
                    moved = false
                    true
                }
                MotionEvent.ACTION_MOVE -> {
                    val dx = (event.rawX - downX).toInt()
                    val dy = (event.rawY - downY).toInt()
                    if (kotlin.math.abs(dx) > touchSlop || kotlin.math.abs(dy) > touchSlop) {
                        moved = true
                        lp.x = startX + dx
                        lp.y = startY + dy
                        try {
                            wm.updateViewLayout(root, lp)
                        } catch (_: Exception) {
                        }
                    }
                    true
                }
                MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> {
                    if (!moved) openApp(app)
                    true
                }
                else -> false
            }
        }

        try {
            wm.addView(root, lp)
            container = root
            params = lp
        } catch (_: Exception) {
            container = null
            params = null
        }
    }

    private fun openApp(app: Context) {
        try {
            val intent = Intent(app, MainActivity::class.java).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_REORDER_TO_FRONT or Intent.FLAG_ACTIVITY_SINGLE_TOP)
                putExtra("vlue_restore_vmap", true)
            }
            app.startActivity(intent)
        } catch (_: Exception) {
        }
    }

    private fun detach(app: Context) {
        val root = container ?: return
        try {
            (windowManager ?: app.getSystemService(Context.WINDOW_SERVICE) as WindowManager)
                .removeViewImmediate(root)
        } catch (_: Exception) {
            try {
                (windowManager ?: app.getSystemService(Context.WINDOW_SERVICE) as WindowManager)
                    .removeView(root)
            } catch (_: Exception) {
            }
        }
        container = null
        params = null
        titleView = null
        subView = null
        glyphView = null
        remainView = null
        instructionView = null
        windowManager = null
    }
}
