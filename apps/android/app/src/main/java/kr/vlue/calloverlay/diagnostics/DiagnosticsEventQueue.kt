package kr.vlue.calloverlay.diagnostics

import android.content.Context
import android.util.Log
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.util.UUID
import java.util.concurrent.Executors

/**
 * Local durable queue for diagnostics upload.
 * Failed HTTPS posts stay on disk and retry on next flush.
 */
object DiagnosticsEventQueue {
    private const val TAG = "DiagnosticsQueue"
    private const val QUEUE_FILE = "vlue_diagnostics_queue.jsonl"
    private val executor = Executors.newSingleThreadExecutor()

    @Volatile
    private var appContext: Context? = null

    fun bind(context: Context) {
        appContext = context.applicationContext
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
        statusHint: String? = null
    ) {
        val now = System.currentTimeMillis()
        val event = JSONObject().apply {
            put("sessionId", session.id)
            put("seq", seq)
            put("code", code)
            put("label", label)
            if (ok != null) put("ok", ok)
            put("timestamp", now)
            put("elapsedMs", session.elapsedMs(now))
            if (!reason.isNullOrBlank()) put("reason", reason)
            if (!exceptionMessage.isNullOrBlank()) put("exceptionMessage", exceptionMessage)
            if (!exceptionStack.isNullOrBlank()) put("exceptionStack", exceptionStack)
            if (!exceptionFn.isNullOrBlank()) put("exceptionFn", exceptionFn)
            if (exceptionLine != null) put("exceptionLine", exceptionLine)
            if (payloadJson != null) put("payloadJson", payloadJson)
        }
        val wrapper = JSONObject().apply {
            put("kind", "events")
            put("id", UUID.randomUUID().toString())
            put(
                "session",
                session.toSessionJson(statusHint ?: "RUNNING", seq).apply {
                    if (ok == false || statusHint == "FAILED" || statusHint == "SKIPPED") {
                        put("failStep", seq)
                        if (!reason.isNullOrBlank()) put("failReason", reason)
                        put("status", statusHint ?: if (code == "SKIP") "SKIPPED" else "FAILED")
                    }
                    if (overlayState != null) put("overlayStateJson", overlayState)
                }
            )
            put("events", JSONArray().put(event))
        }
        append(context, wrapper)
        flushAsync(context)
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
