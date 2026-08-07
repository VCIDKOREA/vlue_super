package kr.vlue.calloverlay

import android.content.Context
import android.os.Build
import android.util.Log
import android.view.View
import android.view.WindowManager
import kr.vlue.calloverlay.diagnostics.DiagnosticsEventQueue
import kr.vlue.calloverlay.diagnostics.DiagnosticsFeature
import kr.vlue.calloverlay.diagnostics.DiagnosticsSessionStore
import org.json.JSONObject
import java.io.File
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.concurrent.CopyOnWriteArrayList

/**
 * Big Push 표시 파이프라인 추적 + 원격 Diagnostics Framework 전송.
 *
 * 스펙 스텝 (한 통화 = 한 세션):
 * [1] Incoming Call Detected
 * [2] LetteringCallMonitorService received
 * [3] LetteringCallCoordinator.startOverlayService()
 * [4] CallOverlayService.onCreate()
 * [5] CallOverlayService.onStartCommand()
 * [6] showOverlay()
 * [7] WindowManager.addView() CALL
 * [8] WindowManager.addView() SUCCESS | FAIL
 * [9] React Root Mounted
 * [10] Showcase Visible
 * [11] Call End
 *
 * Logcat 필터: `VlueBigPushTrace`
 */
object VlueBigPushTrace {
    const val TAG = "VlueBigPushTrace"
    const val FILE_NAME = "vlue_bigpush_trace.log"

    private val ringBuffer = CopyOnWriteArrayList<String>()
    @Volatile
    private var appContext: Context? = null
    @Volatile
    var lastStepReached: Int = 0
        private set
    @Volatile
    var lastAddViewResult: String = "NONE"
        private set
    @Volatile
    var lastSkipReason: String? = null
        private set
    @Volatile
    var lastException: String? = null
        private set
    @Volatile
    var lastLayoutDump: String? = null
        private set

    fun bind(context: Context) {
        val app = context.applicationContext
        appContext = app
        DiagnosticsEventQueue.bind(app)
        DiagnosticsEventQueue.flushAsync(app)
    }

    /** [1] 등에서 세션 시작 — 이미 있으면 재사용 */
    fun beginIncoming(context: Context, phoneRaw: String? = null) {
        bind(context)
        DiagnosticsSessionStore.ensureSession(
            context.applicationContext,
            DiagnosticsFeature.BIG_PUSH,
            phoneRaw
        )
    }

    fun step(n: Int, label: String, detail: String = "") {
        if (n > 0) lastStepReached = maxOf(lastStepReached, n)
        val msg = if (detail.isBlank()) "[$n] $label" else "[$n] $label | $detail"
        Log.i(TAG, msg)
        persist(msg)

        val ctx = appContext ?: return
        if (n <= 0) return
        val session = if (n == 11) {
            DiagnosticsSessionStore.current() ?: return
        } else {
            DiagnosticsSessionStore.current()
                ?: DiagnosticsSessionStore.ensureSession(ctx, DiagnosticsFeature.BIG_PUSH)
        }
        val code = when (n) {
            1 -> "INCOMING_CALL"
            2 -> "MONITOR_RECEIVED"
            3 -> "COORDINATOR_START_OVERLAY"
            4 -> "OVERLAY_ON_CREATE"
            5 -> "OVERLAY_ON_START"
            6 -> "SHOW_OVERLAY"
            7 -> "ADD_VIEW_CALL"
            8 -> "ADD_VIEW_SUCCESS"
            9 -> "REACT_ROOT_MOUNTED"
            10 -> "SHOWCASE_VISIBLE"
            11 -> "CALL_END"
            else -> "STEP_$n"
        }
        val endStatus = when {
            n != 11 -> null
            lastAddViewResult == "FAIL" || lastSkipReason != null -> "FAILED"
            else -> "OK"
        }
        DiagnosticsEventQueue.enqueueEvent(
            ctx,
            session,
            seq = n,
            code = code,
            label = "[$n] $label",
            ok = if (n == 11 && endStatus == "FAILED") false else true,
            payloadJson = if (detail.isNotBlank()) JSONObject().put("detail", detail) else null,
            statusHint = endStatus ?: "RUNNING"
        )
        if (n == 11 && endStatus != null) {
            DiagnosticsSessionStore.endSession(ctx, status = endStatus)
        }
    }

    fun skip(afterStep: Int, reason: String) {
        lastSkipReason = "SKIP after [$afterStep] reason = $reason"
        val msg = "SKIP after [$afterStep]\nreason = $reason"
        Log.w(TAG, msg)
        persist(msg)

        val ctx = appContext ?: return
        val session = DiagnosticsSessionStore.current()
            ?: DiagnosticsSessionStore.ensureSession(ctx, DiagnosticsFeature.BIG_PUSH)
        DiagnosticsEventQueue.enqueueEvent(
            ctx,
            session,
            seq = afterStep.coerceAtLeast(0),
            code = "SKIP",
            label = "SKIP after [$afterStep]",
            ok = false,
            reason = reason,
            statusHint = "SKIPPED"
        )
        /* 세션은 Call End / addView FAIL 에서 종료 — debounce SKIP이 정상 세션을 끊지 않도록 */
    }

    fun addViewCall(detail: String = "") {
        lastAddViewResult = "CALL"
        lastStepReached = maxOf(lastStepReached, 7)
        val msg = "[7] WindowManager.addView() CALL${if (detail.isBlank()) "" else " | $detail"}"
        Log.i(TAG, msg)
        persist(msg)

        val ctx = appContext ?: return
        val session = DiagnosticsSessionStore.current()
            ?: DiagnosticsSessionStore.ensureSession(ctx)
        DiagnosticsEventQueue.enqueueEvent(
            ctx,
            session,
            seq = 7,
            code = "ADD_VIEW_CALL",
            label = "[7] WindowManager.addView() CALL",
            ok = true,
            payloadJson = if (detail.isNotBlank()) JSONObject().put("detail", detail) else null
        )
    }

    fun addViewSuccess(detail: String = "") {
        lastAddViewResult = "SUCCESS"
        lastStepReached = maxOf(lastStepReached, 8)
        Log.i(TAG, "[8] WindowManager.addView() SUCCESS")
        persist("[8] WindowManager.addView() SUCCESS")

        val ctx = appContext ?: return
        val session = DiagnosticsSessionStore.current()
            ?: DiagnosticsSessionStore.ensureSession(ctx)
        DiagnosticsEventQueue.enqueueEvent(
            ctx,
            session,
            seq = 8,
            code = "ADD_VIEW_SUCCESS",
            label = "[8] WindowManager.addView() SUCCESS",
            ok = true,
            payloadJson = if (detail.isNotBlank()) JSONObject().put("detail", detail) else null
        )
    }

    fun addViewFail(e: Throwable) {
        lastAddViewResult = "FAIL"
        lastException = Log.getStackTraceString(e)
        Log.e(TAG, "[8] WindowManager.addView() FAIL")
        Log.e(TAG, "SKIP after [8]\nreason = ${e.javaClass.name}: ${e.message}", e)
        persist("[8] WindowManager.addView() FAIL")
        persist("SKIP after [8]\nreason = ${e.javaClass.name}: ${e.message}")
        persist("EXCEPTION:\n${lastException}")

        val ctx = appContext ?: return
        val session = DiagnosticsSessionStore.current()
            ?: DiagnosticsSessionStore.ensureSession(ctx)
        val top = e.stackTrace.firstOrNull()
        DiagnosticsEventQueue.enqueueEvent(
            ctx,
            session,
            seq = 8,
            code = "ADD_VIEW_FAIL",
            label = "[8] WindowManager.addView() FAIL",
            ok = false,
            reason = "${e.javaClass.simpleName}: ${e.message}",
            exceptionMessage = e.message,
            exceptionStack = lastException,
            exceptionFn = top?.let { "${it.className}.${it.methodName}" },
            exceptionLine = top?.lineNumber,
            statusHint = "FAILED"
        )
        DiagnosticsSessionStore.endSession(ctx, status = "FAILED")
    }

    fun dumpLayoutParams(params: WindowManager.LayoutParams, tag: String = "LayoutParams") {
        val dump = buildString {
            appendLine("==== $tag ====")
            appendLine("type = ${params.type}")
            appendLine("flags = ${params.flags} (0x${Integer.toHexString(params.flags)})")
            appendLine("gravity = ${params.gravity}")
            appendLine("x = ${params.x}")
            appendLine("y = ${params.y}")
            appendLine("width = ${params.width}")
            appendLine("height = ${params.height}")
            appendLine("format = ${params.format}")
            try {
                val pf = WindowManager.LayoutParams::class.java.getField("privateFlags")
                pf.isAccessible = true
                appendLine("privateFlags = ${pf.getInt(params)}")
            } catch (_: Exception) {
                appendLine("privateFlags = (unavailable)")
            }
            appendLine("alpha(param) = ${params.alpha}")
            appendLine("token = ${params.token}")
            appendLine("packageName = ${params.packageName}")
        }.trimEnd()
        lastLayoutDump = dump
        Log.i(TAG, dump)
        persist(dump)
    }

    fun dumpOverlayVisibility(
        view: View?,
        params: WindowManager.LayoutParams?,
        reactHint: String = ""
    ) {
        if (params != null) dumpLayoutParams(params, "WindowManager.LayoutParams @ runtime")
        if (view == null || params == null) {
            val msg = "[8+] visibility dump skipped | viewOrParams=null"
            Log.w(TAG, msg)
            persist(msg)
            return
        }
        val dump = buildString {
            appendLine("[8+] overlay visibility dump")
            appendLine("layoutParams.type = ${params.type}")
            appendLine("layoutParams.flags = ${params.flags} (0x${Integer.toHexString(params.flags)})")
            appendLine("gravity = ${params.gravity}")
            appendLine("width = ${params.width}")
            appendLine("height = ${params.height}")
            appendLine("x = ${params.x}")
            appendLine("y = ${params.y}")
            appendLine("format = ${params.format}")
            appendLine("alpha = ${view.alpha}")
            appendLine("visibility = ${visibilityName(view.visibility)}")
            appendLine("attachedToWindow = ${view.isAttachedToWindow}")
            appendLine("React Root 존재 여부 = $reactHint")
        }.trimEnd()
        lastLayoutDump = dump
        Log.i(TAG, dump)
        persist(dump)

        val ctx = appContext ?: return
        val session = DiagnosticsSessionStore.current() ?: return
        val overlayState = buildOverlayStateJson(ctx, view, params, reactHint)
        DiagnosticsEventQueue.enqueueEvent(
            ctx,
            session,
            seq = 8,
            code = "OVERLAY_STATE",
            label = "[8+] Overlay state dump",
            ok = true,
            payloadJson = overlayState,
            overlayState = overlayState
        )
    }

    fun buildOverlayStateJson(
        context: Context,
        view: View?,
        params: WindowManager.LayoutParams?,
        reactHint: String = ""
    ): JSONObject {
        var privateFlags = -1
        if (params != null) {
            try {
                val pf = WindowManager.LayoutParams::class.java.getField("privateFlags")
                pf.isAccessible = true
                privateFlags = pf.getInt(params)
            } catch (_: Exception) {
                privateFlags = -1
            }
        }
        val notifOk = if (Build.VERSION.SDK_INT >= 33) {
            LetteringPermissionHelper.hasPermission(
                context,
                android.Manifest.permission.POST_NOTIFICATIONS
            )
        } else {
            true
        }
        return JSONObject().apply {
            if (params != null) {
                put("type", params.type)
                put("flags", params.flags)
                put("flagsHex", "0x${Integer.toHexString(params.flags)}")
                put("gravity", params.gravity)
                put("x", params.x)
                put("y", params.y)
                put("width", params.width)
                put("height", params.height)
                put("format", params.format)
                put("privateFlags", privateFlags)
                put("alphaParam", params.alpha.toDouble())
            }
            put("alpha", (view?.alpha ?: -1f).toDouble())
            put("visibility", view?.let { visibilityName(it.visibility) } ?: "null")
            put("attachedToWindow", view?.isAttachedToWindow ?: false)
            put("overlayPermission", LetteringPermissionHelper.canDrawOverlays(context))
            put("notificationPermission", notifOk)
            put("foregroundServiceState", CallOverlayService.isRunning())
            put("reactHint", reactHint)
        }
    }

    fun summaryForReport(): String = buildString {
        appendLine("lastStepReached = $lastStepReached")
        appendLine("lastAddViewResult = $lastAddViewResult")
        appendLine("lastSkipReason = ${lastSkipReason ?: "(none)"}")
        appendLine("lastException = ${lastException ?: "(none)"}")
        appendLine("--- ring buffer (last ${ringBuffer.size}) ---")
        ringBuffer.takeLast(80).forEach { appendLine(it) }
        if (lastLayoutDump != null) {
            appendLine("--- last layout dump ---")
            appendLine(lastLayoutDump)
        }
    }

    private fun visibilityName(v: Int): String = when (v) {
        View.VISIBLE -> "VISIBLE"
        View.INVISIBLE -> "INVISIBLE"
        View.GONE -> "GONE"
        else -> "unknown($v)"
    }

    private fun persist(line: String) {
        val ts = SimpleDateFormat("HH:mm:ss.SSS", Locale.US).format(Date())
        val entry = "$ts $line"
        ringBuffer.add(entry)
        while (ringBuffer.size > 200) ringBuffer.removeAt(0)
        val ctx = appContext ?: return
        try {
            val f = File(ctx.filesDir, FILE_NAME)
            f.appendText(entry + "\n")
            ctx.getExternalFilesDir(null)?.let { ext ->
                File(ext, FILE_NAME).writeText(summaryForReport())
            }
        } catch (e: Exception) {
            Log.w(TAG, "persist failed: ${e.message}")
        }
    }
}
