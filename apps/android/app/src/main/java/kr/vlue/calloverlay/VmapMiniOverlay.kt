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
    private var container: FrameLayout? = null
    private var params: WindowManager.LayoutParams? = null
    private var titleView: TextView? = null
    private var subView: TextView? = null
    private var touchSlop = 12
    private var downX = 0f
    private var downY = 0f
    private var startX = 0
    private var startY = 0
    private var moved = false

    fun show(context: Context, payloadJson: String?): String {
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
        val payload = try {
            JSONObject(payloadJson ?: "{}")
        } catch (_: Exception) {
            JSONObject()
        }
        context.applicationContext.mainExecutorOrHandler().execute {
            if (container == null) return@execute
            applyPayload(payload)
        }
    }

    fun hide(context: Context) {
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
        titleView?.text = label
        subView?.text = when {
            eta.isNotEmpty() && place.isNotEmpty() -> "$eta · $place"
            eta.isNotEmpty() -> eta
            place.isNotEmpty() -> place
            else -> "탭하면 지도 열기"
        }
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
            148f,
            app.resources.displayMetrics
        ).toInt()
        val height = TypedValue.applyDimension(
            TypedValue.COMPLEX_UNIT_DIP,
            168f,
            app.resources.displayMetrics
        ).toInt()

        val root = FrameLayout(app).apply {
            background = GradientDrawable().apply {
                cornerRadius = TypedValue.applyDimension(
                    TypedValue.COMPLEX_UNIT_DIP,
                    22f,
                    app.resources.displayMetrics
                )
                setColor(Color.parseColor("#F20C1220"))
                setStroke(
                    TypedValue.applyDimension(
                        TypedValue.COMPLEX_UNIT_DIP,
                        2f,
                        app.resources.displayMetrics
                    ).toInt(),
                    Color.parseColor("#00D2FF")
                )
            }
            elevation = 24f
        }

        val column = LinearLayout(app).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            setPadding(24, 28, 24, 28)
        }
        val badge = TextView(app).apply {
            text = "V-Map"
            setTextColor(Color.parseColor("#04121A"))
            textSize = 11f
            setPadding(18, 8, 18, 8)
            background = GradientDrawable().apply {
                cornerRadius = 40f
                setColor(Color.parseColor("#00D2FF"))
            }
            typeface = android.graphics.Typeface.DEFAULT_BOLD
        }
        titleView = TextView(app).apply {
            text = "V-Map"
            setTextColor(Color.WHITE)
            textSize = 15f
            typeface = android.graphics.Typeface.DEFAULT_BOLD
            gravity = Gravity.CENTER
            setPadding(0, 18, 0, 6)
        }
        subView = TextView(app).apply {
            text = "탭하면 지도 열기"
            setTextColor(Color.parseColor("#B3FFFFFF"))
            textSize = 11f
            gravity = Gravity.CENTER
        }
        column.addView(badge, LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.WRAP_CONTENT,
            LinearLayout.LayoutParams.WRAP_CONTENT
        ).apply { gravity = Gravity.CENTER_HORIZONTAL })
        column.addView(titleView)
        column.addView(subView)
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
            y = 160
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
        windowManager = null
    }
}
