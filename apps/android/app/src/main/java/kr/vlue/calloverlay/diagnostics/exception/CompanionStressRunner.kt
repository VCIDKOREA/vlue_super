package kr.vlue.calloverlay.diagnostics.exception

import android.os.SystemClock
import kr.vlue.calloverlay.companion.CompanionOverlayController
import kr.vlue.calloverlay.companion.OverlayContext
import kr.vlue.calloverlay.companion.OverlayState
import kr.vlue.calloverlay.companion.ScreenState
import kr.vlue.calloverlay.diagnostics.OverlayDiagTracker
import kr.vlue.calloverlay.diagnostics.OverlayFailureReason
import org.json.JSONArray
import org.json.JSONObject

data class StressRunResult(
    val cycles: Int,
    val completedCycles: Int,
    val passed: Boolean,
    val stateLeak: Boolean,
    val overlayLeak: Boolean,
    val windowDuplicate: Boolean,
    val unexpectedTransitionCount: Int,
    val totalElapsedMs: Long,
    val finalState: String,
    val attachCount: Int,
    val removeCount: Int,
    val hint: String?
) {
    fun toJson(): JSONObject = JSONObject().apply {
        put("type", "STRESS")
        put("cycles", cycles)
        put("completedCycles", completedCycles)
        put("passed", passed)
        put("verdict", if (passed) "PASS" else "FAIL")
        put("stateLeak", stateLeak)
        put("overlayLeak", overlayLeak)
        put("windowDuplicate", windowDuplicate)
        put("unexpectedTransitionCount", unexpectedTransitionCount)
        put("totalElapsedMs", totalElapsedMs)
        put("finalState", finalState)
        put("attachCount", attachCount)
        put("removeCount", removeCount)
        if (!hint.isNullOrBlank()) put("hint", hint)
    }
}

data class MemorySummary(
    val overlayAttachCount: Int,
    val overlayRemoveCount: Int,
    val windowAttachedCount: Int,
    val windowAttachedNow: Boolean,
    val leak: Boolean,
    val balanceOk: Boolean
) {
    fun toJson(): JSONObject = JSONObject().apply {
        put("overlayAttachCount", overlayAttachCount)
        put("overlayRemoveCount", overlayRemoveCount)
        put("windowAttachedCount", windowAttachedCount)
        put("windowAttachedNow", windowAttachedNow)
        put("leak", leak)
        put("balanceOk", balanceOk)
        put("verdict", if (!leak && balanceOk) "PASS" else "FAIL")
    }
}

/**
 * Stress / Memory 관찰 — Window 실생성·Retry·Delay·State Machine 변경 없음.
 */
object CompanionStressRunner {
    const val DEFAULT_CYCLES = 100

    /**
     * 100회 Incoming → Answer → End.
     * 매 사이클 attach/remove 1회 쌍으로 관찰.
     */
    fun runIncomingAnswerEnd(
        cycles: Int = DEFAULT_CYCLES,
        controller: CompanionOverlayController = CompanionOverlayController()
    ): StressRunResult {
        controller.onScreenStateChanged(ScreenState.SCREEN_ON)
        val started = nowElapsedMs()
        var unexpected = 0
        var windowDuplicate = 0
        val timeline = JSONArray()

        repeat(cycles) { i ->
            val cycleStart = nowElapsedMs()
            val beforeAttached = OverlayDiagTracker.overlayAttached

            controller.onIncoming(OverlayContext.HOME_SCREEN)
            controller.onAnswer(OverlayContext.IN_CALL)
            if (beforeAttached) windowDuplicate++
            if (!OverlayDiagTracker.overlayAttached) {
                OverlayDiagTracker.onShowOverlay()
                OverlayDiagTracker.beginAttach("STRESS")
                OverlayDiagTracker.markAddViewBegin()
                OverlayDiagTracker.onAddView()
                OverlayDiagTracker.markAddViewSuccess()
            } else {
                windowDuplicate++
            }
            if (controller.state != OverlayState.SHOWCASE) unexpected++

            controller.onCallEnd()
            if (OverlayDiagTracker.overlayAttached) {
                OverlayDiagTracker.onRemoveView()
            }
            if (controller.state != OverlayState.IDLE) unexpected++
            if (OverlayDiagTracker.overlayAttached) unexpected++

            timeline.put(
                JSONObject().apply {
                    put("cycle", i + 1)
                    put("elapsedMs", (nowElapsedMs() - cycleStart).coerceAtLeast(0L))
                    put("state", controller.state.name)
                    put("attached", OverlayDiagTracker.overlayAttached)
                }
            )
        }

        OverlayDiagTracker.recordStressTimeline(timeline)

        val snap = OverlayDiagTracker.snapshotJson()
        val attach = snap.optInt("addViewCount")
        val remove = snap.optInt("removeViewCount")
        val stateLeak = controller.state != OverlayState.IDLE
        val overlayLeak = OverlayDiagTracker.overlayAttached || attach != remove
        val dup = windowDuplicate > 0
        val passed = !stateLeak && !overlayLeak && !dup && unexpected == 0

        val result = StressRunResult(
            cycles = cycles,
            completedCycles = cycles,
            passed = passed,
            stateLeak = stateLeak,
            overlayLeak = overlayLeak,
            windowDuplicate = dup,
            unexpectedTransitionCount = unexpected,
            totalElapsedMs = (nowElapsedMs() - started).coerceAtLeast(0L),
            finalState = controller.state.name,
            attachCount = attach,
            removeCount = remove,
            hint = when {
                stateLeak -> "stateLeak final=${controller.state}"
                overlayLeak -> "overlayLeak attach=$attach remove=$remove"
                dup -> "windowDuplicate count=$windowDuplicate"
                unexpected > 0 -> "unexpectedTransitionCount=$unexpected"
                else -> null
            }
        )
        OverlayDiagTracker.recordStressResult(result.toJson())
        OverlayDiagTracker.recordMemorySummary(memorySummary().toJson())
        OverlayDiagTracker.recordFailureMatrix(buildFailureMatrix())
        return result
    }

    fun memorySummary(): MemorySummary {
        val snap = OverlayDiagTracker.snapshotJson()
        val attach = snap.optInt("addViewCount")
        val remove = snap.optInt("removeViewCount")
        val attachedNow = OverlayDiagTracker.overlayAttached
        val balanceOk = attach == remove
        val leak = attachedNow || !balanceOk
        return MemorySummary(
            overlayAttachCount = attach,
            overlayRemoveCount = remove,
            windowAttachedCount = attach, // cumulative attach observations
            windowAttachedNow = attachedNow,
            leak = leak,
            balanceOk = balanceOk
        )
    }

    fun buildFailureMatrix(): JSONObject {
        val fails = OverlayDiagTracker.snapshotJson().optJSONArray("overlayFailures") ?: JSONArray()
        val counts = linkedMapOf<String, Int>()
        OverlayFailureReason.entries.forEach { counts[it.name] = 0 }
        for (i in 0 until fails.length()) {
            val reason = fails.getJSONObject(i).optString("failureReason", OverlayFailureReason.UNKNOWN.name)
            counts[reason] = (counts[reason] ?: 0) + 1
        }
        return JSONObject().apply {
            put("totalFailures", fails.length())
            counts.forEach { (k, v) -> put(k, v) }
        }
    }

    private fun nowElapsedMs(): Long =
        try {
            SystemClock.elapsedRealtime()
        } catch (_: Throwable) {
            System.nanoTime() / 1_000_000L
        }
}
