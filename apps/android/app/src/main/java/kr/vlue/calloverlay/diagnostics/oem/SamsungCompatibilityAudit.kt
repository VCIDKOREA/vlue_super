package kr.vlue.calloverlay.diagnostics.oem

import kr.vlue.calloverlay.companion.MiniCaseVisibility
import kr.vlue.calloverlay.companion.OverlayContext
import kr.vlue.calloverlay.companion.OverlayPosition
import kr.vlue.calloverlay.companion.OverlayState
import kr.vlue.calloverlay.companion.ScreenState
import kr.vlue.calloverlay.diagnostics.OverlayDiagTracker
import kr.vlue.calloverlay.diagnostics.OverlayFailureReason
import kr.vlue.calloverlay.diagnostics.scenario.CompanionScenarioExpectation
import kr.vlue.calloverlay.diagnostics.scenario.CompanionScenarioStepDef
import kr.vlue.calloverlay.diagnostics.scenario.ScenarioStepResult
import kr.vlue.calloverlay.diagnostics.scenario.ScenarioStepVerdict
import kr.vlue.calloverlay.companion.CompanionOverlayController
import org.json.JSONArray
import org.json.JSONObject

/**
 * Samsung One UI Hardening Audit — Diagnostics 관찰만.
 * Architecture Freeze: State / Controller / Window 변경 금지.
 */
object SamsungCompatibilityAudit {
    /** One UI 실기 검증용 Call Flow (Diagnostics 강화) */
    val oneUiCallFlowSteps: List<CompanionScenarioStepDef> = listOf(
        CompanionScenarioStepDef(
            "INCOMING",
            CompanionScenarioExpectation(state = OverlayState.IDLE)
        ),
        CompanionScenarioStepDef(
            "ANSWER",
            CompanionScenarioExpectation(
                state = OverlayState.SHOWCASE,
                position = OverlayPosition.FULLSCREEN
            )
        ),
        CompanionScenarioStepDef(
            "KEYPAD",
            CompanionScenarioExpectation(
                state = OverlayState.MINI_CASE,
                position = OverlayPosition.MINI_CASE
            )
        ),
        CompanionScenarioStepDef(
            "MINI",
            CompanionScenarioExpectation(
                state = OverlayState.MINI_CASE,
                miniVisibility = MiniCaseVisibility.VISIBLE
            )
        ),
        CompanionScenarioStepDef(
            "EDGE",
            CompanionScenarioExpectation(
                state = OverlayState.MINI_CASE,
                miniVisibility = MiniCaseVisibility.EDGE_HIDDEN
            )
        ),
        CompanionScenarioStepDef(
            "RESTORE",
            CompanionScenarioExpectation(
                state = OverlayState.SHOWCASE,
                position = OverlayPosition.FULLSCREEN
            )
        ),
        CompanionScenarioStepDef(
            "CALL_END",
            CompanionScenarioExpectation(
                state = OverlayState.IDLE,
                position = OverlayPosition.HIDDEN
            )
        )
    )

    val auditChecklistIds: List<String> = listOf(
        "OVERLAY_PERMISSION",
        "FOREGROUND_SERVICE",
        "BATTERY_OPTIMIZATION",
        "WINDOW_TOKEN",
        "TYPE_APPLICATION_OVERLAY",
        "BAD_TOKEN",
        "SCREEN_OFF",
        "AOD",
        "CALL_UI",
        "MINI_CALL"
    )

    fun buildChecklist(oem: JSONObject?, reliability: JSONObject, failures: JSONArray): JSONArray {
        val canDraw = oem?.optBoolean("overlayPermission", false) ?: false
        val batteryOk = when {
            oem == null || !oem.has("batteryOptimizationIgnored") ||
                oem.isNull("batteryOptimizationIgnored") -> null
            else -> oem.optBoolean("batteryOptimizationIgnored")
        }
        val reasons = failureReasonCounts(failures)
        fun item(id: String, status: String, detail: String) =
            JSONObject().apply {
                put("id", id)
                put("status", status)
                put("detail", detail)
            }

        return JSONArray().apply {
            put(
                item(
                    "OVERLAY_PERMISSION",
                    if (canDraw) "OK" else "RISK",
                    "overlayPermission=$canDraw"
                )
            )
            put(
                item(
                    "FOREGROUND_SERVICE",
                    "OBSERVE",
                    "FGS required for call overlay stability (no policy change)"
                )
            )
            put(
                item(
                    "BATTERY_OPTIMIZATION",
                    when (batteryOk) {
                        true -> "OK"
                        false -> "RISK"
                        null -> "UNKNOWN"
                    },
                    "batteryOptimizationIgnored=$batteryOk"
                )
            )
            put(
                item(
                    "WINDOW_TOKEN",
                    if ((reasons["BAD_TOKEN"] ?: 0) > 0) "FAIL_OBSERVED" else "OK",
                    "badTokenCount=${reasons["BAD_TOKEN"] ?: 0}"
                )
            )
            put(
                item(
                    "TYPE_APPLICATION_OVERLAY",
                    "OBSERVE",
                    "Single window type 2038 — Architecture Freeze"
                )
            )
            put(
                item(
                    "BAD_TOKEN",
                    if ((reasons["BAD_TOKEN"] ?: 0) + (reasons["OEM_RESTRICTED"] ?: 0) > 0) {
                        "FAIL_OBSERVED"
                    } else {
                        "OK"
                    },
                    "badToken=${reasons["BAD_TOKEN"] ?: 0} oemRestricted=${reasons["OEM_RESTRICTED"] ?: 0}"
                )
            )
            put(
                item(
                    "SCREEN_OFF",
                    if ((reasons["SCREEN_OFF_POLICY"] ?: 0) > 0) "POLICY_HIT" else "OK",
                    "screenOffPolicy=${reasons["SCREEN_OFF_POLICY"] ?: 0}"
                )
            )
            put(
                item(
                    "AOD",
                    "OBSERVE",
                    "AOD treated as screen-off policy for BigPush position"
                )
            )
            put(
                item(
                    "CALL_UI",
                    "OBSERVE",
                    "One UI Call UI — Companion does not replace dialer"
                )
            )
            put(
                item(
                    "MINI_CALL",
                    "OBSERVE",
                    "System Mini Call vs Companion Mini — single window only"
                )
            )
            put(
                item(
                    "ATTACH_SUCCESS_RATE",
                    rateStatus(reliability.optDouble("attachSuccessRate", -1.0)),
                    "attachSuccessRate=${reliability.opt("attachSuccessRate")}"
                )
            )
            put(
                item(
                    "LAYOUT_SUCCESS_RATE",
                    rateStatus(reliability.optDouble("layoutSuccessRate", -1.0)),
                    "layoutSuccessRate=${reliability.opt("layoutSuccessRate")}"
                )
            )
        }
    }

    fun buildAttachAudit(reliability: JSONObject, failures: JSONArray, attachTimeline: JSONArray): JSONObject {
        val reasons = failureReasonCounts(failures)
        val attempts = reliability.optInt("attachAttemptCount", 0)
        val success = reliability.optInt("attachSuccessCount", 0)
        val failRate =
            if (attempts > 0) 1.0 - (success.toDouble() / attempts) else 0.0
        return JSONObject().apply {
            put("attachAttemptCount", attempts)
            put("attachSuccessCount", success)
            put("attachFailRate", failRate)
            put("attachSuccessRate", reliability.opt("attachSuccessRate") ?: JSONObject.NULL)
            put("badTokenCount", reasons["BAD_TOKEN"] ?: 0)
            put("oemRejectCount", reasons["OEM_RESTRICTED"] ?: 0)
            put("permissionRejectCount", reasons["PERMISSION_DENIED"] ?: 0)
            put("windowRejectedCount", reasons["WINDOW_REJECTED"] ?: 0)
            put("attachTimelineSize", attachTimeline.length())
        }
    }

    fun buildLayoutAudit(layoutTimeline: JSONArray, reliability: JSONObject): JSONObject {
        val results = linkedMapOf(
            "TOP" to 0,
            "BOTTOM" to 0,
            "FULLSCREEN" to 0,
            "MINI_CASE" to 0,
            "HIDDEN" to 0,
            "GONE" to 0
        )
        var applied = 0
        var failed = 0
        for (i in 0 until layoutTimeline.length()) {
            val ev = layoutTimeline.getJSONObject(i)
            when (ev.optString("step")) {
                "LAYOUT_APPLIED" -> {
                    applied++
                    val result = ev.optString("result")
                    val pos = ev.optString("position")
                    when {
                        results.containsKey(result) -> results[result] = results.getValue(result) + 1
                        results.containsKey(pos) -> results[pos] = results.getValue(pos) + 1
                    }
                }
                "LAYOUT_FAILED" -> failed++
            }
        }
        return JSONObject().apply {
            put("layoutAttemptCount", reliability.optInt("layoutAttemptCount", 0))
            put("layoutSuccessCount", reliability.optInt("layoutSuccessCount", 0))
            put("layoutSuccessRate", reliability.opt("layoutSuccessRate") ?: JSONObject.NULL)
            put("layoutAppliedCount", applied)
            put("layoutFailedCount", failed)
            put(
                "commits",
                JSONObject().also { c -> results.forEach { (k, v) -> c.put(k, v) } }
            )
            put(
                "allLayoutsObservedOk",
                failed == 0 && (applied > 0 || reliability.optInt("layoutAttemptCount", 0) == 0)
            )
        }
    }

    /**
     * Tracker 스냅샷 기반 Samsung Audit 페이로드.
     */
    fun buildFromTracker(diag: JSONObject): JSONObject {
        val oem = diag.optJSONObject("oemDeviceInfo")
        val reliability = diag.optJSONObject("overlayReliability") ?: JSONObject()
        val failures = diag.optJSONArray("overlayFailures") ?: JSONArray()
        val attachTl = diag.optJSONArray("attachTimeline") ?: JSONArray()
        val layoutTl = diag.optJSONArray("layoutTimeline") ?: JSONArray()
        val family = OemRuleCatalog.resolveFamily(
            oem?.optString("manufacturer"),
            oem?.optString("brand")
        )
        return JSONObject().apply {
            put("auditTarget", "SAMSUNG_ONE_UI")
            put("oemFamily", family.name)
            put("architectureFreeze", true)
            put("checklist", buildChecklist(oem, reliability, failures))
            put("attachAudit", buildAttachAudit(reliability, failures, attachTl))
            put("layoutAudit", buildLayoutAudit(layoutTl, reliability))
            put("deviceCompatibility", OemRuleCatalog.fromOemDeviceInfo(oem))
            put("oneUiCallFlow", oneUiCallFlowDefinitionJson())
        }
    }

    fun oneUiCallFlowDefinitionJson(): JSONObject =
        JSONObject().apply {
            put("name", "OneUI Call Flow")
            put(
                "flow",
                JSONArray(
                    listOf(
                        "Incoming",
                        "Answer",
                        "Keypad",
                        "Mini",
                        "Edge",
                        "Restore",
                        "Call End"
                    )
                )
            )
            put(
                "steps",
                JSONArray().also { arr ->
                    oneUiCallFlowSteps.forEach { s ->
                        arr.put(
                            JSONObject().apply {
                                put("event", s.event)
                                s.expected.state?.let { put("expectedState", it.name) }
                                s.expected.position?.let { put("expectedPosition", it.name) }
                                s.expected.miniVisibility?.let { put("expectedMiniVisibility", it.name) }
                            }
                        )
                    }
                }
            )
        }

    /**
     * One UI Call Flow를 Controller에 재생 (기존 API만) — QA Diagnostics.
     */
    fun runOneUiCallFlow(
        controller: CompanionOverlayController = CompanionOverlayController()
    ): JSONObject {
        controller.onScreenStateChanged(ScreenState.SCREEN_ON)
        val steps = mutableListOf<ScenarioStepResult>()
        var index = 0
        fun record(event: String, expected: CompanionScenarioExpectation) {
            val snap = controller.snapshot()
            val fails = mutableListOf<String>()
            expected.state?.let {
                if (snap.state != it) fails += "state expected=$it actual=${snap.state}"
            }
            expected.position?.let {
                if (snap.position != it) fails += "position expected=$it actual=${snap.position}"
            }
            expected.miniVisibility?.let {
                if (snap.miniCaseVisibility != it) {
                    fails += "mini expected=$it actual=${snap.miniCaseVisibility}"
                }
            }
            steps += ScenarioStepResult(
                index = index++,
                event = event,
                expected = expected,
                actualState = snap.state,
                actualPosition = snap.position.name,
                actualMiniVisibility = snap.miniCaseVisibility.name,
                actualScreenState = snap.screenState.name,
                actualFailureReason = OverlayFailureReason.SUCCESS,
                actualWindowAttached = snap.state != OverlayState.IDLE,
                elapsedMs = 0,
                verdict = if (fails.isEmpty()) ScenarioStepVerdict.PASS else ScenarioStepVerdict.FAIL,
                failReasons = fails
            )
        }

        controller.onIncoming(OverlayContext.HOME_SCREEN)
        record("INCOMING", oneUiCallFlowSteps[0].expected)

        controller.onAnswer(OverlayContext.IN_CALL)
        record("ANSWER", oneUiCallFlowSteps[1].expected)

        controller.onKeypad(true)
        record("KEYPAD", oneUiCallFlowSteps[2].expected)

        record("MINI", oneUiCallFlowSteps[3].expected)

        controller.onMiniEdgeHidden()
        record("EDGE", oneUiCallFlowSteps[4].expected)

        controller.onRestoreShowcase(OverlayContext.IN_CALL)
        record("RESTORE", oneUiCallFlowSteps[5].expected)

        controller.onCallEnd()
        record("CALL_END", oneUiCallFlowSteps[6].expected)

        val passed = steps.all { it.verdict == ScenarioStepVerdict.PASS }
        return JSONObject().apply {
            put("name", "OneUI Call Flow")
            put("passed", passed)
            put("verdict", if (passed) "PASS" else "FAIL")
            put("timeline", JSONArray().also { arr -> steps.forEach { arr.put(it.toJson()) } })
            put(
                "stateFlow",
                JSONArray(steps.map { "${it.event}:${it.actualState.name}" })
            )
        }
    }

    /**
     * Mock attach/layout failures for Samsung Audit unit tests.
     */
    fun runMockAttachLayoutAudit(): JSONObject {
        OverlayDiagTracker.beginAttach("SAMSUNG_AUDIT")
        OverlayDiagTracker.markAddViewBegin()
        OverlayDiagTracker.markAddViewSuccess()

        OverlayDiagTracker.beginAttach("SAMSUNG_AUDIT_FAIL")
        OverlayDiagTracker.markAddViewBegin()
        OverlayDiagTracker.markAddViewFailed(
            OverlayFailureReason.BAD_TOKEN,
            RuntimeException("BadTokenException"),
            phase = "SAMSUNG_AUDIT"
        )

        OverlayDiagTracker.beginAttach("SAMSUNG_OEM")
        OverlayDiagTracker.markAddViewFailed(
            OverlayFailureReason.OEM_RESTRICTED,
            RuntimeException("permission denied for window type 2038"),
            phase = "SAMSUNG_AUDIT"
        )

        OverlayDiagTracker.recordOverlayFailure(
            OverlayFailureReason.PERMISSION_DENIED,
            phase = "SAMSUNG_AUDIT",
            detail = "mock permission reject"
        )

        listOf("TOP", "BOTTOM", "FULLSCREEN", "MINI_CASE", "HIDDEN").forEach { pos ->
            OverlayDiagTracker.beginLayout(pos, source = "samsungAudit")
            val result = if (pos == "HIDDEN") "GONE" else pos
            OverlayDiagTracker.markLayoutApplied(result, pos)
        }

        return buildFromTracker(OverlayDiagTracker.snapshotJson())
    }

    private fun failureReasonCounts(failures: JSONArray): Map<String, Int> {
        val map = mutableMapOf<String, Int>()
        for (i in 0 until failures.length()) {
            val r = failures.getJSONObject(i).optString("failureReason", "UNKNOWN")
            map[r] = (map[r] ?: 0) + 1
        }
        return map
    }

    private fun rateStatus(rate: Double): String =
        when {
            rate < 0 -> "UNKNOWN"
            rate >= 0.95 -> "OK"
            rate >= 0.7 -> "WARN"
            else -> "RISK"
        }
}
