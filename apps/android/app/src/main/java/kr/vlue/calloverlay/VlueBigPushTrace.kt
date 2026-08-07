package kr.vlue.calloverlay

import android.content.Context
import android.os.Build
import android.util.Log
import android.view.View
import android.view.ViewParent
import android.view.WindowManager
import kr.vlue.calloverlay.diagnostics.DiagnosticsEventQueue
import kr.vlue.calloverlay.diagnostics.DiagnosticsFeature
import kr.vlue.calloverlay.diagnostics.DiagnosticsSessionStore
import kr.vlue.calloverlay.diagnostics.OverlayDiagTracker
import org.json.JSONObject
import java.io.File
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.concurrent.CopyOnWriteArrayList

/**
 * Big Push 파이프라인 추적 + 원격 Diagnostics.
 *
 * [1] Incoming … [7] addView CALL
 * [8] addView SUCCESS | FAIL | EXCEPTION
 * [9] React Root · [10] Showcase Visible · [11] Call End
 *
 * 세션 FAILED 는 addView EXCEPTION/FAIL 등 실제 단말 실패에만 설정한다.
 * SKIP(권한·debounce)은 이벤트만 남기고 세션 전체를 FAIL 로 물들이지 않는다.
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
    /** NONE | CALL | SUCCESS | FAIL | EXCEPTION */
    @Volatile
    var lastAddViewResult: String = "NONE"
        private set
    @Volatile
    var lastSkipReason: String? = null
        private set
    /** 세션을 FAILED 로 끝낼 실제 실패 reason (exception 등) */
    @Volatile
    private var terminalFailReason: String? = null
    @Volatile
    private var terminalFailStep: Int? = null
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

    fun beginIncoming(context: Context, phoneRaw: String? = null, source: String = "unknown") {
        bind(context)
        val (session, created) = DiagnosticsSessionStore.ensureSession(
            context.applicationContext,
            DiagnosticsFeature.BIG_PUSH,
            phoneRaw,
            source = source
        )
        Log.i(TAG, "beginIncoming source=$source sessionId=${session.id} created=$created")
        persist("beginIncoming source=$source sessionId=${session.id} created=$created")
    }

    fun step(n: Int, label: String, detail: String = "") {
        if (n > 0) lastStepReached = maxOf(lastStepReached, n)
        val diag = OverlayDiagTracker.detailSuffix()
        val msg = buildString {
            append("[$n] $label")
            if (detail.isNotBlank()) append(" | $detail")
            append(" | $diag")
        }
        Log.i(TAG, msg)
        persist(msg)

        val ctx = appContext ?: return
        if (n <= 0) return
        /* 새 세션 생성 금지 — beginIncoming 만 생성. 늦은 이벤트는 recent grace 사용 */
        val session = DiagnosticsSessionStore.currentOrRecent() ?: return
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
            terminalFailReason != null ||
                lastAddViewResult == "EXCEPTION" ||
                lastAddViewResult == "FAIL" -> "FAILED"
            lastAddViewResult == "SUCCESS" || lastStepReached >= 8 -> "OK"
            else -> "OK"
        }
        val payload = JSONObject().apply {
            if (detail.isNotBlank()) put("detail", detail)
            put("sessionId", session.id)
            put("overlayDiag", OverlayDiagTracker.snapshotJson())
        }
        DiagnosticsEventQueue.enqueueEvent(
            ctx,
            session,
            seq = n,
            code = code,
            label = "[$n] $label",
            ok = true,
            payloadJson = payload,
            statusHint = endStatus ?: "RUNNING",
            terminalFailure = endStatus == "FAILED",
            failStepOverride = if (endStatus == "FAILED") terminalFailStep else null,
            failReasonOverride = if (endStatus == "FAILED") terminalFailReason else null,
            overlayState = OverlayDiagTracker.snapshotJson().apply {
                /* merge view fields if last overlay state exists elsewhere — keep diag counts visible */
            }
        )
        if (n == 11 && endStatus != null) {
            DiagnosticsSessionStore.endSession(ctx, status = endStatus)
            resetSessionLocals()
        }
    }

    /**
     * 분기 스킵 기록. 세션 FAILED 로 승격하지 않음 (terminal=true 만 예외).
     * reason 은 호출부가 넘긴 실제 조건 문자열만 저장.
     */
    fun skip(afterStep: Int, reason: String, terminal: Boolean = false) {
        lastSkipReason = "SKIP after [$afterStep] reason = $reason"
        val msg = "SKIP after [$afterStep]\nreason = $reason"
        Log.w(TAG, msg)
        persist(msg)

        val ctx = appContext ?: return
        val session = DiagnosticsSessionStore.currentOrRecent()
            ?: DiagnosticsSessionStore.ensureSession(ctx, DiagnosticsFeature.BIG_PUSH, source = "skip").first
        if (terminal) {
            terminalFailReason = reason
            terminalFailStep = afterStep
        }
        DiagnosticsEventQueue.enqueueEvent(
            ctx,
            session,
            seq = afterStep.coerceAtLeast(0),
            code = "SKIP",
            label = "SKIP after [$afterStep]",
            ok = if (terminal) false else null,
            reason = reason,
            statusHint = if (terminal) "SKIPPED" else "RUNNING",
            terminalFailure = terminal,
            payloadJson = JSONObject().apply {
                put("terminal", terminal)
                put("sessionId", session.id)
                put("overlayDiag", OverlayDiagTracker.snapshotJson())
            },
            overlayState = OverlayDiagTracker.snapshotJson()
        )
    }

    fun addViewCall(detail: String = "") {
        lastAddViewResult = "CALL"
        lastStepReached = maxOf(lastStepReached, 7)
        val msg = "[7] WindowManager.addView() CALL${if (detail.isBlank()) "" else " | $detail"}"
        Log.i(TAG, msg)
        persist(msg)

        val ctx = appContext ?: return
        val session = DiagnosticsSessionStore.currentOrRecent() ?: return
        DiagnosticsEventQueue.enqueueEvent(
            ctx,
            session,
            seq = 7,
            code = "ADD_VIEW_CALL",
            label = "[7] WindowManager.addView() CALL",
            ok = true,
            payloadJson = JSONObject().apply {
                if (detail.isNotBlank()) put("detail", detail)
                put("overlayDiag", OverlayDiagTracker.snapshotJson())
            },
            overlayState = OverlayDiagTracker.snapshotJson()
        )
    }

    fun addViewSuccess(
        view: View?,
        params: WindowManager.LayoutParams?,
        detail: String = ""
    ) {
        lastAddViewResult = "SUCCESS"
        lastStepReached = maxOf(lastStepReached, 8)
        /* 이전 SKIP(권한 등)이 있어도 addView 성공이면 세션 terminal 실패 해제 */
        lastSkipReason = null
        if (terminalFailStep != null && terminalFailStep!! <= 7) {
            terminalFailReason = null
            terminalFailStep = null
        }
        Log.i(TAG, "[8] WindowManager.addView() SUCCESS")
        persist("[8] WindowManager.addView() SUCCESS")

        val ctx = appContext ?: return
        val session = DiagnosticsSessionStore.currentOrRecent() ?: return
        val payload = collectAddViewSuccessSnapshot(ctx, view, params, detail)
        val overlayState = buildOverlayStateJson(ctx, view, params, "addView SUCCESS")
        payload.keys().forEach { key ->
            if (!overlayState.has(key)) overlayState.put(key, payload.get(key))
        }
        DiagnosticsEventQueue.enqueueEvent(
            ctx,
            session,
            seq = 8,
            code = "ADD_VIEW_SUCCESS",
            label = "[8] WindowManager.addView() SUCCESS",
            ok = true,
            payloadJson = payload,
            overlayState = overlayState
        )
        /* 레이아웃 직후 measured/actual 이 0일 수 있어 다음 프레임에 한 번 더 기록 */
        view?.post {
            val app = appContext ?: return@post
            val s = DiagnosticsSessionStore.currentOrRecent() ?: return@post
            val late = collectAddViewSuccessSnapshot(app, view, params, "$detail|postLayout")
            DiagnosticsEventQueue.enqueueEvent(
                app,
                s,
                seq = 8,
                code = "ADD_VIEW_SUCCESS_LAYOUT",
                label = "[8+] addView SUCCESS layout snapshot",
                ok = true,
                payloadJson = late,
                overlayState = late
            )
        }
    }

    /** Soft fail — 예외 없이 addView 미호출/거부된 경우 (현재 경로에선 거의 미사용) */
    fun addViewFail(reason: String) {
        lastAddViewResult = "FAIL"
        terminalFailReason = reason
        terminalFailStep = 8
        lastStepReached = maxOf(lastStepReached, 8)
        Log.e(TAG, "[8] WindowManager.addView() FAIL | $reason")
        persist("[8] WindowManager.addView() FAIL | $reason")

        val ctx = appContext ?: return
        val session = DiagnosticsSessionStore.currentOrRecent() ?: return
        DiagnosticsEventQueue.enqueueEvent(
            ctx,
            session,
            seq = 8,
            code = "ADD_VIEW_FAIL",
            label = "[8] WindowManager.addView() FAIL",
            ok = false,
            reason = reason,
            payloadJson = JSONObject().put("result", "FAIL").put("overlayDiag", OverlayDiagTracker.snapshotJson()),
            statusHint = "FAILED",
            terminalFailure = true,
            overlayState = OverlayDiagTracker.snapshotJson()
        )
    }

    /** addView 중 Throwable — EXCEPTION */
    fun addViewException(e: Throwable) {
        lastAddViewResult = "EXCEPTION"
        lastException = Log.getStackTraceString(e)
        val reason = "${e.javaClass.simpleName}: ${e.message}"
        terminalFailReason = reason
        terminalFailStep = 8
        lastStepReached = maxOf(lastStepReached, 8)
        Log.e(TAG, "[8] WindowManager.addView() EXCEPTION", e)
        persist("[8] WindowManager.addView() EXCEPTION")
        persist("reason = $reason")
        persist("EXCEPTION:\n$lastException")

        val ctx = appContext ?: return
        val session = DiagnosticsSessionStore.currentOrRecent() ?: return
        val top = e.stackTrace.firstOrNull()
        DiagnosticsEventQueue.enqueueEvent(
            ctx,
            session,
            seq = 8,
            code = "ADD_VIEW_EXCEPTION",
            label = "[8] WindowManager.addView() EXCEPTION",
            ok = false,
            reason = reason,
            exceptionMessage = e.message,
            exceptionStack = lastException,
            exceptionFn = top?.let { "${it.className}.${it.methodName}" },
            exceptionLine = top?.lineNumber,
            payloadJson = JSONObject().put("result", "EXCEPTION").put("overlayDiag", OverlayDiagTracker.snapshotJson()),
            statusHint = "FAILED",
            terminalFailure = true,
            overlayState = OverlayDiagTracker.snapshotJson()
        )
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
            appendLine("windowToken = ${view.windowToken}")
            appendLine("parent = ${describeParent(view.parent)}")
            appendLine("React Root 존재 여부 = $reactHint")
        }.trimEnd()
        lastLayoutDump = dump
        Log.i(TAG, dump)
        persist(dump)

        val ctx = appContext ?: return
        val session = DiagnosticsSessionStore.currentOrRecent() ?: return
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
                put("layoutParamsToken", params.token?.toString() ?: "null")
            }
            put("alpha", (view?.alpha ?: -1f).toDouble())
            putAllViewWindowFields(this, context, view)
            put("overlayPermission", LetteringPermissionHelper.canDrawOverlays(context))
            put("notificationPermission", notifOk)
            put("foregroundServiceState", CallOverlayService.isRunning())
            put("reactHint", reactHint)
        }
    }

    /** addView SUCCESS 필수 스냅샷 필드 */
    private fun collectAddViewSuccessSnapshot(
        context: Context,
        view: View?,
        params: WindowManager.LayoutParams?,
        detail: String
    ): JSONObject = JSONObject().apply {
        put("result", "SUCCESS")
        if (detail.isNotBlank()) put("detail", detail)
        putAllViewWindowFields(this, context, view)
        if (params != null) {
            put("type", params.type)
            put("flags", params.flags)
            put("width", params.width)
            put("height", params.height)
        }
    }

    private fun putAllViewWindowFields(target: JSONObject, context: Context, view: View?) {
        val root = view?.rootView
        target.put("windowToken", view?.windowToken?.toString() ?: "null")
        target.put("rootViewHashCode", root?.hashCode() ?: -1)
        target.put("parent", describeParent(view?.parent))
        target.put("isAttachedToWindow", view?.isAttachedToWindow ?: false)
        target.put("attachedToWindow", view?.isAttachedToWindow ?: false)
        target.put("isShown", view?.isShown ?: false)
        target.put("visibility", view?.let { visibilityName(it.visibility) } ?: "null")
        target.put("measuredWidth", view?.measuredWidth ?: -1)
        target.put("measuredHeight", view?.measuredHeight ?: -1)
        target.put("actualWidth", view?.width ?: -1)
        target.put("actualHeight", view?.height ?: -1)
        target.put(
            "windowVisibility",
            view?.let { visibilityName(it.windowVisibility) } ?: "null"
        )
        target.put("displayId", resolveDisplayId(context, view))
        target.put("currentActivity", VlueCallOverlayApp.currentActivityName ?: "(none)")
        target.put("topPackage", resolveTopPackage(context))
        val diag = OverlayDiagTracker.snapshotJson()
        diag.keys().forEach { k -> target.put(k, diag.get(k)) }
    }

    private fun resolveDisplayId(context: Context, view: View?): Int {
        return try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                view?.display?.displayId ?: context.display?.displayId ?: 0
            } else {
                @Suppress("DEPRECATION")
                (context.getSystemService(Context.WINDOW_SERVICE) as? WindowManager)
                    ?.defaultDisplay?.displayId ?: 0
            }
        } catch (_: Exception) {
            -1
        }
    }

    private fun resolveTopPackage(context: Context): String {
        try {
            val usm = context.getSystemService(Context.USAGE_STATS_SERVICE) as? android.app.usage.UsageStatsManager
            if (usm != null) {
                val end = System.currentTimeMillis()
                val stats = usm.queryUsageStats(
                    android.app.usage.UsageStatsManager.INTERVAL_DAILY,
                    end - 60_000L,
                    end
                )
                val top = stats?.maxByOrNull { it.lastTimeUsed }
                if (top != null && !top.packageName.isNullOrBlank()) {
                    return top.packageName
                }
            }
        } catch (_: Exception) {
            /* PACKAGE_USAGE_STATS 없을 수 있음 */
        }
        try {
            val am = context.getSystemService(Context.ACTIVITY_SERVICE) as? android.app.ActivityManager
            @Suppress("DEPRECATION")
            val tasks = am?.getRunningTasks(1)
            val pkg = tasks?.firstOrNull()?.topActivity?.packageName
            if (!pkg.isNullOrBlank()) return pkg
        } catch (_: Exception) {
            /* GET_TASKS 제한 */
        }
        return context.packageName
    }

    fun lifecycle(code: String, detail: String = "") {
        val ctx = appContext ?: return
        val session = DiagnosticsSessionStore.currentOrRecent() ?: return
        val msg = "[lifecycle] $code | $detail | ${OverlayDiagTracker.detailSuffix()}"
        Log.i(TAG, msg)
        persist(msg)
        DiagnosticsEventQueue.enqueueEvent(
            ctx,
            session,
            seq = 0,
            code = code,
            label = code,
            ok = true,
            payloadJson = JSONObject().apply {
                put("detail", detail)
                put("sessionId", session.id)
                put("overlayDiag", OverlayDiagTracker.snapshotJson())
            },
            overlayState = OverlayDiagTracker.snapshotJson()
        )
    }

    fun summaryForReport(): String = buildString {
        appendLine("lastStepReached = $lastStepReached")
        appendLine("lastAddViewResult = $lastAddViewResult")
        appendLine("lastSkipReason = ${lastSkipReason ?: "(none)"}")
        appendLine("terminalFailReason = ${terminalFailReason ?: "(none)"}")
        appendLine("lastException = ${lastException ?: "(none)"}")
        appendLine("--- ring buffer (last ${ringBuffer.size}) ---")
        ringBuffer.takeLast(80).forEach { appendLine(it) }
        if (lastLayoutDump != null) {
            appendLine("--- last layout dump ---")
            appendLine(lastLayoutDump)
        }
    }

    private fun resetSessionLocals() {
        lastSkipReason = null
        terminalFailReason = null
        terminalFailStep = null
        lastAddViewResult = "NONE"
        lastException = null
    }

    private fun describeParent(parent: ViewParent?): String {
        if (parent == null) return "null"
        return parent.javaClass.name
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
