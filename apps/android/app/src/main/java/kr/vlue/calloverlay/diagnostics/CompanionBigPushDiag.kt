package kr.vlue.calloverlay.diagnostics

import android.os.SystemClock
import java.util.concurrent.atomic.AtomicReference
import kr.vlue.calloverlay.companion.CompanionOverlaySnapshot
import org.json.JSONArray
import org.json.JSONObject

/**
 * Phase 6-D — Ringing Companion BIG_PUSH 단절점 진단 (관찰 전용).
 * Controller / Window / Architecture를 변경하지 않는다.
 *
 * step(3) startOverlayService ≠ BIG_PUSH 성립.
 * SYSTEM_HUN_POSTED ≠ COMPANION_BIG_PUSH_VISIBLE.
 */
object CompanionBigPushDiag {
    const val MAX_EVENTS = 48

    enum class Breakpoint {
        SHOW_OVERLAY_NOT_REACHED,
        SHOW_OVERLAY_EARLY_EXIT,
        BIG_PUSH_REQUEST_REJECTED,
        BIG_PUSH_ATTACH_NOT_CALLED,
        BIG_PUSH_ADD_VIEW_FAILED,
        BIG_PUSH_LAYOUT_FAILED,
        BIG_PUSH_VISIBLE_NOT_CONFIRMED,
        BIG_PUSH_SUCCESS
    }

    private val events = AtomicReference(JSONArray())
    private val flags = AtomicReference(JSONObject())
    private val lastFailureReason = AtomicReference<String?>(null)
    private val lastRejectReason = AtomicReference<String?>(null)
    private val lastException = AtomicReference<JSONObject?>(null)
    private val samsungEvidence = AtomicReference<JSONObject?>(null)

    @Volatile
    private var sessionAnchorElapsedMs: Long = 0L

    fun reset() {
        events.set(JSONArray())
        flags.set(JSONObject())
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
        lastRejectReason.set(reason)
        emit(
            "SHOW_OVERLAY_EARLY_EXIT",
            source = source,
            snap = snap,
            attached = attached,
            failureReason = reason,
            extra = JSONObject().put("reason", reason)
        )
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
                .put("context", snap.context.name)
                .apply {
                    if (!rejectReason.isNullOrBlank()) put("reason", rejectReason)
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
        lastFailureReason.set(reason.name)
        val ex = JSONObject().apply {
            put("failureReason", reason.name)
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
        }
        lastException.set(ex)
        samsungEvidence.set(ex)
        emit(
            "ADD_VIEW_FAILED",
            source = source,
            snap = snap,
            phase = "BIG_PUSH",
            failureReason = reason.name,
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
        emit(
            "BIG_PUSH_VISIBLE",
            source = source,
            snap = snap,
            phase = "BIG_PUSH",
            attached = true
        )
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
        if (!f.optBoolean("showOverlayEnter")) return Breakpoint.SHOW_OVERLAY_NOT_REACHED
        if (f.optBoolean("showOverlayEarlyExit") && !f.optBoolean("bigPushAccepted")) {
            val reason = f.optString("earlyExitReason", "")
            return if (reason == "ALREADY_ANSWERED") {
                Breakpoint.SHOW_OVERLAY_EARLY_EXIT
            } else if (f.optBoolean("bigPushRequestResult") && !f.optBoolean("bigPushAccepted")) {
                Breakpoint.BIG_PUSH_REQUEST_REJECTED
            } else {
                Breakpoint.SHOW_OVERLAY_EARLY_EXIT
            }
        }
        if (f.optBoolean("bigPushRequestResult") && !f.optBoolean("bigPushAccepted")) {
            return Breakpoint.BIG_PUSH_REQUEST_REJECTED
        }
        if (f.optBoolean("bigPushAccepted") && !f.optBoolean("attachRequest")) {
            return Breakpoint.BIG_PUSH_ATTACH_NOT_CALLED
        }
        if (f.optBoolean("addViewFailed")) return Breakpoint.BIG_PUSH_ADD_VIEW_FAILED
        if (f.optBoolean("attachRequest") && !f.optBoolean("addViewBegin") && !f.optBoolean("addViewSuccess")) {
            return Breakpoint.BIG_PUSH_ATTACH_NOT_CALLED
        }
        if (f.optBoolean("addViewBegin") && !f.optBoolean("addViewSuccess") && !f.optBoolean("addViewFailed")) {
            return Breakpoint.BIG_PUSH_ADD_VIEW_FAILED
        }
        if (f.optBoolean("layoutFailed")) return Breakpoint.BIG_PUSH_LAYOUT_FAILED
        if (f.optBoolean("addViewSuccess") && !f.optBoolean("layoutApplied")) {
            return Breakpoint.BIG_PUSH_LAYOUT_FAILED
        }
        if (f.optBoolean("layoutApplied") && !f.optBoolean("bigPushVisible")) {
            return Breakpoint.BIG_PUSH_VISIBLE_NOT_CONFIRMED
        }
        if (f.optBoolean("bigPushVisible")) return Breakpoint.BIG_PUSH_SUCCESS
        if (f.optBoolean("bigPushAccepted")) return Breakpoint.BIG_PUSH_ATTACH_NOT_CALLED
        if (f.optBoolean("showOverlayEnter")) return Breakpoint.SHOW_OVERLAY_EARLY_EXIT
        return Breakpoint.SHOW_OVERLAY_NOT_REACHED
    }

    fun diagnosisJson(): JSONObject {
        val f = flags.get() ?: JSONObject()
        val bp = resolveBreakpoint()
        return JSONObject().apply {
            put("architectureFreeze", true)
            put("hunIsNotCompanionBigPush", true)
            put("exactBreakpoint", bp.name)
            put("failureReason", lastFailureReason.get() ?: JSONObject.NULL)
            put("rejectReason", lastRejectReason.get() ?: JSONObject.NULL)
            lastException.get()?.let { put("lastException", it) }
            samsungEvidence.get()?.let { put("samsungEvidence", it) }
            put(
                "checklist",
                JSONObject()
                    .put("incomingReceived", passFail(f.optBoolean("incomingReceived")))
                    .put("showOverlayEnter", passFail(f.optBoolean("showOverlayEnter")))
                    .put("bigPushRequest", passFail(f.optBoolean("bigPushRequestBegin") || f.optBoolean("bigPushRequestResult")))
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

    private fun passFail(ok: Boolean): String = if (ok) "PASS" else "FAIL"

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
