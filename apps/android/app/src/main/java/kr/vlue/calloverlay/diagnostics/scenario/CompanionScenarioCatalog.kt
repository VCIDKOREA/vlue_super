package kr.vlue.calloverlay.diagnostics.scenario

import kr.vlue.calloverlay.companion.MiniCaseVisibility
import kr.vlue.calloverlay.companion.OverlayPosition
import kr.vlue.calloverlay.companion.OverlayState
import kr.vlue.calloverlay.companion.ScreenState
import kr.vlue.calloverlay.diagnostics.OverlayFailureReason

/**
 * Phase 4-C 대표 E2E 시나리오 ID.
 * Architecture / Controller / OverlayState 를 바꾸지 않는다 — 검증·관찰용.
 */
enum class CompanionScenarioId {
    SCENARIO_1_FULL_FLOW,
    SCENARIO_2_ANSWER_SKIP_BIG_PUSH,
    SCENARIO_3_REJECT,
    SCENARIO_4_SCREEN_OFF_REEVAL,
    SCENARIO_5_KEYPAD,
    SCENARIO_6_HOME_RESTORE,
    SCENARIO_7_EDGE_SCREEN_RESTORE,
    SCENARIO_8_CALL_END_IDLE
}

/**
 * 시나리오 한 단계의 기대값.
 * null 필드는 비교하지 않는다 (해당 축 무관).
 */
data class CompanionScenarioExpectation(
    val state: OverlayState? = null,
    val position: OverlayPosition? = null,
    val miniVisibility: MiniCaseVisibility? = null,
    val screenState: ScreenState? = null,
    val failureReason: OverlayFailureReason? = OverlayFailureReason.SUCCESS,
    /** CALL_END 후 Window 유지 여부 관찰 — false면 removeView 기대(제품 dismiss) */
    val windowAttached: Boolean? = null
)

data class CompanionScenarioStepDef(
    val event: String,
    val expected: CompanionScenarioExpectation
)

data class CompanionScenarioDef(
    val id: CompanionScenarioId,
    val name: String,
    val description: String,
    val steps: List<CompanionScenarioStepDef>
)

object CompanionScenarioCatalog {
    val all: List<CompanionScenarioDef> = listOf(
        scenario1(),
        scenario2(),
        scenario3(),
        scenario4(),
        scenario5(),
        scenario6(),
        scenario7(),
        scenario8()
    )

    fun byId(id: CompanionScenarioId): CompanionScenarioDef =
        all.first { it.id == id }

    /** Incoming → BIG_PUSH → Answer → SHOWCASE → MINI → EDGE → VISIBLE → SHOWCASE → CALL_END → IDLE */
    private fun scenario1() = CompanionScenarioDef(
        id = CompanionScenarioId.SCENARIO_1_FULL_FLOW,
        name = "Scenario 1 Full Flow",
        description = "Incoming→BigPush→Answer→Showcase→Mini→Edge→Visible→Showcase→CallEnd→Idle",
        steps = listOf(
            CompanionScenarioStepDef(
                "INCOMING",
                CompanionScenarioExpectation(
                    state = OverlayState.IDLE,
                    position = OverlayPosition.HIDDEN,
                    screenState = ScreenState.SCREEN_ON
                )
            ),
            CompanionScenarioStepDef(
                "BIG_PUSH",
                CompanionScenarioExpectation(
                    state = OverlayState.BIG_PUSH,
                    position = OverlayPosition.BOTTOM,
                    screenState = ScreenState.SCREEN_ON
                )
            ),
            CompanionScenarioStepDef(
                "ANSWER",
                CompanionScenarioExpectation(
                    state = OverlayState.SHOWCASE,
                    position = OverlayPosition.FULLSCREEN,
                    miniVisibility = MiniCaseVisibility.VISIBLE
                )
            ),
            CompanionScenarioStepDef(
                "MINI_CASE",
                CompanionScenarioExpectation(
                    state = OverlayState.MINI_CASE,
                    position = OverlayPosition.MINI_CASE,
                    miniVisibility = MiniCaseVisibility.VISIBLE
                )
            ),
            CompanionScenarioStepDef(
                "EDGE_HIDDEN",
                CompanionScenarioExpectation(
                    state = OverlayState.MINI_CASE,
                    position = OverlayPosition.MINI_CASE,
                    miniVisibility = MiniCaseVisibility.EDGE_HIDDEN
                )
            ),
            CompanionScenarioStepDef(
                "VISIBLE",
                CompanionScenarioExpectation(
                    state = OverlayState.MINI_CASE,
                    position = OverlayPosition.MINI_CASE,
                    miniVisibility = MiniCaseVisibility.VISIBLE
                )
            ),
            CompanionScenarioStepDef(
                "SHOWCASE",
                CompanionScenarioExpectation(
                    state = OverlayState.SHOWCASE,
                    position = OverlayPosition.FULLSCREEN,
                    miniVisibility = MiniCaseVisibility.VISIBLE
                )
            ),
            CompanionScenarioStepDef(
                "CALL_END",
                CompanionScenarioExpectation(
                    state = OverlayState.IDLE,
                    position = OverlayPosition.HIDDEN,
                    windowAttached = false
                )
            ),
            CompanionScenarioStepDef(
                "IDLE",
                CompanionScenarioExpectation(
                    state = OverlayState.IDLE,
                    position = OverlayPosition.HIDDEN,
                    windowAttached = false
                )
            )
        )
    )

    /** Incoming → 즉시 Answer → SHOWCASE (BigPush 없이) → CALL_END */
    private fun scenario2() = CompanionScenarioDef(
        id = CompanionScenarioId.SCENARIO_2_ANSWER_SKIP_BIG_PUSH,
        name = "Scenario 2 Answer Skip BigPush",
        description = "Incoming→Answer(no BigPush)→Showcase→CallEnd",
        steps = listOf(
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
                "CALL_END",
                CompanionScenarioExpectation(
                    state = OverlayState.IDLE,
                    position = OverlayPosition.HIDDEN,
                    windowAttached = false
                )
            )
        )
    )

    /** Incoming → BIG_PUSH → Reject → IDLE */
    private fun scenario3() = CompanionScenarioDef(
        id = CompanionScenarioId.SCENARIO_3_REJECT,
        name = "Scenario 3 Reject",
        description = "Incoming→BigPush→Reject→Idle",
        steps = listOf(
            CompanionScenarioStepDef(
                "INCOMING",
                CompanionScenarioExpectation(state = OverlayState.IDLE)
            ),
            CompanionScenarioStepDef(
                "BIG_PUSH",
                CompanionScenarioExpectation(
                    state = OverlayState.BIG_PUSH,
                    position = OverlayPosition.BOTTOM
                )
            ),
            CompanionScenarioStepDef(
                "REJECT",
                CompanionScenarioExpectation(
                    state = OverlayState.IDLE,
                    position = OverlayPosition.HIDDEN,
                    windowAttached = false
                )
            ),
            CompanionScenarioStepDef(
                "IDLE",
                CompanionScenarioExpectation(
                    state = OverlayState.IDLE,
                    position = OverlayPosition.HIDDEN
                )
            )
        )
    )

    /** Incoming → BIG_PUSH → SCREEN_OFF → SCREEN_ON → BigPush 정책 재평가 */
    private fun scenario4() = CompanionScenarioDef(
        id = CompanionScenarioId.SCENARIO_4_SCREEN_OFF_REEVAL,
        name = "Scenario 4 Screen Off Reeval",
        description = "Incoming→BigPush→ScreenOff→ScreenOn→position re-eval (state kept)",
        steps = listOf(
            CompanionScenarioStepDef(
                "INCOMING",
                CompanionScenarioExpectation(state = OverlayState.IDLE)
            ),
            CompanionScenarioStepDef(
                "BIG_PUSH",
                CompanionScenarioExpectation(
                    state = OverlayState.BIG_PUSH,
                    position = OverlayPosition.BOTTOM,
                    screenState = ScreenState.SCREEN_ON
                )
            ),
            CompanionScenarioStepDef(
                "SCREEN_OFF",
                CompanionScenarioExpectation(
                    state = OverlayState.BIG_PUSH,
                    position = OverlayPosition.TOP,
                    screenState = ScreenState.SCREEN_OFF
                )
            ),
            CompanionScenarioStepDef(
                "SCREEN_ON",
                CompanionScenarioExpectation(
                    state = OverlayState.BIG_PUSH,
                    position = OverlayPosition.BOTTOM,
                    screenState = ScreenState.SCREEN_ON
                )
            ),
            CompanionScenarioStepDef(
                "BIG_PUSH_REEVAL",
                CompanionScenarioExpectation(
                    state = OverlayState.BIG_PUSH,
                    position = OverlayPosition.BOTTOM,
                    screenState = ScreenState.SCREEN_ON
                )
            )
        )
    )

    /**
     * SHOWCASE → KEYPAD OPEN → MINI → KEYPAD CLOSE → (MINI 유지) → RESTORE → SHOWCASE
     * Controller: keypad close는 state를 SHOWCASE로 올리지 않음 — restore로 복귀 (기존 API).
     */
    private fun scenario5() = CompanionScenarioDef(
        id = CompanionScenarioId.SCENARIO_5_KEYPAD,
        name = "Scenario 5 Keypad",
        description = "Showcase→KeypadOpen→Mini→KeypadClose→Restore→Showcase",
        steps = listOf(
            CompanionScenarioStepDef(
                "SHOWCASE",
                CompanionScenarioExpectation(
                    state = OverlayState.SHOWCASE,
                    position = OverlayPosition.FULLSCREEN
                )
            ),
            CompanionScenarioStepDef(
                "KEYPAD_OPEN",
                CompanionScenarioExpectation(
                    state = OverlayState.MINI_CASE,
                    position = OverlayPosition.MINI_CASE,
                    miniVisibility = MiniCaseVisibility.VISIBLE
                )
            ),
            CompanionScenarioStepDef(
                "MINI",
                CompanionScenarioExpectation(
                    state = OverlayState.MINI_CASE,
                    position = OverlayPosition.MINI_CASE
                )
            ),
            CompanionScenarioStepDef(
                "KEYPAD_CLOSE",
                CompanionScenarioExpectation(
                    state = OverlayState.MINI_CASE,
                    position = OverlayPosition.MINI_CASE,
                    miniVisibility = MiniCaseVisibility.VISIBLE
                )
            ),
            CompanionScenarioStepDef(
                "SHOWCASE",
                CompanionScenarioExpectation(
                    state = OverlayState.SHOWCASE,
                    position = OverlayPosition.FULLSCREEN
                )
            )
        )
    )

    /** SHOWCASE → HOME → MINI → APP 복귀 → SHOWCASE */
    private fun scenario6() = CompanionScenarioDef(
        id = CompanionScenarioId.SCENARIO_6_HOME_RESTORE,
        name = "Scenario 6 Home Restore",
        description = "Showcase→Home→Mini→AppReturn→Showcase",
        steps = listOf(
            CompanionScenarioStepDef(
                "SHOWCASE",
                CompanionScenarioExpectation(
                    state = OverlayState.SHOWCASE,
                    position = OverlayPosition.FULLSCREEN
                )
            ),
            CompanionScenarioStepDef(
                "HOME",
                CompanionScenarioExpectation(
                    state = OverlayState.MINI_CASE,
                    position = OverlayPosition.MINI_CASE,
                    miniVisibility = MiniCaseVisibility.VISIBLE
                )
            ),
            CompanionScenarioStepDef(
                "MINI",
                CompanionScenarioExpectation(
                    state = OverlayState.MINI_CASE,
                    position = OverlayPosition.MINI_CASE
                )
            ),
            CompanionScenarioStepDef(
                "APP_RETURN",
                CompanionScenarioExpectation(
                    state = OverlayState.SHOWCASE,
                    position = OverlayPosition.FULLSCREEN
                )
            ),
            CompanionScenarioStepDef(
                "SHOWCASE",
                CompanionScenarioExpectation(
                    state = OverlayState.SHOWCASE,
                    position = OverlayPosition.FULLSCREEN
                )
            )
        )
    )

    /** MINI → EDGE_HIDE → SCREEN_OFF → SCREEN_ON → Tap → VISIBLE → SHOWCASE */
    private fun scenario7() = CompanionScenarioDef(
        id = CompanionScenarioId.SCENARIO_7_EDGE_SCREEN_RESTORE,
        name = "Scenario 7 Edge Screen Restore",
        description = "Mini→EdgeHide→ScreenOff→ScreenOn→TapVisible→Showcase",
        steps = listOf(
            CompanionScenarioStepDef(
                "MINI",
                CompanionScenarioExpectation(
                    state = OverlayState.MINI_CASE,
                    position = OverlayPosition.MINI_CASE,
                    miniVisibility = MiniCaseVisibility.VISIBLE,
                    screenState = ScreenState.SCREEN_ON
                )
            ),
            CompanionScenarioStepDef(
                "EDGE_HIDE",
                CompanionScenarioExpectation(
                    state = OverlayState.MINI_CASE,
                    miniVisibility = MiniCaseVisibility.EDGE_HIDDEN
                )
            ),
            CompanionScenarioStepDef(
                "SCREEN_OFF",
                CompanionScenarioExpectation(
                    state = OverlayState.MINI_CASE,
                    position = OverlayPosition.MINI_CASE,
                    miniVisibility = MiniCaseVisibility.EDGE_HIDDEN,
                    screenState = ScreenState.SCREEN_OFF
                )
            ),
            CompanionScenarioStepDef(
                "SCREEN_ON",
                CompanionScenarioExpectation(
                    state = OverlayState.MINI_CASE,
                    miniVisibility = MiniCaseVisibility.EDGE_HIDDEN,
                    screenState = ScreenState.SCREEN_ON
                )
            ),
            CompanionScenarioStepDef(
                "TAP_VISIBLE",
                CompanionScenarioExpectation(
                    state = OverlayState.MINI_CASE,
                    miniVisibility = MiniCaseVisibility.VISIBLE
                )
            ),
            CompanionScenarioStepDef(
                "VISIBLE",
                CompanionScenarioExpectation(
                    state = OverlayState.MINI_CASE,
                    miniVisibility = MiniCaseVisibility.VISIBLE
                )
            ),
            CompanionScenarioStepDef(
                "SHOWCASE",
                CompanionScenarioExpectation(
                    state = OverlayState.SHOWCASE,
                    position = OverlayPosition.FULLSCREEN
                )
            )
        )
    )

    /** CALL_END → Overlay 종료 → Window 미유지 → IDLE */
    private fun scenario8() = CompanionScenarioDef(
        id = CompanionScenarioId.SCENARIO_8_CALL_END_IDLE,
        name = "Scenario 8 Call End Idle",
        description = "CallEnd→overlay dismissed→window not kept→Idle",
        steps = listOf(
            CompanionScenarioStepDef(
                "SHOWCASE_PRE",
                CompanionScenarioExpectation(
                    state = OverlayState.SHOWCASE,
                    position = OverlayPosition.FULLSCREEN,
                    windowAttached = true
                )
            ),
            CompanionScenarioStepDef(
                "CALL_END",
                CompanionScenarioExpectation(
                    state = OverlayState.IDLE,
                    position = OverlayPosition.HIDDEN,
                    windowAttached = false,
                    failureReason = OverlayFailureReason.SUCCESS
                )
            ),
            CompanionScenarioStepDef(
                "OVERLAY_DISMISSED",
                CompanionScenarioExpectation(
                    state = OverlayState.IDLE,
                    position = OverlayPosition.HIDDEN,
                    windowAttached = false
                )
            ),
            CompanionScenarioStepDef(
                "IDLE",
                CompanionScenarioExpectation(
                    state = OverlayState.IDLE,
                    position = OverlayPosition.HIDDEN,
                    windowAttached = false
                )
            )
        )
    )
}
