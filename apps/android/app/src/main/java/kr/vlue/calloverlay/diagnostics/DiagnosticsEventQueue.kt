package kr.vlue.calloverlay.diagnostics

import android.content.Context
import android.os.SystemClock
import android.util.Log
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicLong

/**
 * Local durable queue for diagnostics upload.
 * 이벤트는 발생 즉시 기록 (일괄 지연 기록 없음).
 * 시각: SystemClock.elapsedRealtimeNanos() 기준 baseTime 상대.
 *
 * Phase 6-G: file queue lock 과 HTTP upload 분리 —
 * flush 중 @Synchronized 로 append 가 막히면 Timeline Δ 가 수 초로 부풀었다.
 */
object DiagnosticsEventQueue {
    private const val TAG = "DiagnosticsQueue"
    private const val QUEUE_FILE = "vlue_diagnostics_queue.jsonl"
    private val executor = Executors.newSingleThreadExecutor()
    /** sessionId → last event elapsedRealtimeNanos (세션별 Δ 계산) */
    private val lastEventNanosBySession = ConcurrentHashMap<String, AtomicLong>()
    private val fileLock = Any()

    @Volatile
    private var appContext: Context? = null

    fun bind(context: Context) {
        appContext = context.applicationContext
        if (!DiagnosticsRemoteGate.ENABLED) {
            clearQueueFile(context.applicationContext)
            Log.i(TAG, "remote diagnostics DISABLED — queue cleared, upload skipped")
        }
    }

    fun resetTiming(sessionId: String? = null) {
        if (sessionId != null) {
            lastEventNanosBySession.remove(sessionId)
        } else {
            lastEventNanosBySession.clear()
        }
    }

    fun enqueueSession(
        context: Context,
        session: ActiveDiagnosticSession,
        status: String = "RUNNING",
        endedAtMs: Long? = null,
        lastStep: Int = 0,
        failStep: Int? = null,
        failReason: String? = null,
        overlayState: JSONObject? = null
    ) {
        if (!DiagnosticsRemoteGate.ENABLED) return
        val payload = JSONObject().apply {
            put("kind", "session")
            put("id", UUID.randomUUID().toString())
            put(
                "session",
                session.toSessionJson(status, lastStep).apply {
                    if (endedAtMs != null) put("endedAt", endedAtMs)
                    if (failStep != null) put("failStep", failStep)
                    if (!failReason.isNullOrBlank()) put("failReason", failReason)
                    if (overlayState != null) put("overlayStateJson", overlayState)
                }
            )
        }
        append(context, payload)
    }

    fun enqueueEvent(
        context: Context,
        session: ActiveDiagnosticSession,
        seq: Int,
        code: String,
        label: String,
        ok: Boolean?,
        reason: String? = null,
        exceptionMessage: String? = null,
        exceptionStack: String? = null,
        exceptionFn: String? = null,
        exceptionLine: Int? = null,
        payloadJson: JSONObject? = null,
        overlayState: JSONObject? = null,
        statusHint: String? = null,
        terminalFailure: Boolean = false,
        failStepOverride: Int? = null,
        failReasonOverride: String? = null
    ) {
        if (!DiagnosticsRemoteGate.ENABLED) return
        /* 발생 즉시 샘플 — enqueue 지연 전에 시각 고정 */
        val wallNow = System.currentTimeMillis()
        val nowNanos = SystemClock.elapsedRealtimeNanos()
        val ertMs = SystemClock.elapsedRealtime()
        val sinceStart = session.elapsedMsFromNanos(nowNanos)
        val lastHolder = lastEventNanosBySession.getOrPut(session.id) { AtomicLong(-1L) }
        val prevNanos = lastHolder.getAndSet(nowNanos)
        val deltaFromPrev = if (prevNanos < 0L) {
            0
        } else {
            ((nowNanos - prevNanos) / 1_000_000L).coerceAtLeast(0L).toInt()
        }

        val timingPayload = JSONObject().apply {
            put("timestamp", wallNow)
            put("elapsedRealtimeNanos", nowNanos)
            put("elapsedRealtimeMs", ertMs)
            put("baseTimeNanos", session.startedElapsedRealtimeNanos)
            put("startedElapsedRealtimeNanos", session.startedElapsedRealtimeNanos)
            put("startedElapsedRealtimeMs", session.startedElapsedRealtimeMs)
            put("elapsedMs", sinceStart)
            put("deltaFromPrevMs", deltaFromPrev)
            put("t", sinceStart)
            put("delta", deltaFromPrev)
            put("threadName", Thread.currentThread().name)
        }
        val mergedPayload = JSONObject().apply {
            payloadJson?.keys()?.forEach { k -> put(k, payloadJson.get(k)) }
            timingPayload.keys().forEach { k -> put(k, timingPayload.get(k)) }
        }

        val labelWithTime = when {
            label.contains("t=") || label.contains("+") && label.contains("ms") && label.contains("Δ") -> label
            sinceStart == 0 && deltaFromPrev == 0 -> "$label  t=0ms"
            else -> "$label  t=+${sinceStart}ms  Δ${deltaFromPrev}ms"
        }

        val event = JSONObject().apply {
            put("sessionId", session.id)
            put("seq", seq)
            put("code", code)
            put("label", labelWithTime)
            if (ok != null) put("ok", ok)
            put("timestamp", wallNow)
            put("elapsedMs", sinceStart)
            put("deltaFromPrevMs", deltaFromPrev)
            put("elapsedRealtimeNanos", nowNanos)
            put("baseTimeNanos", session.startedElapsedRealtimeNanos)
            put("threadName", Thread.currentThread().name)
            if (!reason.isNullOrBlank()) put("reason", reason)
            if (!exceptionMessage.isNullOrBlank()) put("exceptionMessage", exceptionMessage)
            if (!exceptionStack.isNullOrBlank()) put("exceptionStack", exceptionStack)
            if (!exceptionFn.isNullOrBlank()) put("exceptionFn", exceptionFn)
            if (exceptionLine != null) put("exceptionLine", exceptionLine)
            put("payloadJson", mergedPayload)
            put("terminalFailure", terminalFailure)
        }
        val sessionStatus = when {
            terminalFailure && statusHint == "SKIPPED" -> "SKIPPED"
            terminalFailure -> "FAILED"
            statusHint == "OK" -> "OK"
            else -> "RUNNING"
        }
        val wrapper = JSONObject().apply {
            put("kind", "events")
            put("id", UUID.randomUUID().toString())
            put(
                "session",
                session.toSessionJson(sessionStatus, seq).apply {
                    if (terminalFailure) {
                        put("failStep", failStepOverride ?: seq)
                        val fr = failReasonOverride ?: reason
                        if (!fr.isNullOrBlank()) put("failReason", fr)
                    }
                    if (overlayState != null) {
                        val mergedOverlay = JSONObject().apply {
                            overlayState.keys().forEach { k -> put(k, overlayState.get(k)) }
                            timingPayload.keys().forEach { k -> put(k, timingPayload.get(k)) }
                        }
                        put("overlayStateJson", mergedOverlay)
                    }
                    if (statusHint == "OK" && !terminalFailure) {
                        put("status", "OK")
                    }
                }
            )
            put("events", JSONArray().put(event))
        }
        append(context, wrapper)
        flushAsync(context)
        Log.i(TAG, "$labelWithTime | code=$code thread=${Thread.currentThread().name} deltaPrev=${deltaFromPrev}ms")
    }

    fun flushAsync(context: Context) {
        if (!DiagnosticsRemoteGate.ENABLED) {
            clearQueueFile(context.applicationContext)
            return
        }
        val app = context.applicationContext
        appContext = app
        executor.execute { flushSync(app) }
    }

    private fun clearQueueFile(context: Context) {
        synchronized(fileLock) {
            try {
                val f = queueFile(context)
                if (f.exists()) f.writeText("")
            } catch (_: Exception) {
            }
        }
        lastEventNanosBySession.clear()
    }

    private fun queueFile(context: Context): File =
        File(context.filesDir, QUEUE_FILE)

    private fun append(context: Context, obj: JSONObject) {
        synchronized(fileLock) {
            try {
                queueFile(context).appendText(obj.toString() + "\n")
            } catch (e: Exception) {
                Log.w(TAG, "append failed: ${e.message}")
            }
        }
    }

    /**
     * HTTP 는 fileLock 밖에서 수행한다.
     * (이전: @Synchronized flush 가 upload 동안 append 를 막아 Timeline Δ 가 RTT 만큼 부풀음)
     */
    private fun flushSync(context: Context) {
        val lines: List<String>
        synchronized(fileLock) {
            val file = queueFile(context)
            if (!file.exists()) return
            lines = try {
                file.readLines().filter { it.isNotBlank() }
            } catch (e: Exception) {
                Log.w(TAG, "read queue failed: ${e.message}")
                return
            }
            if (lines.isEmpty()) return
            try {
                file.writeText("")
            } catch (e: Exception) {
                Log.w(TAG, "clear queue failed: ${e.message}")
                return
            }
        }

        val remaining = mutableListOf<String>()
        for (line in lines) {
            try {
                val obj = JSONObject(line)
                val ok = when (obj.optString("kind")) {
                    "session" -> DiagnosticsUploader.postSession(context, obj.getJSONObject("session"))
                    "events" -> DiagnosticsUploader.postEvents(
                        context,
                        obj.optJSONObject("session"),
                        obj.getJSONArray("events")
                    )
                    else -> true
                }
                if (!ok) remaining.add(line)
            } catch (e: Exception) {
                Log.w(TAG, "flush line failed: ${e.message}")
                remaining.add(line)
            }
        }
        if (remaining.isEmpty()) return
        synchronized(fileLock) {
            try {
                val file = queueFile(context)
                file.appendText(remaining.joinToString("\n", postfix = "\n"))
            } catch (e: Exception) {
                Log.w(TAG, "rewrite queue failed: ${e.message}")
            }
        }
    }
}
