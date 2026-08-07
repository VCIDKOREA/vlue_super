package kr.vlue.calloverlay

import android.Manifest
import android.content.Context
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.provider.Settings
import android.util.Log
import android.view.View
import android.view.ViewParent
import android.view.WindowManager
import kr.vlue.calloverlay.diagnostics.ActiveDiagnosticSession
import kr.vlue.calloverlay.diagnostics.DiagnosticsEventQueue
import kr.vlue.calloverlay.diagnostics.DiagnosticsFeature
import kr.vlue.calloverlay.diagnostics.DiagnosticsMilestoneClock
import kr.vlue.calloverlay.diagnostics.DiagnosticsPerfSegments
import kr.vlue.calloverlay.diagnostics.DiagnosticsSessionStore
import kr.vlue.calloverlay.diagnostics.NormalOverlayProbe
import kr.vlue.calloverlay.diagnostics.OverlayDiagTracker
import kr.vlue.calloverlay.diagnostics.OverlayProbeEvidence
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
    private val mainHandler = Handler(Looper.getMainLooper())
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
        if (created) {
            resetSessionLocals()
            DiagnosticsMilestoneClock.clear(session.id)
        }
        Log.i(TAG, "beginIncoming source=$source sessionId=${session.id} created=$created")
        persist("beginIncoming source=$source sessionId=${session.id} created=$created")
    }

    /**
     * 성능 Timeline 마일스톤 — 발생 즉시 1회 기록 (동일 code 중복 무시).
     * SystemClock.elapsedRealtimeNanos 기준 elapsed/delta 는 enqueueEvent 가 붙인다.
     */
    fun milestone(code: String, label: String, seq: Int, detail: String = "") {
        val ctx = appContext ?: return
        val session = DiagnosticsSessionStore.currentOrRecent() ?: return
        val nowNanos = android.os.SystemClock.elapsedRealtimeNanos()
        val elapsed = session.elapsedMsFromNanos(nowNanos)
        if (!DiagnosticsMilestoneClock.note(session.id, code, elapsed)) return

        val payload = JSONObject().apply {
            if (detail.isNotBlank()) put("detail", detail)
            put("milestone", true)
            put("perfCode", code)
            put("overlayDiag", OverlayDiagTracker.snapshotJson())
        }
        DiagnosticsEventQueue.enqueueEvent(
            ctx,
            session,
            seq = seq,
            code = code,
            label = label,
            ok = true,
            payloadJson = payload,
            overlayState = OverlayDiagTracker.snapshotJson()
        )
    }

    private fun emitPerfSummary(session: ActiveDiagnosticSession, ctx: Context, force: Boolean = false) {
        val pairs = DiagnosticsMilestoneClock.snapshot(session.id)
        if (pairs.isEmpty()) return
        /* 요약은 주요 마일스톤에서만 — 매 이벤트 upsert 폭주 방지 */
        if (!force) return
        val perf = DiagnosticsPerfSegments.compute(pairs)
        DiagnosticsEventQueue.enqueueEvent(
            ctx,
            session,
            seq = 0,
            code = "PERF_SUMMARY",
            label = "Performance Summary",
            ok = true,
            payloadJson = JSONObject().apply {
                put("perf", perf)
                put("summary", perf.optJSONObject("summary") ?: JSONObject())
            }
        )
    }

    fun emitPerfSummaryNow() {
        val ctx = appContext ?: return
        val session = DiagnosticsSessionStore.currentOrRecent() ?: return
        emitPerfSummary(session, ctx, force = true)
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
            9 -> "REACT_ROOT_READY"
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
        DiagnosticsMilestoneClock.note(session.id, code, session.elapsedMsFromNanos())
        when (n) {
            3 -> milestone("BIG_PUSH_REQUESTED", "BigPush Requested", 3, detail)
            10, 11 -> emitPerfSummaryNow()
        }
        if (n == 11 && endStatus != null) {
            DiagnosticsSessionStore.endSession(ctx, status = endStatus)
            DiagnosticsMilestoneClock.clear(session.id)
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
        /* 레이아웃 직후 + 300ms/1000ms attach 재확인 (중간에 removeView 되는지) */
        view?.post {
            scheduleAttachRecheck(view, params, detail, delayMs = 0L, code = "ADD_VIEW_SUCCESS_LAYOUT")
            scheduleAttachRecheck(view, params, detail, delayMs = 300L, code = "ADD_VIEW_ATTACH_300MS")
            scheduleAttachRecheck(view, params, detail, delayMs = 1000L, code = "ADD_VIEW_ATTACH_1000MS")
        }
    }

    private fun scheduleAttachRecheck(
        view: View,
        params: WindowManager.LayoutParams?,
        detail: String,
        delayMs: Long,
        code: String
    ) {
        mainHandler.postDelayed({
            val app = appContext ?: return@postDelayed
            val s = DiagnosticsSessionStore.currentOrRecent() ?: return@postDelayed
            val snap = collectAddViewSuccessSnapshot(
                app,
                view,
                params,
                "$detail|$code"
            )
            val attached = view.isAttachedToWindow
            snap.put("recheckDelayMs", delayMs)
            snap.put("isAttachedToWindow", attached)
            snap.put("attachedToWindow", attached)
            if (!attached && delayMs > 0) {
                snap.put(
                    "attachLostHint",
                    "isAttachedToWindow=false after ${delayMs}ms — removeView() may have been called"
                )
                Log.w(TAG, "[$code] attach lost after ${delayMs}ms ${OverlayDiagTracker.detailSuffix()}")
            }
            DiagnosticsEventQueue.enqueueEvent(
                app,
                s,
                seq = 8,
                code = code,
                label = "[8+] $code attached=$attached",
                ok = true,
                reason = if (!attached && delayMs > 0) {
                    "isAttachedToWindow=false after ${delayMs}ms — possible removeView()"
                } else {
                    null
                },
                payloadJson = snap,
                overlayState = snap
            )
        }, delayMs)
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

    /**
     * NORMAL_OVERLAY_PROBE | CALL_OVERLAY_PROBE
     * result: SUCCESS | FAIL | EXCEPTION
     * 동일 type/LayoutParams/Context 로 통화 중 vs 유휴 addView 비교.
     */
    fun recordOverlayAddViewProbe(
        context: Context,
        probeKind: String,
        result: String,
        params: WindowManager.LayoutParams?,
        error: Throwable? = null,
        extra: JSONObject? = null
    ) {
        val app = context.applicationContext
        val canDraw = try {
            Settings.canDrawOverlays(context)
        } catch (_: Exception) {
            false
        }
        val normalPrior = NormalOverlayProbe.lastResultJson(app)
        val priorResult = normalPrior.optString("result", "").takeIf {
            it.isNotBlank() && !it.equals("null", true)
        }
        /* NORMAL 기록 직후에는 prior가 아직 없음 — 자기 결과는 result 사용 */
        val priorForEvidence =
            if (probeKind == "NORMAL_OVERLAY_PROBE") result else priorResult
        val built = OverlayProbeEvidence.build(
            context = context,
            probeKind = probeKind,
            result = result,
            params = params,
            canDrawOverlays = canDraw,
            priorNormalResult = if (probeKind == "CALL_OVERLAY_PROBE") priorResult else priorForEvidence,
            errorMessage = error?.message,
            errorClass = error?.javaClass?.name
        )
        val installer = OverlayProbeEvidence.resolveInstaller(context)
        val samsungCallPolicyLikely = built.conclusion == "SamsungCallPolicyLikely"
        val permissionOrContextLikely = built.conclusion == "PermissionOrContextLikely"
        val evidenceText = built.evidenceLines.joinToString("\n")
        val payload = JSONObject().apply {
            put("probeKind", probeKind)
            put("result", result)
            put("canDrawOverlays", canDraw)
            put("contextClass", context.javaClass.name)
            put("contextIsService", context is android.app.Service)
            put("sdkInt", Build.VERSION.SDK_INT)
            put("targetSdkVersion", try {
                context.applicationInfo.targetSdkVersion
            } catch (_: Exception) {
                -1
            })
            put("layoutParamsType", params?.type ?: -1)
            put(
                "layoutParamsTypeName",
                if (params?.type == WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY) {
                    "TYPE_APPLICATION_OVERLAY(2038)"
                } else {
                    "type=${params?.type}"
                }
            )
            if (params != null) {
                put("flags", params.flags)
                put("flagsHex", "0x${Integer.toHexString(params.flags)}")
                put("gravity", params.gravity)
                put("width", params.width)
                put("height", params.height)
                put("format", params.format)
                put("x", params.x)
                put("y", params.y)
            }
            put("manufacturer", Build.MANUFACTURER ?: "")
            put("model", Build.MODEL ?: "")
            put("installerPackage", installer ?: JSONObject.NULL)
            put("priorNormalOverlayProbe", normalPrior)
            put("samsungCallPolicyLikely", samsungCallPolicyLikely)
            put("permissionOrContextLikely", permissionOrContextLikely)
            put("analysisHint", built.analysisHint)
            put("analysis", built.analysisJson)
            put("evidence", built.evidence)
            put("evidenceScore", built.confidence)
            put("confidence", built.confidence)
            put("confidenceLabel", "${built.confidence}%")
            put("evidenceText", evidenceText)
            put(
                "analysisReport",
                buildString {
                    appendLine("Analysis")
                    appendLine(built.conclusion)
                    appendLine("Confidence : ${built.confidence}%")
                    appendLine()
                    appendLine("Evidence")
                    built.evidenceLines.forEach { appendLine(it) }
                }.trim()
            )
            if (error != null) {
                put("errorClass", error.javaClass.name)
                put("errorMessage", error.message ?: "")
            }
            extra?.keys()?.forEach { k -> put(k, extra.get(k)) }
        }
        val msg = "==== $probeKind $result ====\n${payload.toString(2)}"
        Log.i(TAG, msg)
        persist(msg)
        persist(payload.optString("analysisReport"))

        if (probeKind == "NORMAL_OVERLAY_PROBE") {
            val sid = DiagnosticsSessionStore.currentOrRecent()?.id
            NormalOverlayProbe.rememberResult(app, result, error?.message ?: result, sid)
        }

        val session = DiagnosticsSessionStore.currentOrRecent() ?: return
        val ok = result == "SUCCESS"
        DiagnosticsEventQueue.enqueueEvent(
            app,
            session,
            seq = if (probeKind == "NORMAL_OVERLAY_PROBE") 0 else 8,
            code = probeKind,
            label = "$probeKind $result | ${built.conclusion} ${built.confidence}%",
            ok = ok,
            reason = if (!ok) (error?.message ?: result) else null,
            exceptionMessage = error?.message,
            exceptionStack = error?.let { Log.getStackTraceString(it) },
            payloadJson = payload,
            overlayState = payload,
            statusHint = when {
                probeKind == "NORMAL_OVERLAY_PROBE" && !ok -> "FAILED"
                probeKind == "CALL_OVERLAY_PROBE" && !ok -> "FAILED"
                else -> null
            },
            /* CALL 실패는 기존 ADD_VIEW_EXCEPTION 이 terminal 처리. NORMAL 은 OVERLAY 세션만 실패 */
            terminalFailure = probeKind == "NORMAL_OVERLAY_PROBE" && !ok
        )
        DiagnosticsEventQueue.flushAsync(app)
    }

    /**
     * TYPE_APPLICATION_OVERLAY 거부 원인 진단용.
     * canDrawOverlays / Context / type / SDK / targetSdk / Manifest 선언 여부를 서버로 전송.
     */
    fun dumpOverlayPermissionProbe(
        context: Context,
        params: WindowManager.LayoutParams?,
        phase: String,
        error: Throwable? = null
    ) {
        val app = context.applicationContext
        val canDraw = try {
            Settings.canDrawOverlays(context)
        } catch (e: Exception) {
            false
        }
        val canDrawAppCtx = try {
            Settings.canDrawOverlays(app)
        } catch (_: Exception) {
            false
        }
        val targetSdk = try {
            context.applicationInfo.targetSdkVersion
        } catch (_: Exception) {
            -1
        }
        val manifestHasSaw = try {
            val pi = context.packageManager.getPackageInfo(
                context.packageName,
                android.content.pm.PackageManager.GET_PERMISSIONS
            )
            pi.requestedPermissions?.any { it == Manifest.permission.SYSTEM_ALERT_WINDOW } == true
        } catch (_: Exception) {
            false
        }
        val installer = try {
            if (Build.VERSION.SDK_INT >= 30) {
                context.packageManager.getInstallSourceInfo(context.packageName).installingPackageName
            } else {
                @Suppress("DEPRECATION")
                context.packageManager.getInstallerPackageName(context.packageName)
            }
        } catch (_: Exception) {
            null
        }
        val typeName = when (params?.type) {
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY -> "TYPE_APPLICATION_OVERLAY(2038)"
            else -> "type=${params?.type}"
        }
        val probe = JSONObject().apply {
            put("phase", phase)
            put("canDrawOverlays_thisContext", canDraw)
            put("canDrawOverlays_applicationContext", canDrawAppCtx)
            put("contextClass", context.javaClass.name)
            put("contextIsService", context is android.app.Service)
            put("contextIsActivity", context is android.app.Activity)
            put("contextIsApplication", context is android.app.Application)
            put("windowManagerFrom", "Context.WINDOW_SERVICE via Service")
            put("layoutParamsType", params?.type ?: -1)
            put("layoutParamsTypeName", typeName)
            put("sdkInt", Build.VERSION.SDK_INT)
            put("release", Build.VERSION.RELEASE ?: "")
            put("targetSdkVersion", targetSdk)
            put("typeChangedForTargetSdk34Plus", false)
            put("typeSelectionRule", "SDK_INT>=O → TYPE_APPLICATION_OVERLAY else TYPE_PHONE (no targetSdk branch)")
            put("manifestSystemAlertWindow", manifestHasSaw)
            put("installerPackage", installer ?: "(null=sideload/unknown)")
            put("manufacturer", Build.MANUFACTURER ?: "")
            put("brand", Build.BRAND ?: "")
            put("model", Build.MODEL ?: "")
            if (params != null) {
                put("flags", params.flags)
                put("flagsHex", "0x${Integer.toHexString(params.flags)}")
                put("gravity", params.gravity)
                put("x", params.x)
                put("y", params.y)
                put("width", params.width)
                put("height", params.height)
                put("format", params.format)
                put("packageName", params.packageName ?: JSONObject.NULL)
                put("token", params.token?.toString() ?: "null")
            }
            if (error != null) {
                put("errorClass", error.javaClass.name)
                put("errorMessage", error.message ?: "")
            }
            put(
                "analysisHint",
                if (!canDraw) {
                    "canDrawOverlays=false — user must grant Draw over other apps"
                } else if (
                    (Build.MANUFACTURER.equals("samsung", true) ||
                        Build.BRAND.equals("samsung", true)) &&
                    (error?.message?.contains("2038") == true ||
                        error?.message?.contains("permission denied") == true)
                ) {
                    "Samsung may block TYPE_APPLICATION_OVERLAY during calls for non-store/non-ADB installs (SamsungRestrictOverlayProcessor) even when canDrawOverlays==true"
                } else {
                    "canDrawOverlays=true — if still denied, OEM runtime restrict or wrong window type"
                }
            )
        }
        val msg = buildString {
            appendLine("==== OVERLAY_PERMISSION_PROBE ($phase) ====")
            appendLine(probe.toString(2))
        }
        Log.i(TAG, msg)
        persist(msg)

        val session = DiagnosticsSessionStore.currentOrRecent() ?: return
        val ctx = appContext ?: context.applicationContext
        DiagnosticsEventQueue.enqueueEvent(
            ctx,
            session,
            seq = 8,
            code = "OVERLAY_PERMISSION_PROBE",
            label = "[8+] Overlay permission probe ($phase)",
            ok = canDraw && error == null,
            reason = error?.message,
            exceptionMessage = error?.message,
            exceptionStack = error?.let { Log.getStackTraceString(it) },
            payloadJson = probe,
            overlayState = probe
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
            put("layoutParamsType", params.type)
            put("flags", params.flags)
            put("layoutParamsFlags", params.flags)
            put("flagsHex", "0x${Integer.toHexString(params.flags)}")
            put("x", params.x)
            put("y", params.y)
            put("layoutParamsX", params.x)
            put("layoutParamsY", params.y)
            put("width", params.width)
            put("height", params.height)
        }
    }

    private fun putAllViewWindowFields(target: JSONObject, context: Context, view: View?) {
        val root = view?.rootView
        val parent = view?.parent
        val wmCount = windowManagerGlobalViewCount()
        val loc = IntArray(2)
        if (view != null) {
            try {
                view.getLocationOnScreen(loc)
            } catch (_: Exception) {
                loc[0] = Int.MIN_VALUE
                loc[1] = Int.MIN_VALUE
            }
        }
        val vw = view?.width ?: -1
        val vh = view?.height ?: -1
        val screenW = try {
            context.resources.displayMetrics.widthPixels
        } catch (_: Exception) {
            -1
        }
        val screenH = try {
            context.resources.displayMetrics.heightPixels
        } catch (_: Exception) {
            -1
        }
        val offScreen = when {
            view == null || loc[0] == Int.MIN_VALUE -> null
            vw <= 0 || vh <= 0 -> true
            loc[0] + vw <= 0 || loc[1] + vh <= 0 -> true
            loc[0] >= screenW || loc[1] >= screenH -> true
            else -> false
        }

        target.put("windowManagerGlobalViewCount", wmCount)
        target.put("overlayViewHashCode", view?.hashCode() ?: -1)
        target.put("rootViewHashCode", root?.hashCode() ?: -1)
        target.put("rootViewParentHashCode", parent?.hashCode() ?: -1)
        target.put("parent", describeParent(parent))
        target.put("windowToken", view?.windowToken?.toString() ?: "null")
        target.put("isAttachedToWindow", view?.isAttachedToWindow ?: false)
        target.put("attachedToWindow", view?.isAttachedToWindow ?: false)
        target.put("isShown", view?.isShown ?: false)
        target.put("visibility", view?.let { visibilityName(it.visibility) } ?: "null")
        target.put(
            "windowVisibility",
            view?.let { visibilityName(it.windowVisibility) } ?: "null"
        )
        target.put("alpha", (view?.alpha ?: -1f).toDouble())
        target.put("measuredWidth", view?.measuredWidth ?: -1)
        target.put("measuredHeight", view?.measuredHeight ?: -1)
        target.put("actualWidth", vw)
        target.put("actualHeight", vh)
        target.put("viewWidth", vw)
        target.put("viewHeight", vh)
        target.put("locationOnScreenX", if (loc[0] == Int.MIN_VALUE) JSONObject.NULL else loc[0])
        target.put("locationOnScreenY", if (loc[1] == Int.MIN_VALUE) JSONObject.NULL else loc[1])
        target.put("offScreen", offScreen ?: JSONObject.NULL)
        target.put("displayId", resolveDisplayId(context, view))
        val topPkg = resolveTopPackage(context)
        val topActivity = resolveTopActivityComponent(context)
        val currentAct = VlueCallOverlayApp.currentActivityName ?: "(none)"
        target.put("topPackage", topPkg)
        target.put("currentActivity", currentAct)
        target.put("topActivityComponent", topActivity ?: "(unknown)")
        target.put("topUiKind", classifyTopUi(topPkg, topActivity, currentAct, context.packageName))
        val inWm = view != null && isViewInWindowManagerGlobal(view)
        target.put("overlayListedInWindowManagerGlobal", inWm)
        val diag = OverlayDiagTracker.snapshotJson()
        diag.keys().forEach { k -> target.put(k, diag.get(k)) }
    }

    /** WindowManagerGlobal.mViews size — 실제 WM 등록 View 개수 */
    private fun windowManagerGlobalViewCount(): Int {
        return try {
            val clz = Class.forName("android.view.WindowManagerGlobal")
            val inst = clz.getMethod("getInstance").invoke(null)
            val field = clz.getDeclaredField("mViews")
            field.isAccessible = true
            val views = field.get(inst)
            when (views) {
                is java.util.List<*> -> views.size
                is Array<*> -> views.size
                else -> -1
            }
        } catch (_: Exception) {
            -1
        }
    }

    private fun isViewInWindowManagerGlobal(view: View): Boolean {
        return try {
            val clz = Class.forName("android.view.WindowManagerGlobal")
            val inst = clz.getMethod("getInstance").invoke(null)
            val field = clz.getDeclaredField("mViews")
            field.isAccessible = true
            val views = field.get(inst)
            when (views) {
                is java.util.List<*> -> views.any { it === view || it === view.rootView }
                is Array<*> -> views.any { it === view || it === view.rootView }
                else -> false
            }
        } catch (_: Exception) {
            false
        }
    }

    private fun resolveTopActivityComponent(context: Context): String? {
        try {
            val am = context.getSystemService(Context.ACTIVITY_SERVICE) as? android.app.ActivityManager
            @Suppress("DEPRECATION")
            val top = am?.getRunningTasks(1)?.firstOrNull()?.topActivity
            if (top != null) return top.flattenToShortString()
        } catch (_: Exception) {
            /* ignore */
        }
        return null
    }

    /**
     * Samsung InCallUI / Launcher / MainActivity / Other
     */
    private fun classifyTopUi(
        topPackage: String,
        topActivity: String?,
        currentActivity: String,
        ourPackage: String
    ): String {
        val blob = listOf(topPackage, topActivity.orEmpty(), currentActivity)
            .joinToString(" ")
            .lowercase()
        return when {
            blob.contains("incall") ||
                blob.contains("dialer") ||
                blob.contains("com.samsung.android.incallui") ||
                blob.contains("com.android.server.telecom") ||
                (blob.contains("phone") && blob.contains("samsung")) -> "SamsungInCallUI"
            blob.contains("launcher") ||
                blob.contains("net.oneplus.launcher") ||
                blob.contains("com.sec.android.app.launcher") ||
                blob.contains("com.google.android.apps.nexuslauncher") -> "Launcher"
            blob.contains("mainactivity") ||
                blob.contains("$ourPackage") && blob.contains("main") -> "MainActivity"
            topPackage == ourPackage -> "VlueApp"
            else -> "Other"
        }
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
