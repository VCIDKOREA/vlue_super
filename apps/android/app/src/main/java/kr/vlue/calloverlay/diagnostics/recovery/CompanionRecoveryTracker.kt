package kr.vlue.calloverlay.diagnostics.recovery

import android.os.SystemClock
import java.util.concurrent.atomic.AtomicInteger
import java.util.concurrent.atomic.AtomicReference
import org.json.JSONArray
import org.json.JSONObject

/**
 * Recovery / Service Lifecycle / Memory Callback 관찰 전용.
 * Retry · Delay · Window 생성 · State Machine 변경 없음.
 */
object CompanionRecoveryTracker {
    private const val MAX = 48

    private val recoveryTimeline = AtomicReference(JSONArray())
    private val recoveryCaseResults = AtomicReference(JSONArray())
    private val lastRecoveryCase = AtomicReference<JSONObject?>(null)
    private val memoryCallbackHistory = AtomicReference(JSONArray())
    private val serviceLifecycleLog = AtomicReference(JSONArray())

    private val recoveryAttemptCount = AtomicInteger(0)
    private val recoverySuccessCount = AtomicInteger(0)

    fun resetAllForTest() {
        recoveryTimeline.set(JSONArray())
        recoveryCaseResults.set(JSONArray())
        lastRecoveryCase.set(null)
        memoryCallbackHistory.set(JSONArray())
        serviceLifecycleLog.set(JSONArray())
        recoveryAttemptCount.set(0)
        recoverySuccessCount.set(0)
    }

    fun recordServiceLifecycle(event: String, detail: String = "") {
        append(
            serviceLifecycleLog,
            JSONObject().apply {
                put("timestamp", System.currentTimeMillis())
                put("event", event)
                put("elapsedMs", nowElapsedMs())
                if (detail.isNotBlank()) put("detail", detail)
            }
        )
    }

    fun recordMemoryCallback(kind: String, level: Int? = null, detail: String = "") {
        append(
            memoryCallbackHistory,
            JSONObject().apply {
                put("timestamp", System.currentTimeMillis())
                put("kind", kind)
                if (level != null) put("level", level)
                put("levelName", trimLevelName(level))
                if (detail.isNotBlank()) put("detail", detail)
            }
        )
    }

    fun recordRecoveryStep(
        recoveryEvent: String,
        recoveryTimeMs: Long,
        recoveredState: String,
        expectedState: String,
        recoverySuccess: Boolean,
        windowAttached: Boolean,
        failReasons: List<String> = emptyList()
    ) {
        append(
            recoveryTimeline,
            JSONObject().apply {
                put("timestamp", System.currentTimeMillis())
                put("recoveryEvent", recoveryEvent)
                put("recoveryTimeMs", recoveryTimeMs)
                put("recoveredState", recoveredState)
                put("expectedState", expectedState)
                put("recoverySuccess", recoverySuccess)
                put("windowAttached", windowAttached)
                if (failReasons.isNotEmpty()) put("failReasons", JSONArray(failReasons))
            }
        )
    }

    fun recordRecoveryCaseResult(result: JSONObject) {
        lastRecoveryCase.set(result)
        append(recoveryCaseResults, result)
        recoveryAttemptCount.incrementAndGet()
        if (result.optBoolean("passed", false)) {
            recoverySuccessCount.incrementAndGet()
        }
    }

    fun successRate(): Double {
        val attempts = recoveryAttemptCount.get()
        if (attempts <= 0) return 1.0
        return recoverySuccessCount.get().toDouble() / attempts
    }

    fun dashboardJson(): JSONObject {
        val attempts = recoveryAttemptCount.get()
        val success = recoverySuccessCount.get()
        return JSONObject().apply {
            put("architectureFreeze", true)
            put("recoveryTimeline", recoveryTimeline.get() ?: JSONArray())
            put("recoveryCaseResults", recoveryCaseResults.get() ?: JSONArray())
            lastRecoveryCase.get()?.let { put("lastRecoveryCase", it) }
            put("memoryCallbackHistory", memoryCallbackHistory.get() ?: JSONArray())
            put("serviceLifecycle", serviceLifecycleLog.get() ?: JSONArray())
            put("recoveryAttemptCount", attempts)
            put("recoverySuccessCount", success)
            put("recoverySuccessRate", if (attempts > 0) success.toDouble() / attempts else JSONObject.NULL)
        }
    }

    private fun trimLevelName(level: Int?): String =
        when (level) {
            android.content.ComponentCallbacks2.TRIM_MEMORY_COMPLETE -> "TRIM_MEMORY_COMPLETE"
            android.content.ComponentCallbacks2.TRIM_MEMORY_MODERATE -> "TRIM_MEMORY_MODERATE"
            android.content.ComponentCallbacks2.TRIM_MEMORY_BACKGROUND -> "TRIM_MEMORY_BACKGROUND"
            android.content.ComponentCallbacks2.TRIM_MEMORY_UI_HIDDEN -> "TRIM_MEMORY_UI_HIDDEN"
            android.content.ComponentCallbacks2.TRIM_MEMORY_RUNNING_CRITICAL -> "TRIM_MEMORY_RUNNING_CRITICAL"
            android.content.ComponentCallbacks2.TRIM_MEMORY_RUNNING_LOW -> "TRIM_MEMORY_RUNNING_LOW"
            android.content.ComponentCallbacks2.TRIM_MEMORY_RUNNING_MODERATE -> "TRIM_MEMORY_RUNNING_MODERATE"
            null -> "—"
            else -> "LEVEL_$level"
        }

    private fun append(ref: AtomicReference<JSONArray>, event: JSONObject) {
        val arr = ref.get() ?: JSONArray()
        val next = JSONArray()
        val start = if (arr.length() >= MAX) arr.length() - MAX + 1 else 0
        for (i in start until arr.length()) next.put(arr.get(i))
        next.put(event)
        ref.set(next)
    }

    private fun nowElapsedMs(): Long =
        try {
            SystemClock.elapsedRealtime()
        } catch (_: Throwable) {
            System.nanoTime() / 1_000_000L
        }
}
