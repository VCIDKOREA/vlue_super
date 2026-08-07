package kr.vlue.calloverlay.diagnostics

import android.content.Context
import android.os.SystemClock
import android.util.Log
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.util.UUID
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicLong

/**
 * Local durable queue for diagnostics upload.
 * Failed HTTPS posts stay on disk and retry on next flush.
 */
object DiagnosticsEventQueue {
    private const val TAG = "DiagnosticsQueue"
    private const val QUEUE_FILE = "vlue_diagnostics_queue.jsonl"
    private val executor = Executors.newSingleThreadExecutor()
    private val lastEventElapsedRealtime = AtomicLong(-1L)

    @Volatile
    private var appContext: Context? = null

    fun bind(context: Context) {
        appContext = context.applicationContext
    }

    fun resetTiming() {
        lastEventElapsedRealtime.set(-1L)
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
        val wallNow = System.currentTimeMillis()
        val ert = SystemClock.elapsedRealtime()
        val sinceStart = session.elapsedRealtimeSinceStart(ert)
        val prev = lastEventElapsedRealtime.getAndSet(ert)
        val deltaFromPrev = if (prev < 0L) 0 else (ert - prev).toInt().coerceAtLeast(0)

        val timingPayload = JSONObject().apply {
            put("elapsedRealtimeMs", ert)
            put("elapsedMs", sinceStart)
            put("deltaFromPrevMs", deltaFromPrev)
            put("startedElapsedRealtimeMs", session.startedElapsedRealtimeMs)
        }
        val mergedPayload = JSONObject().apply {
            payloadJson?.keys()?.forEach { k -> put(k, payloadJson.get(k)) }
            timingPayload.keys().forEach { k -> put(k, timingPayload.get(k)) }
        }

        val labelWithTime = if (label.contains("${sinceStart}ms")) {
            label
        } else {
            "$label  ${sinceStart}ms"
        }

        val event = JSONObject().apply {
            put("sessionId", session.id)
            put("seq", seq)
            put("code", code)
            put("label", labelWithTime)
            if (ok != null) put("ok", ok)
            put("timestamp", wallNow)
            /* 타임라인 +elapsedMs 표시 — elapsedRealtime 세션 상대 */
            put("elapsedMs", sinceStart)
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
        Log.i(TAG, "$labelWithTime | ert=$ert deltaPrev=${deltaFromPrev}ms")
    }

    fun flushAsync(context: Context) {
        val app = context.applicationContext
        appContext = app
        executor.execute { flushSync(app) }
    }

    private fun queueFile(context: Context): File =
        File(context.filesDir, QUEUE_FILE)

    @Synchronized
    private fun append(context: Context, obj: JSONObject) {
        try {
            queueFile(context).appendText(obj.toString() + "\n")
        } catch (e: Exception) {
            Log.w(TAG, "append failed: ${e.message}")
        }
    }

    @Synchronized
    private fun flushSync(context: Context) {
        val file = queueFile(context)
        if (!file.exists()) return
        val lines = try {
            file.readLines().filter { it.isNotBlank() }
        } catch (e: Exception) {
            Log.w(TAG, "read queue failed: ${e.message}")
            return
        }
        if (lines.isEmpty()) return

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
        try {
            if (remaining.isEmpty()) {
                file.writeText("")
            } else {
                file.writeText(remaining.joinToString("\n", postfix = "\n"))
            }
        } catch (e: Exception) {
            Log.w(TAG, "rewrite queue failed: ${e.message}")
        }
    }
}
