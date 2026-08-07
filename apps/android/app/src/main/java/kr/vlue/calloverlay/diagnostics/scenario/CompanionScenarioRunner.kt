package kr.vlue.calloverlay.diagnostics.scenario

import android.os.SystemClock
import kr.vlue.calloverlay.companion.CompanionOverlayController
import kr.vlue.calloverlay.companion.CompanionOverlaySnapshot
import kr.vlue.calloverlay.companion.OverlayContext
import kr.vlue.calloverlay.companion.OverlayPosition
import kr.vlue.calloverlay.companion.OverlayState
import kr.vlue.calloverlay.companion.ScreenState
import kr.vlue.calloverlay.diagnostics.OverlayDiagTracker
import kr.vlue.calloverlay.diagnostics.OverlayFailureReason
import org.json.JSONArray
import org.json.JSONObject

enum class ScenarioStepVerdict {
    PASS,
    FAIL
}

data class ScenarioStepResult(
    val index: Int,
    val event: String,
    val expected: CompanionScenarioExpectation,
    val actualState: OverlayState,
    val actualPosition: String,
    val actualMiniVisibility: String,
    val actualScreenState: String,
    val actualFailureReason: OverlayFailureReason,
    val actualWindowAttached: Boolean,
    val elapsedMs: Long,
    val verdict: ScenarioStepVerdict,
    val failReasons: List<String>
) {
    fun toJson(): JSONObject = JSONObject().apply {
        put("index", index)
        put("event", event)
        put("verdict", verdict.name)
        put("elapsedMs", elapsedMs)
        put(
            "expected",
            JSONObject().apply {
                expected.state?.let { put("overlayState", it.name) }
                expected.position?.let { put("overlayPosition", it.name) }
                expected.miniVisibility?.let { put("miniCaseVisibility", it.name) }
                expected.screenState?.let { put("screenState", it.name) }
                expected.failureReason?.let { put("failureReason", it.name) }
                expected.windowAttached?.let { put("windowAttached", it) }
            }
        )
        put(
            "actual",
            JSONObject().apply {
                put("overlayState", actualState.name)
                put("overlayPosition", actualPosition)
                put("miniCaseVisibility", actualMiniVisibility)
                put("screenState", actualScreenState)
                put("failureReason", actualFailureReason.name)
                put("windowAttached", actualWindowAttached)
            }
        )
        if (failReasons.isNotEmpty()) {
            put("failReasons", JSONArray(failReasons))
        }
    }
}

data class ScenarioRunResult(
    val id: CompanionScenarioId,
    val name: String,
    val description: String,
    val steps: List<ScenarioStepResult>,
    val passed: Boolean,
    val totalElapsedMs: Long,
    val failureCount: Int,
    val unexpectedStateCount: Int,
    val missingTransitionHint: String?
) {
    fun toJson(): JSONObject = JSONObject().apply {
        put("scenarioId", id.name)
        put("scenarioName", name)
        put("description", description)
        put("passed", passed)
        put("verdict", if (passed) "PASS" else "FAIL")
        put("totalElapsedMs", totalElapsedMs)
        put("failureCount", failureCount)
        put("unexpectedStateCount", unexpectedStateCount)
        if (!missingTransitionHint.isNullOrBlank()) {
            put("missingTransitionHint", missingTransitionHint)
        }
        put("timeline", JSONArray().also { arr -> steps.forEach { arr.put(it.toJson()) } })
        put(
            "stateFlow",
            JSONArray().also { arr ->
                steps.forEach {
                    arr.put("${it.event}:${it.actualState.name}/${it.actualPosition}")
                }
            }
        )
        put(
            "kpi",
            JSONObject().apply {
                put("stepCount", steps.size)
                put("passCount", steps.count { it.verdict == ScenarioStepVerdict.PASS })
                put("failCount", steps.count { it.verdict == ScenarioStepVerdict.FAIL })
                put("totalElapsedMs", totalElapsedMs)
            }
        )
    }
}

/**
 * E2E 시나리오를 Controller에 재생하고 기대값과 비교한다.
 * Controller / OverlayState / Window를 수정하지 않는다 — 관찰·판정만.
 */
object CompanionScenarioRunner {
    fun run(
        id: CompanionScenarioId,
        controller: CompanionOverlayController = CompanionOverlayController()
    ): ScenarioRunResult {
        val def = CompanionScenarioCatalog.byId(id)
        prepareInitial(id, controller)
        val started = nowElapsedMs()
        var lastStepAt = started
        val stepResults = mutableListOf<ScenarioStepResult>()
        var windowAttached = false

        def.steps.forEachIndexed { index, stepDef ->
            val outcome = applyEvent(controller, stepDef.event, windowAttached)
            windowAttached = outcome.windowAttached
            val snap = controller.snapshot()
            val now = nowElapsedMs()
            val elapsed = (now - lastStepAt).coerceAtLeast(0L)
            lastStepAt = now
            val failReasons = compare(stepDef.expected, snap, outcome.failureReason, windowAttached)
            val verdict =
                if (failReasons.isEmpty()) ScenarioStepVerdict.PASS else ScenarioStepVerdict.FAIL
            stepResults += ScenarioStepResult(
                index = index,
                event = stepDef.event,
                expected = stepDef.expected,
                actualState = snap.state,
                actualPosition = snap.position.name,
                actualMiniVisibility = snap.miniCaseVisibility.name,
                actualScreenState = snap.screenState.name,
                actualFailureReason = outcome.failureReason,
                actualWindowAttached = windowAttached,
                elapsedMs = elapsed,
                verdict = verdict,
                failReasons = failReasons
            )
        }

        val unexpected = stepResults.count { it.verdict == ScenarioStepVerdict.FAIL }
        val failureSteps = stepResults.count {
            it.actualFailureReason != OverlayFailureReason.SUCCESS &&
                it.expected.failureReason == OverlayFailureReason.SUCCESS
        }
        val missing = stepResults.firstOrNull { it.verdict == ScenarioStepVerdict.FAIL }
            ?.let { "step[${it.index}] ${it.event}: ${it.failReasons.joinToString("; ")}" }

        val result = ScenarioRunResult(
            id = def.id,
            name = def.name,
            description = def.description,
            steps = stepResults,
            passed = unexpected == 0,
            totalElapsedMs = (nowElapsedMs() - started).coerceAtLeast(0L),
            failureCount = failureSteps,
            unexpectedStateCount = unexpected,
            missingTransitionHint = missing
        )
        OverlayDiagTracker.recordScenarioResult(result.toJson())
        return result
    }

    fun runAll(): List<ScenarioRunResult> =
        CompanionScenarioId.entries.map { run(it) }

    private fun prepareInitial(id: CompanionScenarioId, c: CompanionOverlayController) {
        c.onScreenStateChanged(ScreenState.SCREEN_ON)
        when (id) {
            CompanionScenarioId.SCENARIO_5_KEYPAD,
            CompanionScenarioId.SCENARIO_6_HOME_RESTORE -> {
                c.onAnswer(OverlayContext.IN_CALL)
            }
            CompanionScenarioId.SCENARIO_7_EDGE_SCREEN_RESTORE -> {
                c.onAnswer(OverlayContext.IN_CALL)
                c.onMinimize(OverlayContext.HOME_SCREEN)
            }
            CompanionScenarioId.SCENARIO_8_CALL_END_IDLE -> {
                c.onAnswer(OverlayContext.IN_CALL)
            }
            else -> Unit
        }
    }

    private data class ApplyOutcome(
        val windowAttached: Boolean,
        val failureReason: OverlayFailureReason
    )

    private fun applyEvent(
        c: CompanionOverlayController,
        event: String,
        windowAttached: Boolean
    ): ApplyOutcome {
        var attached = windowAttached
        var failure = OverlayFailureReason.SUCCESS
        when (event) {
            "INCOMING" -> {
                c.onIncoming(OverlayContext.HOME_SCREEN)
            }
            "BIG_PUSH" -> {
                val ok = c.requestBigPush(OverlayContext.HOME_SCREEN, callAlreadyAnswered = false)
                if (ok) {
                    attached = true
                } else {
                    failure = if (c.screenState == ScreenState.SCREEN_OFF ||
                        c.screenState == ScreenState.AOD
                    ) {
                        OverlayFailureReason.SCREEN_OFF_POLICY
                    } else {
                        OverlayFailureReason.UNKNOWN
                    }
                }
            }
            "BIG_PUSH_REEVAL" -> {
                /* SCREEN_ON 후 Position 재평가만 관찰 — request/retry 금지 */
                attached = c.state == OverlayState.BIG_PUSH &&
                    c.position != OverlayPosition.HIDDEN
            }
            "ANSWER" -> {
                c.onAnswer(OverlayContext.IN_CALL)
                attached = true
            }
            "SHOWCASE", "SHOWCASE_PRE" -> {
                when (c.state) {
                    OverlayState.MINI_CASE -> c.onRestoreShowcase(OverlayContext.IN_CALL)
                    OverlayState.SHOWCASE -> Unit
                    else -> c.onAnswer(OverlayContext.IN_CALL)
                }
                attached = true
            }
            "MINI_CASE", "MINI", "HOME" -> {
                c.onMinimize(
                    if (event == "HOME") OverlayContext.HOME_SCREEN
                    else OverlayContext.MINIMIZED
                )
                attached = true
            }
            "EDGE_HIDDEN", "EDGE_HIDE" -> {
                c.onMiniEdgeHidden()
            }
            "VISIBLE", "TAP_VISIBLE" -> {
                c.onMiniEdgeReveal()
            }
            "KEYPAD_OPEN" -> {
                c.onKeypad(true)
                attached = true
            }
            "KEYPAD_CLOSE" -> {
                c.onKeypad(false)
            }
            "APP_RETURN" -> {
                c.onRestoreShowcase(OverlayContext.IN_CALL)
                attached = true
            }
            "SCREEN_OFF" -> {
                c.onScreenStateChanged(ScreenState.SCREEN_OFF)
            }
            "SCREEN_ON" -> {
                c.onScreenStateChanged(ScreenState.SCREEN_ON)
            }
            "REJECT", "CALL_END", "OVERLAY_DISMISSED", "IDLE" -> {
                if (c.state != OverlayState.IDLE) {
                    c.onCallEnd()
                }
                attached = false
            }
            else -> {
                failure = OverlayFailureReason.UNKNOWN
            }
        }
        return ApplyOutcome(attached, failure)
    }

    private fun compare(
        expected: CompanionScenarioExpectation,
        snap: CompanionOverlaySnapshot,
        actualFailure: OverlayFailureReason,
        windowAttached: Boolean
    ): List<String> {
        val fails = mutableListOf<String>()
        expected.state?.let {
            if (snap.state != it) {
                fails += "state expected=$it actual=${snap.state}"
            }
        }
        expected.position?.let {
            if (snap.position != it) {
                fails += "position expected=$it actual=${snap.position}"
            }
        }
        expected.miniVisibility?.let {
            if (snap.miniCaseVisibility != it) {
                fails += "miniVisibility expected=$it actual=${snap.miniCaseVisibility}"
            }
        }
        expected.screenState?.let {
            if (snap.screenState != it) {
                fails += "screenState expected=$it actual=${snap.screenState}"
            }
        }
        expected.failureReason?.let {
            if (actualFailure != it) {
                fails += "failureReason expected=$it actual=$actualFailure"
            }
        }
        expected.windowAttached?.let {
            if (windowAttached != it) {
                fails += "windowAttached expected=$it actual=$windowAttached"
            }
        }
        return fails
    }

    private fun nowElapsedMs(): Long =
        try {
            SystemClock.elapsedRealtime()
        } catch (_: Throwable) {
            System.nanoTime() / 1_000_000L
        }
}
