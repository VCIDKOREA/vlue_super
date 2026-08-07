package kr.vlue.calloverlay.diagnostics.recovery

import android.content.ComponentCallbacks2
import android.os.SystemClock
import kr.vlue.calloverlay.companion.CompanionOverlayController
import kr.vlue.calloverlay.companion.OverlayContext
import kr.vlue.calloverlay.companion.OverlayState
import kr.vlue.calloverlay.companion.ScreenState
import kr.vlue.calloverlay.diagnostics.OverlayDiagTracker
import kr.vlue.calloverlay.diagnostics.perf.CompanionPerfTracker
import org.json.JSONArray
import org.json.JSONObject

data class RecoveryStepResult(
    val index: Int,
    val event: String,
    val expectedState: OverlayState,
    val recoveredState: OverlayState,
    val expectedWindowAttached: Boolean,
    val windowAttached: Boolean,
    val recoveryTimeMs: Long,
    val recoverySuccess: Boolean,
    val failReasons: List<String>
) {
    fun toJson(): JSONObject = JSONObject().apply {
        put("index", index)
        put("recoveryEvent", event)
        put("expectedState", expectedState.name)
        put("recoveredState", recoveredState.name)
        put("expectedWindowAttached", expectedWindowAttached)
        put("windowAttached", windowAttached)
        put("recoveryTimeMs", recoveryTimeMs)
        put("recoverySuccess", recoverySuccess)
        if (failReasons.isNotEmpty()) put("failReasons", JSONArray(failReasons))
    }
}

data class RecoveryCaseResult(
    val id: CompanionRecoveryCaseId,
    val name: String,
    val description: String,
    val steps: List<RecoveryStepResult>,
    val passed: Boolean,
    val stateLeak: Boolean,
    val windowLeak: Boolean,
    val unexpectedTransitionCount: Int,
    val totalRecoveryTimeMs: Long,
    val hint: String?
) {
    fun toJson(): JSONObject = JSONObject().apply {
        put("caseId", id.name)
        put("caseName", name)
        put("description", description)
        put("passed", passed)
        put("verdict", if (passed) "PASS" else "FAIL")
        put("stateLeak", stateLeak)
        put("windowLeak", windowLeak)
        put("unexpectedTransitionCount", unexpectedTransitionCount)
        put("totalRecoveryTimeMs", totalRecoveryTimeMs)
        if (!hint.isNullOrBlank()) put("hint", hint)
        put("timeline", JSONArray().also { arr -> steps.forEach { arr.put(it.toJson()) } })
        put(
            "stateFlow",
            JSONArray(steps.map { "${it.event}:${it.recoveredState.name}" })
        )
    }
}

/**
 * Recovery Scenario Mock — Controller 기존 API + Lifecycle/Memory 관찰만.
 * 새 Window / Retry / Delay / State Machine 수정 없음.
 */
object CompanionRecoveryRunner {
    fun run(
        id: CompanionRecoveryCaseId,
        controller: CompanionOverlayController = CompanionOverlayController()
    ): RecoveryCaseResult {
        val def = CompanionRecoveryCatalog.byId(id)
        controller.onScreenStateChanged(ScreenState.SCREEN_ON)
        var windowAttached = false
        val caseStart = nowElapsedMs()
        val stepResults = mutableListOf<RecoveryStepResult>()

        def.steps.forEachIndexed { index, stepDef ->
            val t0 = nowElapsedMs()
            val outcome = applyEvent(controller, stepDef.event, windowAttached)
            windowAttached = outcome.windowAttached
            val snap = controller.snapshot()
            val recoveryTime = (nowElapsedMs() - t0).coerceAtLeast(0L)
            val fails = mutableListOf<String>()
            if (snap.state != stepDef.expected.state) {
                fails += "state expected=${stepDef.expected.state} actual=${snap.state}"
            }
            if (windowAttached != stepDef.expected.windowAttached) {
                fails += "windowAttached expected=${stepDef.expected.windowAttached} actual=$windowAttached"
            }
            val ok = fails.isEmpty()
            val step = RecoveryStepResult(
                index = index,
                event = stepDef.event,
                expectedState = stepDef.expected.state,
                recoveredState = snap.state,
                expectedWindowAttached = stepDef.expected.windowAttached,
                windowAttached = windowAttached,
                recoveryTimeMs = recoveryTime,
                recoverySuccess = ok,
                failReasons = fails
            )
            stepResults += step
            CompanionRecoveryTracker.recordRecoveryStep(
                recoveryEvent = step.event,
                recoveryTimeMs = step.recoveryTimeMs,
                recoveredState = step.recoveredState.name,
                expectedState = step.expectedState.name,
                recoverySuccess = step.recoverySuccess,
                windowAttached = step.windowAttached,
                failReasons = step.failReasons
            )
        }

        val unexpected = stepResults.count { !it.recoverySuccess }
        val final = controller.state
        val endsAttachedOk =
            id == CompanionRecoveryCaseId.CASE_2_LOW_MEMORY_TRIM ||
                id == CompanionRecoveryCaseId.CASE_4_CONFIGURATION_CHANGE
        val stateLeak =
            if (endsAttachedOk) final != OverlayState.SHOWCASE
            else final != OverlayState.IDLE
        val windowLeak =
            if (endsAttachedOk) {
                !windowAttached || CompanionPerfTracker.memoryAuditJson().optInt("windowCount") > 1
            } else {
                windowAttached ||
                    OverlayDiagTracker.overlayAttached ||
                    CompanionPerfTracker.memoryAuditJson().optInt("windowCount") > 0
            }

        val passed = unexpected == 0 && !stateLeak && !windowLeak
        val hint = when {
            unexpected > 0 ->
                stepResults.firstOrNull { !it.recoverySuccess }
                    ?.let { "step[${it.index}] ${it.event}: ${it.failReasons.joinToString("; ")}" }
            stateLeak -> "stateLeak final=$final"
            windowLeak -> "windowLeak attached=$windowAttached"
            else -> null
        }

        val result = RecoveryCaseResult(
            id = def.id,
            name = def.name,
            description = def.description,
            steps = stepResults,
            passed = passed,
            stateLeak = stateLeak,
            windowLeak = windowLeak,
            unexpectedTransitionCount = unexpected,
            totalRecoveryTimeMs = (nowElapsedMs() - caseStart).coerceAtLeast(0L),
            hint = hint
        )
        CompanionRecoveryTracker.recordRecoveryCaseResult(result.toJson())
        return result
    }

    fun runAll(): List<RecoveryCaseResult> =
        CompanionRecoveryCaseId.entries.map { id ->
            // 케이스 간 Window 관찰 잔여 정리 (실 Window 생성 없음)
            if (OverlayDiagTracker.overlayAttached) OverlayDiagTracker.onRemoveView()
            CompanionPerfTracker.noteOverlayDetached()
            run(id)
        }

    private data class ApplyOutcome(val windowAttached: Boolean)

    private fun applyEvent(
        c: CompanionOverlayController,
        event: String,
        windowAttached: Boolean
    ): ApplyOutcome {
        var attached = windowAttached

        fun attachObs() {
            if (!attached) {
                OverlayDiagTracker.onShowOverlay()
                OverlayDiagTracker.beginAttach("RECOVERY_SIM")
                OverlayDiagTracker.markAddViewBegin()
                OverlayDiagTracker.onAddView()
                OverlayDiagTracker.markAddViewSuccess()
                attached = true
            }
        }

        fun detachObs() {
            if (attached || OverlayDiagTracker.overlayAttached) {
                OverlayDiagTracker.onRemoveView()
            }
            CompanionPerfTracker.noteOverlayDetached()
            attached = false
        }

        fun resetToIdleProcess() {
            c.onCallEnd()
            detachObs()
            CompanionRecoveryTracker.recordServiceLifecycle("ON_DESTROY", event)
            CompanionRecoveryTracker.recordServiceLifecycle("ON_CREATE", event)
            CompanionRecoveryTracker.recordServiceLifecycle("ON_START_COMMAND", event)
        }

        when (event) {
            "SHOWCASE_PRE" -> {
                c.onAnswer(OverlayContext.IN_CALL)
                attachObs()
            }
            "FGS_KILL" -> {
                CompanionRecoveryTracker.recordServiceLifecycle("ON_DESTROY", "FGS_KILL")
                CompanionRecoveryTracker.recordServiceLifecycle("ON_TASK_REMOVED", "FGS_KILL")
                c.onCallEnd()
                detachObs()
            }
            "SERVICE_RESTART", "APP_RESTART", "APP_RELAUNCH" -> {
                CompanionRecoveryTracker.recordServiceLifecycle("ON_CREATE", event)
                CompanionRecoveryTracker.recordServiceLifecycle("ON_START_COMMAND", event)
                // 새 프로세스/서비스 — Controller는 새 인스턴스가 IDLE이어야 함.
                // 동일 객체면 이미 IDLE.
                if (c.state != OverlayState.IDLE) c.onCallEnd()
                detachObs()
            }
            "STATE_CHECK", "STATE_INIT_CHECK", "IDLE_CHECK", "LEAK_CHECK", "WINDOW_KEEP_CHECK" -> {
                /* 관찰만 */
            }
            "ON_TRIM_MEMORY" -> {
                CompanionRecoveryTracker.recordMemoryCallback(
                    kind = "onTrimMemory",
                    level = ComponentCallbacks2.TRIM_MEMORY_RUNNING_LOW,
                    detail = "mock"
                )
                // State Machine 변경 없음 — Showcase 유지
            }
            "PROCESS_DEATH", "PROCESS_KILL", "PACKAGE_UPDATE" -> {
                resetToIdleProcess()
            }
            "ROTATION" -> {
                CompanionRecoveryTracker.recordServiceLifecycle(
                    "CONFIGURATION_CHANGE",
                    "rotation"
                )
                // 단일 Window 유지 — attach 유지, 추가 Window 금지
                OverlayDiagTracker.beginLayout("FULLSCREEN", source = "recovery_rotation")
                OverlayDiagTracker.markLayoutApplied("FULLSCREEN", "FULLSCREEN")
            }
            "BOOT_COMPLETED", "RECEIVER" -> {
                CompanionRecoveryTracker.recordServiceLifecycle(event, "boot")
                if (c.state != OverlayState.IDLE) c.onCallEnd()
                detachObs()
            }
            "CALL_END" -> {
                c.onCallEnd()
                detachObs()
                CompanionRecoveryTracker.recordServiceLifecycle("CALL_END", "")
            }
            else -> Unit
        }
        return ApplyOutcome(attached)
    }

    private fun nowElapsedMs(): Long =
        try {
            SystemClock.elapsedRealtime()
        } catch (_: Throwable) {
            System.nanoTime() / 1_000_000L
        }
}
