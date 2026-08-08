package kr.vlue.calloverlay.diagnostics

import android.content.Context
import android.os.Build
import android.os.SystemClock
import android.view.WindowManager
import java.util.concurrent.atomic.AtomicReference
import kr.vlue.calloverlay.companion.CompanionOverlaySnapshot
import org.json.JSONArray
import org.json.JSONObject

/**
 * Phase 6-D/E — Ringing Companion BIG_PUSH + Overlay Permission Gate 진단 (관찰 전용).
 *
 * Probe canDrawOverlays 와 Incoming Gate canDrawOverlays 를 덮어쓰지 않는다.
 * SYSTEM_HUN ≠ Companion BIG_PUSH.
 * OEM_RESTRICTED 는 ADD_VIEW_FAILED + permission=true 증거 있을 때만.
 */
object CompanionBigPushDiag {
    const val MAX_EVENTS = 64

    const val SOURCE_INCOMING_GATE = "INCOMING_GATE"
    const val SOURCE_SHOW_OVERLAY_GATE = "SHOW_OVERLAY_GATE"
    const val SOURCE_ATTACH_GATE = "ATTACH_GATE"
    const val SOURCE_DIAGNOSTIC_PROBE = "DIAGNOSTIC_PROBE"

    /**
     * Exact Breakpoint 우선순위 (Phase 6-E):
     * PERMISSION_BLOCKED → SHOW_OVERLAY_NOT_REACHED → BIG_PUSH_REJECTED
     * → ATTACH_FAILED → LAYOUT_FAILED → BIG_PUSH_VISIBLE
     */
    enum class Breakpoint {
        PERMISSION_BLOCKED,
        SHOW_OVERLAY_NOT_REACHED,
        SHOW_OVERLAY_EARLY_EXIT,
        BIG_PUSH_REJECTED,
        ATTACH_FAILED,
        LAYOUT_FAILED,
        BIG_PUSH_VISIBLE
    }

    private val events = AtomicReference(JSONArray())
    private val flags = AtomicReference(JSONObject())
    private val permissionBySource = AtomicReference(JSONObject())
    private val lastFailureReason = AtomicReference<String?>(null)
    private val lastRejectReason = AtomicReference<String?>(null)
    private val lastException = AtomicReference<JSONObject?>(null)
    private val samsungEvidence = AtomicReference<JSONObject?>(null)

    @Volatile
    private var sessionAnchorElapsedMs: Long = 0L

    fun reset() {
        events.set(JSONArray())
        flags.set(JSONObject())
        permissionBySource.set(JSONObject())
        lastFailureReason.set(null)
        lastRejectReason.set(null)
        lastException.set(null)
        samsungEvidence.set(null)
        sessionAnchorElapsedMs = nowElapsed()
    }

    fun noteIncomingReceived(source: String, snap: CompanionOverlaySnapshot? = null) {
        setFlag("incomingReceived", true)
        emit("INCOMING_RECEIVED", source = source, snap = snap)
    }

    fun noteSystemHunPosted(source: String = "LetteringIncomingNotifier") {
        setFlag("systemHunPosted", true)
        emit("SYSTEM_HUN_POSTED", source = source, phase = "HUN")
    }

    /**
     * Permission Snapshot — source별 독립 저장 (덮어쓰기 금지).
     */
    fun noteOverlayPermissionCheck(
        context: Context,
        source: String,
        canDrawOverlays: Boolean,
        callPhase: String? = null,
        screenState: String? = null,
        overlayState: String? = null,
        requestedWindowType: Int? = WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
        result: String = if (canDrawOverlays) "ALLOW" else "BLOCK"
    ) {
        val pkg = try {
            context.packageName
        } catch (_: Exception) {
            "?"
        }
        noteOverlayPermissionCheck(
            source = source,
            canDrawOverlays = canDrawOverlays,
            packageName = pkg,
            callPhase = callPhase,
            screenState = screenState,
            overlayState = overlayState,
            requestedWindowType = requestedWindowType,
            result = result
        )
    }

    /** 단위 테스트 / Context 없이 기록 */
    fun noteOverlayPermissionCheck(
        source: String,
        canDrawOverlays: Boolean,
        packageName: String = "kr.vlue.app",
        callPhase: String? = null,
        screenState: String? = null,
        overlayState: String? = null,
        requestedWindowType: Int? = WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
        result: String = if (canDrawOverlays) "ALLOW" else "BLOCK",
        manufacturer: String = Build.MANUFACTURER ?: "",
        model: String = Build.MODEL ?: "",
        sdkInt: Int = Build.VERSION.SDK_INT
    ) {
        val snap = JSONObject().apply {
            put("timestamp", System.currentTimeMillis())
            put("elapsedMs", (nowElapsed() - sessionAnchorElapsedMs).coerceAtLeast(0L))
            put("canDrawOverlays", canDrawOverlays)
            put("packageName", packageName)
            put("sdkInt", sdkInt)
            put("manufacturer", manufacturer)
            put("model", model)
            put("brand", Build.BRAND ?: "")
            put("source", source)
            put("result", result)
            if (callPhase != null) put("callPhase", callPhase)
            if (screenState != null) put("screenState", screenState)
            if (overlayState != null) put("overlayState", overlayState)
            if (requestedWindowType != null) put("requestedWindowType", requestedWindowType)
        }
        storePermissionSnapshot(source, snap)
        when (source) {
            SOURCE_INCOMING_GATE -> {
                setFlag("incomingGateChecked", true)
                setFlag("incomingGateAllow", canDrawOverlays)
                if (!canDrawOverlays) {
                    setFlag("permissionBlocked", true)
                    lastFailureReason.set("PERMISSION_BLOCKED")
                    lastRejectReason.set("NO_OVERLAY_PERMISSION")
                }
            }
            SOURCE_SHOW_OVERLAY_GATE -> {
                setFlag("showOverlayGateChecked", true)
                setFlag("showOverlayGateAllow", canDrawOverlays)
                if (!canDrawOverlays) {
                    setFlag("permissionBlocked", true)
                    lastFailureReason.set("PERMISSION_BLOCKED")
                    lastRejectReason.set("NO_OVERLAY_PERMISSION")
                }
            }
            SOURCE_ATTACH_GATE -> {
                setFlag("attachGateChecked", true)
                setFlag("attachGateAllow", canDrawOverlays)
            }
            SOURCE_DIAGNOSTIC_PROBE -> {
                setFlag("probeGateChecked", true)
                setFlag("probeGateAllow", canDrawOverlays)
            }
        }
        emit(
            "OVERLAY_PERMISSION_CHECK",
            source = source,
            phase = "PERMISSION",
            failureReason = if (canDrawOverlays) null else "NO_OVERLAY_PERMISSION",
            extra = snap
        )
    }

    fun noteShowOverlayEnter(
        answered: Boolean,
        canDrawOverlays: Boolean,
        attached: Boolean,
        snap: CompanionOverlaySnapshot,
        source: String = "showOverlay"
    ) {
        setFlag("showOverlayEnter", true)
        emit(
            "SHOW_OVERLAY_ENTER",
            source = source,
            snap = snap,
            attached = attached,
            extra = JSONObject()
                .put("answered", answered)
                .put("canDrawOverlays", canDrawOverlays)
        )
    }

    fun noteShowOverlayEarlyExit(
        reason: String,
        snap: CompanionOverlaySnapshot? = null,
        attached: Boolean? = null,
        source: String = "showOverlay"
    ) {
        setFlag("showOverlayEarlyExit", true)
        setFlag("earlyExitReason", reason)
        emit(
            "SHOW_OVERLAY_EARLY_EXIT",
            source = source,
            snap = snap,
            attached = attached,
            failureReason = reason,
            extra = JSONObject().put("reason", reason)
        )
        emit(
            "SHOW_OVERLAY_EARLY_EXIT_REASON",
            source = source,
            snap = snap,
            failureReason = reason,
            extra = JSONObject().put("reason", reason)
        )
        when (reason) {
            "NO_OVERLAY_PERMISSION" -> {
                setFlag("permissionBlocked", true)
                lastFailureReason.set("PERMISSION_BLOCKED")
                lastRejectReason.set(reason)
            }
            "BIG_PUSH_REJECTED" -> lastRejectReason.set(reason)
            "ALREADY_ANSWERED", "CALL_ALREADY_ANSWERED" -> lastRejectReason.set(reason)
            else -> lastRejectReason.set(reason)
        }
    }

    fun noteOnIncoming(snap: CompanionOverlaySnapshot, source: String = "showOverlay") {
        setFlag("onIncoming", true)
        emit("ON_INCOMING", source = source, snap = snap)
    }

    fun noteBigPushRequestBegin(snap: CompanionOverlaySnapshot, source: String = "showOverlay") {
        setFlag("bigPushRequestBegin", true)
        emit("BIG_PUSH_REQUEST_BEGIN", source = source, snap = snap, phase = "BIG_PUSH")
    }

    fun noteBigPushRequestResult(
        accepted: Boolean,
        snap: CompanionOverlaySnapshot,
        rejectReason: String? = null,
        source: String = "requestBigPush"
    ) {
        setFlag("bigPushRequestResult", true)
        setFlag("bigPushAccepted", accepted)
        if (!accepted) {
            lastRejectReason.set(rejectReason ?: "REJECTED")
            if (rejectReason?.contains("HIDDEN", ignoreCase = true) == true ||
                rejectReason?.contains("SCREEN_OFF", ignoreCase = true) == true ||
                snap.screenState.name == "SCREEN_OFF" ||
                snap.screenState.name == "AOD"
            ) {
                lastFailureReason.set(OverlayFailureReason.SCREEN_OFF_POLICY.name)
            }
        } else {
            /* accept 이후 stale NO_OVERLAY_PERMISSION reject 표시 방지 */
            if (lastRejectReason.get() == "NO_OVERLAY_PERMISSION") {
                lastRejectReason.set(null)
            }
        }
        emit(
            "BIG_PUSH_REQUEST_RESULT",
            source = source,
            snap = snap,
            phase = "BIG_PUSH",
            failureReason = if (accepted) null else (rejectReason ?: lastFailureReason.get()),
            extra = JSONObject()
                .put("accepted", accepted)
                .put("resultingState", snap.state.name)
                .put("resultingPosition", snap.position.name)
                .put("screenState", snap.screenState.name)
                .put("overlayContext", snap.context.name)
                .put("context", snap.context.name)
                .apply {
                    if (!rejectReason.isNullOrBlank()) put("rejectReason", rejectReason)
                }
        )
        if (!accepted) {
            emit(
                "BIG_PUSH_REJECTED",
                source = source,
                snap = snap,
                phase = "BIG_PUSH",
                failureReason = rejectReason ?: lastFailureReason.get(),
                extra = JSONObject().put("reason", rejectReason ?: "REJECTED")
            )
        }
    }

    fun noteBigPushSkipped(reason: String, snap: CompanionOverlaySnapshot? = null) {
        setFlag("bigPushSkipped", true)
        lastRejectReason.set(reason)
        emit(
            "BIG_PUSH_SKIPPED",
            source = "showOverlay",
            snap = snap,
            phase = "BIG_PUSH",
            failureReason = reason,
            extra = JSONObject().put("reason", reason)
        )
    }

    fun noteAttachRequest(snap: CompanionOverlaySnapshot, attached: Boolean, source: String = "attachOverlayWindow") {
        setFlag("attachRequest", true)
        emit(
            "BIG_PUSH_ATTACH_REQUEST",
            source = source,
            snap = snap,
            attached = attached,
            phase = "BIG_PUSH"
        )
    }

    fun noteAddViewBegin(
        snap: CompanionOverlaySnapshot,
        windowType: Int?,
        flags: Int?,
        canDrawOverlays: Boolean,
        source: String = "attachOverlayWindow"
    ) {
        setFlag("addViewBegin", true)
        emit(
            "ADD_VIEW_BEGIN",
            source = source,
            snap = snap,
            phase = "BIG_PUSH",
            extra = JSONObject()
                .put("canDrawOverlays", canDrawOverlays)
                .apply {
                    if (windowType != null) put("windowType", windowType)
                    if (flags != null) put("layoutFlags", flags)
                }
        )
    }

    fun noteAddViewSuccess(snap: CompanionOverlaySnapshot, source: String = "attachOverlayWindow") {
        setFlag("addViewSuccess", true)
        emit("ADD_VIEW_SUCCESS", source = source, snap = snap, phase = "BIG_PUSH", attached = true)
    }

    fun noteAddViewFailed(
        snap: CompanionOverlaySnapshot,
        reason: OverlayFailureReason,
        error: Throwable?,
        windowType: Int?,
        layoutFlags: Int?,
        canDrawOverlays: Boolean,
        oemInfo: JSONObject?,
        source: String = "attachOverlayWindow"
    ) {
        setFlag("addViewFailed", true)
        /* OEM_RESTRICTED: permission=true + ADD_VIEW_FAILED 증거일 때만 유지 */
        val classified =
            if (reason == OverlayFailureReason.OEM_RESTRICTED && !canDrawOverlays) {
                OverlayFailureReason.PERMISSION_DENIED
            } else {
                reason
            }
        lastFailureReason.set(classified.name)
        val ex = JSONObject().apply {
            put("failureReason", classified.name)
            if (error != null) {
                put("exceptionClass", error.javaClass.name)
                put("exceptionMessage", error.message ?: JSONObject.NULL)
            }
            put("canDrawOverlays", canDrawOverlays)
            if (windowType != null) put("windowType", windowType)
            if (layoutFlags != null) put("layoutFlags", layoutFlags)
            oemInfo?.let { put("oemDeviceInfo", it) }
            put("state", snap.state.name)
            put("position", snap.position.name)
            put("screenState", snap.screenState.name)
            put("context", snap.context.name)
            put("manufacturer", Build.MANUFACTURER ?: "")
            put("model", Build.MODEL ?: "")
            put("sdkInt", Build.VERSION.SDK_INT)
        }
        lastException.set(ex)
        samsungEvidence.set(ex)
        emit(
            "ADD_VIEW_FAILED",
            source = source,
            snap = snap,
            phase = "BIG_PUSH",
            failureReason = classified.name,
            extra = ex
        )
    }

    fun noteLayoutRequest(snap: CompanionOverlaySnapshot, source: String = "bigPushLayout") {
        setFlag("layoutRequest", true)
        emit("BIG_PUSH_LAYOUT_REQUEST", source = source, snap = snap, phase = "BIG_PUSH")
    }

    fun noteLayoutApplied(snap: CompanionOverlaySnapshot, source: String = "bigPushLayout") {
        setFlag("layoutApplied", true)
        emit("BIG_PUSH_LAYOUT_APPLIED", source = source, snap = snap, phase = "BIG_PUSH", attached = true)
    }

    fun noteLayoutFailed(
        snap: CompanionOverlaySnapshot,
        reason: OverlayFailureReason,
        error: Throwable?,
        source: String = "bigPushLayout"
    ) {
        setFlag("layoutFailed", true)
        lastFailureReason.set(reason.name)
        emit(
            "BIG_PUSH_LAYOUT_FAILED",
            source = source,
            snap = snap,
            phase = "BIG_PUSH",
            failureReason = reason.name,
            extra = JSONObject().apply {
                if (error != null) {
                    put("exceptionClass", error.javaClass.simpleName)
                    put("exceptionMessage", error.message ?: JSONObject.NULL)
                }
            }
        )
    }

    fun noteBigPushVisible(snap: CompanionOverlaySnapshot, source: String = "attachOverlayWindow") {
        setFlag("bigPushVisible", true)
        emit("BIG_PUSH_VISIBLE", source = source, snap = snap, phase = "BIG_PUSH", attached = true)
        emit(
            "COMPANION_BIG_PUSH_VISIBLE",
            source = source,
            snap = snap,
            phase = "BIG_PUSH",
            attached = true
        )
    }

    fun resolveBreakpoint(): Breakpoint {
        val f = flags.get() ?: JSONObject()
        val incomingBlocked =
            f.optBoolean("incomingGateChecked") && !f.optBoolean("incomingGateAllow")
        val showBlocked =
            f.optBoolean("showOverlayGateChecked") && !f.optBoolean("showOverlayGateAllow")
        val earlyPerm =
            f.optBoolean("showOverlayEarlyExit") &&
                f.optString("earlyExitReason") == "NO_OVERLAY_PERMISSION"
        /* 1) PERMISSION_BLOCKED — showOverlay 미진입 또는 permission early exit */
        if ((incomingBlocked || showBlocked || earlyPerm || f.optBoolean("permissionBlocked")) &&
            !f.optBoolean("bigPushAccepted") &&
            !f.optBoolean("addViewSuccess")
        ) {
            if (!f.optBoolean("showOverlayEnter") || earlyPerm || showBlocked ||
                (incomingBlocked && !f.optBoolean("showOverlayEnter"))
            ) {
                return Breakpoint.PERMISSION_BLOCKED
            }
        }
        /* 2) SHOW_OVERLAY_NOT_REACHED */
        if (!f.optBoolean("showOverlayEnter")) return Breakpoint.SHOW_OVERLAY_NOT_REACHED
        /* answered 등 */
        if (f.optBoolean("showOverlayEarlyExit") && !f.optBoolean("bigPushAccepted")) {
            val reason = f.optString("earlyExitReason", "")
            if (reason == "NO_OVERLAY_PERMISSION") return Breakpoint.PERMISSION_BLOCKED
            if (reason == "ALREADY_ANSWERED" || reason == "CALL_ALREADY_ANSWERED") {
                return Breakpoint.SHOW_OVERLAY_EARLY_EXIT
            }
            if (f.optBoolean("bigPushRequestResult") && !f.optBoolean("bigPushAccepted")) {
                return Breakpoint.BIG_PUSH_REJECTED
            }
            if (reason == "BIG_PUSH_REJECTED") return Breakpoint.BIG_PUSH_REJECTED
            return Breakpoint.SHOW_OVERLAY_EARLY_EXIT
        }
        /* 3) BIG_PUSH_REJECTED */
        if (f.optBoolean("bigPushRequestResult") && !f.optBoolean("bigPushAccepted")) {
            return Breakpoint.BIG_PUSH_REJECTED
        }
        /* 4) ATTACH_FAILED */
        if (f.optBoolean("addViewFailed")) return Breakpoint.ATTACH_FAILED
        if (f.optBoolean("bigPushAccepted") && !f.optBoolean("attachRequest")) {
            return Breakpoint.ATTACH_FAILED
        }
        if (f.optBoolean("attachRequest") &&
            !f.optBoolean("addViewSuccess") &&
            !f.optBoolean("addViewFailed")
        ) {
            return Breakpoint.ATTACH_FAILED
        }
        /* 5) LAYOUT_FAILED */
        if (f.optBoolean("layoutFailed")) return Breakpoint.LAYOUT_FAILED
        if (f.optBoolean("addViewSuccess") && !f.optBoolean("layoutApplied")) {
            return Breakpoint.LAYOUT_FAILED
        }
        /* 6) BIG_PUSH_VISIBLE */
        if (f.optBoolean("bigPushVisible")) return Breakpoint.BIG_PUSH_VISIBLE
        if (f.optBoolean("layoutApplied") && !f.optBoolean("bigPushVisible")) {
            return Breakpoint.LAYOUT_FAILED
        }
        if (f.optBoolean("bigPushAccepted")) return Breakpoint.ATTACH_FAILED
        return Breakpoint.SHOW_OVERLAY_NOT_REACHED
    }

    fun diagnosisJson(): JSONObject {
        val f = flags.get() ?: JSONObject()
        val perms = permissionBySource.get() ?: JSONObject()
        val bp = resolveBreakpoint()
        val gates = gateSummary(f)
        return JSONObject().apply {
            put("architectureFreeze", true)
            put("hunIsNotCompanionBigPush", true)
            put("exactBreakpoint", bp.name)
            put(
                "failureReason",
                when (bp) {
                    Breakpoint.PERMISSION_BLOCKED -> "PERMISSION_BLOCKED"
                    Breakpoint.BIG_PUSH_VISIBLE -> JSONObject.NULL
                    else -> lastFailureReason.get() ?: JSONObject.NULL
                }
            )
            put("rejectReason", lastRejectReason.get() ?: JSONObject.NULL)
            lastException.get()?.let { put("lastException", it) }
            samsungEvidence.get()?.let { put("samsungEvidence", it) }
            put("permissionHistory", JSONObject(perms.toString()))
            put("gates", gates)
            put(
                "permissionGate",
                JSONObject().apply {
                    val incoming = perms.optJSONObject(SOURCE_INCOMING_GATE)
                    val show = perms.optJSONObject(SOURCE_SHOW_OVERLAY_GATE)
                    val attach = perms.optJSONObject(SOURCE_ATTACH_GATE)
                    val probe = perms.optJSONObject(SOURCE_DIAGNOSTIC_PROBE)
                    val current = show ?: incoming ?: attach ?: probe
                    put("current", current ?: JSONObject.NULL)
                    put(
                        "incomingGate",
                        JSONObject()
                            .put(
                                "status",
                                when {
                                    incoming == null -> "NOT_CHECKED"
                                    incoming.optBoolean("canDrawOverlays") -> "PASS"
                                    else -> "FAIL"
                                }
                            )
                            .put("timestamp", incoming?.optLong("timestamp") ?: JSONObject.NULL)
                            .put(
                                "reason",
                                if (incoming != null && !incoming.optBoolean("canDrawOverlays")) {
                                    "NO_OVERLAY_PERMISSION"
                                } else {
                                    JSONObject.NULL
                                }
                            )
                            .put("canDrawOverlays", incoming?.opt("canDrawOverlays") ?: JSONObject.NULL)
                    )
                    put(
                        "showOverlay",
                        JSONObject()
                            .put(
                                "status",
                                when {
                                    f.optBoolean("showOverlayEnter") -> "ENTERED"
                                    else -> "NOT_REACHED"
                                }
                            )
                            .put(
                                "reason",
                                f.optString("earlyExitReason", "").ifBlank { JSONObject.NULL }
                            )
                    )
                    put("probe", probe ?: JSONObject.NULL)
                    put("attach", attach ?: JSONObject.NULL)
                }
            )
            put(
                "checklist",
                JSONObject()
                    .put("incomingReceived", passFail(f.optBoolean("incomingReceived")))
                    .put("showOverlayEnter", passFail(f.optBoolean("showOverlayEnter")))
                    .put(
                        "bigPushRequest",
                        passFail(f.optBoolean("bigPushRequestBegin") || f.optBoolean("bigPushRequestResult"))
                    )
                    .put("bigPushAccepted", passFail(f.optBoolean("bigPushAccepted")))
                    .put("attachRequest", passFail(f.optBoolean("attachRequest")))
                    .put("addViewBegin", passFail(f.optBoolean("addViewBegin")))
                    .put("addViewSuccess", passFail(f.optBoolean("addViewSuccess")))
                    .put("layoutApplied", passFail(f.optBoolean("layoutApplied")))
                    .put("bigPushVisible", passFail(f.optBoolean("bigPushVisible")))
                    .put("systemHunPosted", passFail(f.optBoolean("systemHunPosted")))
            )
            put("events", events.get() ?: JSONArray())
            put("flags", JSONObject(f.toString()))
        }
    }

    private fun gateSummary(f: JSONObject): JSONObject {
        val permBlocked = resolveBreakpoint() == Breakpoint.PERMISSION_BLOCKED ||
            (f.optBoolean("permissionBlocked") && !f.optBoolean("bigPushVisible"))
        val permissionGate =
            when {
                permBlocked -> "BLOCKED"
                f.optBoolean("incomingGateAllow") || f.optBoolean("showOverlayGateAllow") -> "PASS"
                f.optBoolean("incomingGateChecked") || f.optBoolean("showOverlayGateChecked") -> "BLOCKED"
                else -> "NOT_CHECKED"
            }
        val showOverlayGate =
            when {
                f.optBoolean("showOverlayEnter") -> "REACHED"
                else -> "NOT_REACHED"
            }
        val bigPushGate =
            when {
                !f.optBoolean("showOverlayEnter") -> "NOT_REACHED"
                f.optBoolean("bigPushAccepted") -> "ACCEPTED"
                f.optBoolean("bigPushRequestResult") -> "REJECTED"
                f.optBoolean("bigPushSkipped") -> "REJECTED"
                else -> "NOT_REACHED"
            }
        val attachGate =
            when {
                f.optBoolean("addViewSuccess") -> "SUCCESS"
                f.optBoolean("addViewFailed") -> "FAILED"
                f.optBoolean("bigPushAccepted") && !f.optBoolean("attachRequest") -> "FAILED"
                f.optBoolean("attachRequest") && !f.optBoolean("addViewSuccess") -> "FAILED"
                else -> "NOT_REACHED"
            }
        val visible =
            when {
                f.optBoolean("bigPushVisible") -> "PASS"
                f.optBoolean("addViewSuccess") || f.optBoolean("layoutApplied") -> "FAIL"
                else -> "NOT_REACHED"
            }
        return JSONObject()
            .put("permissionGate", permissionGate)
            .put("showOverlayGate", showOverlayGate)
            .put("bigPushGate", bigPushGate)
            .put("attachGate", attachGate)
            .put("visible", visible)
    }

    private fun passFail(ok: Boolean): String = if (ok) "PASS" else "FAIL"

    private fun storePermissionSnapshot(source: String, snap: JSONObject) {
        synchronized(this) {
            val cur = permissionBySource.get() ?: JSONObject()
            val next = JSONObject(cur.toString())
            /* source별 최초·최신: 덮어쓰되 source 키는 분리 유지 (Probe ≠ Incoming) */
            next.put(source, snap)
            permissionBySource.set(next)
        }
    }

    private fun setFlag(key: String, value: Any) {
        synchronized(this) {
            val cur = flags.get() ?: JSONObject()
            val next = JSONObject(cur.toString())
            next.put(key, value)
            flags.set(next)
        }
    }

    private fun emit(
        code: String,
        source: String,
        snap: CompanionOverlaySnapshot? = null,
        attached: Boolean? = null,
        phase: String? = null,
        failureReason: String? = null,
        extra: JSONObject? = null
    ) {
        val elapsed = (nowElapsed() - sessionAnchorElapsedMs).coerceAtLeast(0L)
        val event = JSONObject().apply {
            put("timestamp", System.currentTimeMillis())
            put("elapsedMs", elapsed)
            put("code", code)
            put("source", source)
            put("sessionId", DiagnosticsSessionStore.currentOrRecent()?.id ?: JSONObject.NULL)
            put("phoneMasked", DiagnosticsSessionStore.currentOrRecent()?.phoneMasked ?: JSONObject.NULL)
            if (phase != null) put("phase", phase)
            if (failureReason != null) put("failureReason", failureReason)
            if (attached != null) put("attached", attached)
            if (snap != null) {
                put("state", snap.state.name)
                put("position", snap.position.name)
                put("screenState", snap.screenState.name)
                put("miniCaseVisibility", snap.miniCaseVisibility.name)
                put("context", snap.context.name)
            }
            extra?.keys()?.forEach { k -> put(k, extra.get(k)) }
        }
        appendEvent(event)
    }

    private fun appendEvent(event: JSONObject) {
        synchronized(this) {
            val arr = events.get() ?: JSONArray()
            val next = JSONArray()
            val start = if (arr.length() >= MAX_EVENTS) arr.length() - MAX_EVENTS + 1 else 0
            for (i in start until arr.length()) next.put(arr.get(i))
            next.put(event)
            events.set(next)
        }
    }

    private fun nowElapsed(): Long =
        try {
            SystemClock.elapsedRealtime()
        } catch (_: Throwable) {
            System.nanoTime() / 1_000_000L
        }
}
