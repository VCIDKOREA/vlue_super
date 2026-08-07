package kr.vlue.calloverlay.diagnostics.exception

import android.os.SystemClock
import kr.vlue.calloverlay.companion.CompanionOverlayController
import kr.vlue.calloverlay.companion.CompanionOverlaySnapshot
import kr.vlue.calloverlay.companion.OverlayContext
import kr.vlue.calloverlay.companion.OverlayPosition
import kr.vlue.calloverlay.companion.OverlayState
import kr.vlue.calloverlay.companion.ScreenState
import kr.vlue.calloverlay.diagnostics.OverlayDiagTracker
import kr.vlue.calloverlay.diagnostics.OverlayFailureReason
import kr.vlue.calloverlay.diagnostics.scenario.CompanionScenarioExpectation
import kr.vlue.calloverlay.diagnostics.scenario.ScenarioStepResult
import kr.vlue.calloverlay.diagnostics.scenario.ScenarioStepVerdict
import org.json.JSONArray
import org.json.JSONObject

data class ExceptionCaseResult(
    val id: CompanionExceptionCaseId,
    val name: String,
    val description: String,
    val steps: List<ScenarioStepResult>,
    val passed: Boolean,
    val totalElapsedMs: Long,
    val stateLeak: Boolean,
    val overlayLeak: Boolean,
    val windowDuplicate: Boolean,
    val unexpectedTransitionCount: Int,
    val hint: String?
) {
    fun toJson(): JSONObject = JSONObject().apply {
        put("caseId", id.name)
        put("caseName", name)
        put("description", description)
        put("passed", passed)
        put("verdict", if (passed) "PASS" else "FAIL")
        put("totalElapsedMs", totalElapsedMs)
        put("stateLeak", stateLeak)
        put("overlayLeak", overlayLeak)
        put("windowDuplicate", windowDuplicate)
        put("unexpectedTransitionCount", unexpectedTransitionCount)
        if (!hint.isNullOrBlank()) put("hint", hint)
        put("timeline", JSONArray().also { arr -> steps.forEach { arr.put(it.toJson()) } })
        put(
            "stateFlow",
            JSONArray().also { arr ->
                steps.forEach { arr.put("${it.event}:${it.actualState.name}") }
            }
        )
    }
}

/**
 * Exception Case 재생 — Controller 기존 API만 사용.
 * Window는 DiagTracker attach/remove 카운트로만 관찰 (실제 Window 생성 금지).
 */
object CompanionExceptionRunner {
    fun run(
        id: CompanionExceptionCaseId,
        controller: CompanionOverlayController = CompanionOverlayController()
    ): ExceptionCaseResult {
        val def = CompanionExceptionCatalog.byId(id)
        // 케이스 시작 시 이전 관찰 attach 잔여 정리 (Window 실생성 없음)
        if (OverlayDiagTracker.overlayAttached) {
            OverlayDiagTracker.onRemoveView()
        }
        val attachBase = OverlayDiagTracker.snapshotJson().optInt("addViewCount")
        val removeBase = OverlayDiagTracker.snapshotJson().optInt("removeViewCount")
        controller.onScreenStateChanged(ScreenState.SCREEN_ON)
        prepare(id, controller)

        val started = nowElapsedMs()
        var lastAt = started
        var windowAttached = OverlayDiagTracker.overlayAttached
        var windowDuplicate = false
        val steps = mutableListOf<ScenarioStepResult>()

        def.steps.forEachIndexed { index, stepDef ->
            val outcome = applyEvent(controller, stepDef.event, windowAttached)
            if (outcome.attemptedAttachWhileAttached) {
                windowDuplicate = true
            }
            windowAttached = outcome.windowAttached
            val snap = controller.snapshot()
            val now = nowElapsedMs()
            val elapsed = (now - lastAt).coerceAtLeast(0L)
            lastAt = now
            val fails = compare(stepDef.expected, snap, outcome.failureReason, windowAttached)
            val verdict =
                if (fails.isEmpty()) ScenarioStepVerdict.PASS else ScenarioStepVerdict.FAIL
            steps += ScenarioStepResult(
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
                failReasons = fails
            )
            OverlayDiagTracker.recordExceptionTimelineStep(steps.last().toJson())
        }

        val unexpected = steps.count { it.verdict == ScenarioStepVerdict.FAIL }
        val attachDelta =
            OverlayDiagTracker.snapshotJson().optInt("addViewCount") - attachBase
        val removeDelta =
            OverlayDiagTracker.snapshotJson().optInt("removeViewCount") - removeBase
        val endsAttachedOk =
            id == CompanionExceptionCaseId.CASE_2_PROCESS_PAUSE_RESUME ||
                id == CompanionExceptionCaseId.CASE_4_ROTATION_LAYOUT ||
                id == CompanionExceptionCaseId.CASE_8_DEBOUNCE_SINGLE_BIG_PUSH
        val overlayLeak =
            if (endsAttachedOk) {
                // 단일 Window 유지 허용 — 중복 attach만 거부
                attachDelta > removeDelta + 1 || windowDuplicate
            } else {
                windowAttached ||
                    OverlayDiagTracker.overlayAttached ||
                    attachDelta != removeDelta ||
                    windowDuplicate
            }
        val stateLeak =
            when (id) {
                CompanionExceptionCaseId.CASE_2_PROCESS_PAUSE_RESUME,
                CompanionExceptionCaseId.CASE_4_ROTATION_LAYOUT ->
                    controller.state != OverlayState.SHOWCASE
                CompanionExceptionCaseId.CASE_8_DEBOUNCE_SINGLE_BIG_PUSH ->
                    controller.state != OverlayState.BIG_PUSH
                else -> controller.state != OverlayState.IDLE
            }

        val passed =
            unexpected == 0 && !stateLeak && !overlayLeak && !windowDuplicate
        val hint = when {
            unexpected > 0 ->
                steps.firstOrNull { it.verdict == ScenarioStepVerdict.FAIL }
                    ?.let { "step[${it.index}] ${it.event}: ${it.failReasons.joinToString("; ")}" }
            stateLeak -> "stateLeak final=${controller.state}"
            overlayLeak ->
                "overlayLeak attachDelta=$attachDelta removeDelta=$removeDelta attached=${OverlayDiagTracker.overlayAttached}"
            windowDuplicate -> "windowDuplicate"
            else -> null
        }

        val result = ExceptionCaseResult(
            id = def.id,
            name = def.name,
            description = def.description,
            steps = steps,
            passed = passed,
            totalElapsedMs = (nowElapsedMs() - started).coerceAtLeast(0L),
            stateLeak = stateLeak,
            overlayLeak = overlayLeak,
            windowDuplicate = windowDuplicate,
            unexpectedTransitionCount = unexpected,
            hint = hint
        )
        OverlayDiagTracker.recordExceptionCaseResult(result.toJson())
        return result
    }

    fun runAll(): List<ExceptionCaseResult> =
        CompanionExceptionCaseId.entries.map { run(it) }

    private fun prepare(id: CompanionExceptionCaseId, c: CompanionOverlayController) {
        when (id) {
            CompanionExceptionCaseId.CASE_4_ROTATION_LAYOUT -> {
                c.onAnswer(OverlayContext.IN_CALL)
                simulateAttachIfNeeded(attached = false)
            }
            CompanionExceptionCaseId.CASE_5_EDGE_HIDE_CALL_END -> {
                c.onAnswer(OverlayContext.IN_CALL)
                c.onMinimize(OverlayContext.MINIMIZED)
                simulateAttachIfNeeded(attached = false)
            }
            CompanionExceptionCaseId.CASE_6_APP_KILL_RETURN -> {
                c.onAnswer(OverlayContext.IN_CALL)
                simulateAttachIfNeeded(attached = false)
            }
            else -> Unit
        }
    }

    private data class ApplyOutcome(
        val windowAttached: Boolean,
        val failureReason: OverlayFailureReason,
        val attemptedAttachWhileAttached: Boolean = false
    )

    private fun applyEvent(
        c: CompanionOverlayController,
        event: String,
        windowAttached: Boolean
    ): ApplyOutcome {
        var attached = windowAttached
        var failure = OverlayFailureReason.SUCCESS
        var dupAttempt = false

        fun attachOnce() {
            if (attached || OverlayDiagTracker.overlayAttached) {
                attached = true
                return
            }
            simulateAttach()
            attached = true
        }

        fun detachOnce() {
            if (attached || OverlayDiagTracker.overlayAttached) {
                simulateDetach()
            }
            attached = false
        }

        when (event) {
            "INCOMING", "INCOMING_BURST" -> {
                if (event == "INCOMING_BURST") {
                    repeat(5) { c.onIncoming(OverlayContext.HOME_SCREEN) }
                } else {
                    c.onIncoming(OverlayContext.HOME_SCREEN)
                }
            }
            "ANSWER" -> {
                c.onAnswer(OverlayContext.IN_CALL)
                attachOnce()
            }
            "SHOWCASE" -> {
                if (c.state != OverlayState.SHOWCASE) c.onAnswer(OverlayContext.IN_CALL)
                attachOnce()
            }
            "BIG_PUSH", "SINGLE_BIG_PUSH" -> {
                val ok = c.requestBigPush(OverlayContext.HOME_SCREEN, callAlreadyAnswered = false)
                if (ok) attachOnce()
                else failure = OverlayFailureReason.UNKNOWN
            }
            "BIG_PUSH_ATTEMPT_AFTER_END" -> {
                // Call already ended — BigPush must not attach
                val ok = c.requestBigPush(OverlayContext.HOME_SCREEN, callAlreadyAnswered = true)
                if (ok) {
                    attachOnce()
                    failure = OverlayFailureReason.UNKNOWN
                } else {
                    failure = OverlayFailureReason.CALL_ENDED
                    OverlayDiagTracker.recordOverlayFailure(
                        OverlayFailureReason.CALL_ENDED,
                        phase = "BIG_PUSH",
                        detail = "end before BigPush create"
                    )
                }
            }
            "CALL_END", "STATE_CLEANUP" -> {
                c.onCallEnd()
                detachOnce()
            }
            "PROCESS_PAUSE" -> {
                // 관찰만 — State Machine 변경 없음
                OverlayDiagTracker.recordExceptionNote("PROCESS_PAUSE", c.snapshot())
            }
            "PROCESS_RESUME" -> {
                OverlayDiagTracker.recordExceptionNote("PROCESS_RESUME", c.snapshot())
                // layout 재관찰 (retry/window 생성 없음)
                OverlayDiagTracker.beginLayout(c.position.name, source = "processResume")
                OverlayDiagTracker.markLayoutApplied("FULLSCREEN", c.position.name)
            }
            "PERMISSION_REVOKED", "OVERLAY_FAIL" -> {
                failure = OverlayFailureReason.PERMISSION_DENIED
                OverlayDiagTracker.recordOverlayFailure(
                    OverlayFailureReason.PERMISSION_DENIED,
                    phase = "BIG_PUSH",
                    detail = event
                )
                // BigPush 시도하지만 권한 없음 → attach 금지
                c.requestBigPush(OverlayContext.HOME_SCREEN, callAlreadyAnswered = false)
                // even if controller allows BIG_PUSH state, window attach fails
                if (c.state == OverlayState.BIG_PUSH) {
                    c.onCallEnd()
                }
                attached = false
            }
            "ROTATION" -> {
                OverlayDiagTracker.recordExceptionNote("ROTATION", c.snapshot())
            }
            "LAYOUT_REAPPLY" -> {
                OverlayDiagTracker.beginLayout(OverlayPosition.FULLSCREEN.name, source = "rotation")
                OverlayDiagTracker.markLayoutApplied("FULLSCREEN", OverlayPosition.FULLSCREEN.name)
            }
            "MINI", "HOME" -> {
                c.onMinimize(
                    if (event == "HOME") OverlayContext.HOME_SCREEN else OverlayContext.MINIMIZED
                )
                if (!attached) attachOnce()
            }
            "EDGE_HIDE" -> c.onMiniEdgeHidden()
            "APP_KILL" -> {
                c.onCallEnd()
                detachOnce()
                OverlayDiagTracker.recordExceptionNote("APP_KILL", c.snapshot())
            }
            "APP_RETURN" -> {
                // 프로세스 복귀 — 새 세션 전 Idle 유지 (Window 재생성 금지)
                OverlayDiagTracker.recordExceptionNote("APP_RETURN", c.snapshot())
            }
            "SECOND_INCOMING" -> {
                c.onIncoming(OverlayContext.HOME_SCREEN)
                // 다른 전화 수신 — 정리 전 관찰 (state 유지 가능)
                OverlayDiagTracker.recordExceptionNote("SECOND_INCOMING", c.snapshot())
            }
            "DEBOUNCE" -> {
                // 연속 Incoming은 INCOMING_BURST에서 처리됨 — debounce 후 단일 허용만 남김
                OverlayDiagTracker.recordExceptionNote("DEBOUNCE", c.snapshot())
            }
            "SECOND_BIG_PUSH_ATTEMPT" -> {
                if (attached) dupAttempt = true
            }
            else -> failure = OverlayFailureReason.UNKNOWN
        }
        return ApplyOutcome(attached, failure, dupAttempt)
    }

    private fun simulateAttach() {
        OverlayDiagTracker.onShowOverlay()
        OverlayDiagTracker.beginAttach("EXCEPTION_SIM")
        OverlayDiagTracker.markAddViewBegin()
        OverlayDiagTracker.onAddView()
        OverlayDiagTracker.markAddViewSuccess()
    }

    private fun simulateDetach() {
        if (OverlayDiagTracker.overlayAttached) {
            OverlayDiagTracker.onRemoveView()
        }
    }

    private fun simulateAttachIfNeeded(attached: Boolean) {
        if (!attached && !OverlayDiagTracker.overlayAttached) {
            simulateAttach()
        }
    }

    private fun compare(
        expected: CompanionScenarioExpectation,
        snap: CompanionOverlaySnapshot,
        actualFailure: OverlayFailureReason,
        windowAttached: Boolean
    ): List<String> {
        val fails = mutableListOf<String>()
        expected.state?.let {
            if (snap.state != it) fails += "state expected=$it actual=${snap.state}"
        }
        expected.position?.let {
            if (snap.position != it) fails += "position expected=$it actual=${snap.position}"
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
