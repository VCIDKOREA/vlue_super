package kr.vlue.calloverlay.diagnostics

import android.os.SystemClock
import java.util.concurrent.atomic.AtomicReference
import org.json.JSONArray
import org.json.JSONObject

/**
 * Phase 6-G — Companion Runtime Stability forensics (관찰 전용 + session gate 메타).
 * OverlayState / Controller / Window 구조를 바꾸지 않는다.
 * KPI 앵커는 OverlayDiagTracker / CompanionPerfTracker 를 재사용한다.
 */
object CompanionRuntimeStabilityDiag {
    const val MAX_EVENTS = 64
    const val WARN_MS = 500
    const val FAIL_MS = 1000

    private val events = AtomicReference(JSONArray())
    private val staleLog = AtomicReference(JSONArray())
    private val divergenceLog = AtomicReference(JSONArray())
    private val segments = AtomicReference(JSONArray())

    @Volatile
    var callSessionId: String = ""
        private set

    @Volatile
    var callSessionActive: Boolean = false
        private set

    @Volatile
    private var callStartElapsedMs: Long = -1L

    @Volatile
    var callEndElapsedMs: Long = -1L
        private set

    @Volatile
    private var lastMarkElapsedMs: Long = -1L

    @Volatile
    private var lastMarkCode: String = ""

    @Volatile
    private var lastLayoutCommitState: String = ""

    @Volatile
    private var lastLayoutCommitSource: String = ""

    @Volatile
    private var memberLookupJson: JSONObject = JSONObject()

    /** JVM unit test 에서 SystemClock mock 없을 때 fallback */
    private fun nowElapsedMs(): Long =
        try {
            SystemClock.elapsedRealtime()
        } catch (_: Throwable) {
            System.currentTimeMillis()
        }

    fun reset() {
        events.set(JSONArray())
        staleLog.set(JSONArray())
        divergenceLog.set(JSONArray())
        segments.set(JSONArray())
        callSessionId = ""
        callSessionActive = false
        callStartElapsedMs = -1L
        callEndElapsedMs = -1L
        lastMarkElapsedMs = -1L
        lastMarkCode = ""
        lastLayoutCommitState = ""
        lastLayoutCommitSource = ""
        memberLookupJson = JSONObject()
    }

    /** Call End 이후 IDLE 상태에서 늦게 도착한 FGS/showOverlay 시작 여부 */
    fun shouldIgnorePostEndOverlayStart(): Boolean =
        !callSessionActive && callEndElapsedMs > 0L

    fun beginCallSession(source: String): String {
        val now = nowElapsedMs()
        val id = "cs-$now-${source.hashCode().toUInt().toString(16)}"
        callSessionId = id
        callSessionActive = true
        callStartElapsedMs = now
        callEndElapsedMs = -1L
        lastMarkElapsedMs = callStartElapsedMs
        lastMarkCode = "CALL_SESSION_BEGIN"
        mark("CALL_SESSION_BEGIN", source)
        return id
    }

    fun endCallSession(source: String) {
        if (!callSessionActive && callEndElapsedMs > 0L) {
            mark("CALL_END_IDEMPOTENT", source)
            return
        }
        callEndElapsedMs = nowElapsedMs()
        mark("CALL_END_RECEIVED", source)
        callSessionActive = false
        mark("CALL_SESSION_END", source)
    }

    fun isCallSessionActive(): Boolean = callSessionActive

    fun mark(code: String, source: String = "", extra: JSONObject? = null) {
        val now = nowElapsedMs()
        val deltaPrev =
            if (lastMarkElapsedMs < 0L) 0L else (now - lastMarkElapsedMs).coerceAtLeast(0L)
        val deltaIncoming =
            if (callStartElapsedMs < 0L) -1L else (now - callStartElapsedMs).coerceAtLeast(0L)
        val thread = try {
            Thread.currentThread().name
        } catch (_: Throwable) {
            "?"
        }
        val severity =
            when {
                deltaPrev >= FAIL_MS -> "FAIL"
                deltaPrev >= WARN_MS -> "WARN"
                else -> "OK"
            }
        val event = JSONObject().apply {
            put("timestamp", System.currentTimeMillis())
            put("code", code)
            put("source", source)
            put("elapsedRealtimeMs", now)
            put("deltaFromPreviousMs", deltaPrev)
            put("deltaFromIncomingMs", deltaIncoming)
            put("threadName", thread)
            put("callSessionId", callSessionId.ifBlank { JSONObject.NULL })
            put("callSessionActive", callSessionActive)
            put("severity", severity)
            put("previousCode", lastMarkCode.ifBlank { JSONObject.NULL })
            extra?.keys()?.forEach { k -> put(k, extra.get(k)) }
        }
        append(events, event)
        if (lastMarkCode.isNotBlank() && deltaPrev >= WARN_MS) {
            append(
                segments,
                JSONObject()
                    .put("from", lastMarkCode)
                    .put("to", code)
                    .put("deltaMs", deltaPrev)
                    .put("severity", severity)
                    .put("threadName", thread)
            )
        }
        lastMarkElapsedMs = now
        lastMarkCode = code
    }

    fun noteStaleEvent(
        event: String,
        source: String,
        detail: String? = null
    ) {
        val now = nowElapsedMs()
        val sinceEnd =
            if (callEndElapsedMs < 0L) -1L else (now - callEndElapsedMs).coerceAtLeast(0L)
        val row = JSONObject().apply {
            put("timestamp", System.currentTimeMillis())
            put("event", event)
            put("source", source)
            put("oldSessionId", callSessionId.ifBlank { JSONObject.NULL })
            put("currentSessionActive", callSessionActive)
            put("elapsedSinceCallEndMs", sinceEnd)
            put("threadName", Thread.currentThread().name)
            if (!detail.isNullOrBlank()) put("detail", detail)
        }
        append(staleLog, row)
        mark(
            "STALE_EVENT_IGNORED",
            source,
            JSONObject()
                .put("event", event)
                .put("elapsedSinceCallEndMs", sinceEnd)
        )
        if (event.contains("SHOWCASE", ignoreCase = true) ||
            event.contains("CONNECTED", ignoreCase = true) ||
            event.contains("RESTORE", ignoreCase = true)
        ) {
            mark("STALE_SHOWCASE_REQUEST_AFTER_CALL_END", source)
        }
    }

    fun noteUiDivergence(
        nativeState: String,
        nativePosition: String,
        webHint: String,
        source: String
    ) {
        append(
            divergenceLog,
            JSONObject()
                .put("timestamp", System.currentTimeMillis())
                .put("nativeState", nativeState)
                .put("nativePosition", nativePosition)
                .put("webHint", webHint)
                .put("source", source)
                .put("callSessionId", callSessionId)
        )
        mark(
            "UI_STATE_DIVERGENCE",
            source,
            JSONObject()
                .put("nativeState", nativeState)
                .put("nativePosition", nativePosition)
                .put("webHint", webHint)
        )
    }

    fun noteLayoutCommit(
        state: String,
        position: String,
        source: String,
        miniVisibility: String = ""
    ) {
        mark(
            "LAYOUT_COMMIT",
            source,
            JSONObject()
                .put("state", state)
                .put("position", position)
                .put("miniVisibility", miniVisibility)
                .put("previousCommitState", lastLayoutCommitState.ifBlank { JSONObject.NULL })
                .put("previousCommitSource", lastLayoutCommitSource.ifBlank { JSONObject.NULL })
        )
        if (lastLayoutCommitState.isNotBlank() &&
            lastLayoutCommitState != state &&
            (lastLayoutCommitState == "SHOWCASE" || lastLayoutCommitState == "MINI_CASE" ||
                lastLayoutCommitState == "BIG_PUSH") &&
            (state == "SHOWCASE" || state == "MINI_CASE" || state == "BIG_PUSH")
        ) {
            noteUiDivergence(
                nativeState = state,
                nativePosition = position,
                webHint = "rapid_layout_commit_from=$lastLayoutCommitState@$lastLayoutCommitSource",
                source = source
            )
        }
        lastLayoutCommitState = state
        lastLayoutCommitSource = source
    }

    fun noteMemberLookup(
        phase: String,
        maskedPhone: String,
        lookupElapsedMs: Long = -1L,
        matched: Boolean? = null,
        dataSource: String = "",
        normalizedOk: Boolean? = null
    ) {
        mark(
            phase,
            "memberLookup",
            JSONObject()
                .put("maskedPhone", maskedPhone)
                .put("lookupElapsedMs", if (lookupElapsedMs < 0) JSONObject.NULL else lookupElapsedMs)
                .put("matched", matched ?: JSONObject.NULL)
                .put("dataSource", dataSource)
                .put("normalizedOk", normalizedOk ?: JSONObject.NULL)
        )
        memberLookupJson = JSONObject().apply {
            put("phase", phase)
            put("maskedPhone", maskedPhone)
            put("lookupElapsedMs", if (lookupElapsedMs < 0) JSONObject.NULL else lookupElapsedMs)
            put("matched", matched ?: JSONObject.NULL)
            put("dataSource", dataSource)
            put("normalizedOk", normalizedOk ?: JSONObject.NULL)
            put("timestamp", System.currentTimeMillis())
        }
    }

    fun snapshotJson(): JSONObject {
        val now = nowElapsedMs()
        val callEndToGone =
            if (callEndElapsedMs > 0L && !callSessionActive) {
                (lastMarkElapsedMs - callEndElapsedMs).coerceAtLeast(0L)
            } else {
                -1L
            }
        /* KPI 앵커는 OverlayDiagTracker 가 합성 — 여기서 Tracker.snapshot 재호출 금지(순환) */
        return JSONObject().apply {
            put("architectureFreeze", true)
            put("callSessionId", callSessionId.ifBlank { JSONObject.NULL })
            put("callSessionActive", callSessionActive)
            put("callStartElapsedMs", if (callStartElapsedMs < 0) JSONObject.NULL else callStartElapsedMs)
            put("callEndElapsedMs", if (callEndElapsedMs < 0) JSONObject.NULL else callEndElapsedMs)
            put(
                "latency",
                JSONObject()
                    .put("callEndToOverlayGoneMs", if (callEndToGone < 0) JSONObject.NULL else callEndToGone)
                    .put("kpiIncomingToBigPushMs", 300)
                    .put("kpiAnswerToShowcaseMs", 1000)
                    .put("kpiCallEndToGoneMs", 300)
            )
            put(
                "lifecycle",
                JSONObject()
                    .put("callSessionId", callSessionId.ifBlank { JSONObject.NULL })
                    .put("active", callSessionActive)
                    .put("uptimeSinceStartMs", if (callStartElapsedMs < 0) JSONObject.NULL else now - callStartElapsedMs)
            )
            put(
                "staleEvents",
                JSONObject()
                    .put("count", staleLog.get()?.length() ?: 0)
                    .put("recent", staleLog.get() ?: JSONArray())
            )
            put(
                "uiDivergence",
                JSONObject()
                    .put("count", divergenceLog.get()?.length() ?: 0)
                    .put("recent", divergenceLog.get() ?: JSONArray())
            )
            put("slowSegments", segments.get() ?: JSONArray())
            put("marks", events.get() ?: JSONArray())
            put(
                "topSlowSegments",
                topSlow(segments.get() ?: JSONArray(), 5)
            )
            put("memberLookup", memberLookupJson)
            put(
                "callSessionSummary",
                JSONObject()
                    .put("incomingMs", 0)
                    .put("staleCount", staleLog.get()?.length() ?: 0)
                    .put("uiDivergenceCount", divergenceLog.get()?.length() ?: 0)
            )
        }
    }

    private fun topSlow(arr: JSONArray, n: Int): JSONArray {
        val list = mutableListOf<JSONObject>()
        for (i in 0 until arr.length()) list.add(arr.getJSONObject(i))
        list.sortByDescending { it.optLong("deltaMs", 0L) }
        return JSONArray().also { out ->
            list.take(n).forEach { out.put(it) }
        }
    }

    private fun append(ref: AtomicReference<JSONArray>, event: JSONObject) {
        synchronized(this) {
            val arr = ref.get() ?: JSONArray()
            val next = JSONArray()
            val start = if (arr.length() >= MAX_EVENTS) arr.length() - MAX_EVENTS + 1 else 0
            for (i in start until arr.length()) next.put(arr.get(i))
            next.put(event)
            ref.set(next)
        }
    }
}
