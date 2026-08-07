package kr.vlue.calloverlay.diagnostics.exception

import kr.vlue.calloverlay.companion.MiniCaseVisibility
import kr.vlue.calloverlay.companion.OverlayPosition
import kr.vlue.calloverlay.companion.OverlayState
import kr.vlue.calloverlay.companion.ScreenState
import kr.vlue.calloverlay.diagnostics.OverlayFailureReason
import kr.vlue.calloverlay.diagnostics.scenario.CompanionScenarioExpectation
import kr.vlue.calloverlay.diagnostics.scenario.CompanionScenarioStepDef

/**
 * Phase 4-D Exception / Stress 케이스.
 * Architecture · Controller · OverlayState · Window 변경 없음 — 검증·관찰만.
 */
enum class CompanionExceptionCaseId {
    CASE_1_END_BEFORE_BIG_PUSH,
    CASE_2_PROCESS_PAUSE_RESUME,
    CASE_3_PERMISSION_REVOKED,
    CASE_4_ROTATION_LAYOUT,
    CASE_5_EDGE_HIDE_CALL_END,
    CASE_6_APP_KILL_RETURN,
    CASE_7_SECOND_CALL_CLEANUP,
    CASE_8_DEBOUNCE_SINGLE_BIG_PUSH
}

data class CompanionExceptionCaseDef(
    val id: CompanionExceptionCaseId,
    val name: String,
    val description: String,
    val steps: List<CompanionScenarioStepDef>
)

object CompanionExceptionCatalog {
    val all: List<CompanionExceptionCaseDef> = listOf(
        case1(),
        case2(),
        case3(),
        case4(),
        case5(),
        case6(),
        case7(),
        case8()
    )

    fun byId(id: CompanionExceptionCaseId): CompanionExceptionCaseDef =
        all.first { it.id == id }

    /** Incoming → Call End → BigPush 생성 직전(생성 안 함) → IDLE */
    private fun case1() = CompanionExceptionCaseDef(
        id = CompanionExceptionCaseId.CASE_1_END_BEFORE_BIG_PUSH,
        name = "Case 1 End Before BigPush",
        description = "Incoming→CallEnd before BigPush create→IDLE no attach",
        steps = listOf(
            CompanionScenarioStepDef(
                "INCOMING",
                CompanionScenarioExpectation(
                    state = OverlayState.IDLE,
                    windowAttached = false
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
                "BIG_PUSH_ATTEMPT_AFTER_END",
                CompanionScenarioExpectation(
                    state = OverlayState.IDLE,
                    position = OverlayPosition.HIDDEN,
                    windowAttached = false,
                    failureReason = OverlayFailureReason.CALL_ENDED
                )
            )
        )
    )

    /** Incoming → Answer → process pause → resume → SHOWCASE 유지 */
    private fun case2() = CompanionExceptionCaseDef(
        id = CompanionExceptionCaseId.CASE_2_PROCESS_PAUSE_RESUME,
        name = "Case 2 Process Pause Resume",
        description = "Incoming→Answer→Pause→Resume→Showcase kept",
        steps = listOf(
            CompanionScenarioStepDef(
                "INCOMING",
                CompanionScenarioExpectation(state = OverlayState.IDLE)
            ),
            CompanionScenarioStepDef(
                "ANSWER",
                CompanionScenarioExpectation(
                    state = OverlayState.SHOWCASE,
                    position = OverlayPosition.FULLSCREEN,
                    windowAttached = true
                )
            ),
            CompanionScenarioStepDef(
                "PROCESS_PAUSE",
                CompanionScenarioExpectation(
                    state = OverlayState.SHOWCASE,
                    position = OverlayPosition.FULLSCREEN,
                    windowAttached = true
                )
            ),
            CompanionScenarioStepDef(
                "PROCESS_RESUME",
                CompanionScenarioExpectation(
                    state = OverlayState.SHOWCASE,
                    position = OverlayPosition.FULLSCREEN,
                    windowAttached = true
                )
            )
        )
    )

    /** Incoming → 권한 제거 → Overlay 실패 */
    private fun case3() = CompanionExceptionCaseDef(
        id = CompanionExceptionCaseId.CASE_3_PERMISSION_REVOKED,
        name = "Case 3 Permission Revoked",
        description = "Incoming→permission revoked→Overlay fail PERMISSION_DENIED",
        steps = listOf(
            CompanionScenarioStepDef(
                "INCOMING",
                CompanionScenarioExpectation(state = OverlayState.IDLE)
            ),
            CompanionScenarioStepDef(
                "PERMISSION_REVOKED",
                CompanionScenarioExpectation(
                    state = OverlayState.IDLE,
                    windowAttached = false,
                    failureReason = OverlayFailureReason.PERMISSION_DENIED
                )
            ),
            CompanionScenarioStepDef(
                "OVERLAY_FAIL",
                CompanionScenarioExpectation(
                    state = OverlayState.IDLE,
                    position = OverlayPosition.HIDDEN,
                    windowAttached = false,
                    failureReason = OverlayFailureReason.PERMISSION_DENIED
                )
            )
        )
    )

    /** SHOWCASE → 화면 회전 → Layout 재적용 (state 유지) */
    private fun case4() = CompanionExceptionCaseDef(
        id = CompanionExceptionCaseId.CASE_4_ROTATION_LAYOUT,
        name = "Case 4 Rotation Layout",
        description = "Showcase→rotation→layout reapply state kept",
        steps = listOf(
            CompanionScenarioStepDef(
                "SHOWCASE",
                CompanionScenarioExpectation(
                    state = OverlayState.SHOWCASE,
                    position = OverlayPosition.FULLSCREEN,
                    windowAttached = true
                )
            ),
            CompanionScenarioStepDef(
                "ROTATION",
                CompanionScenarioExpectation(
                    state = OverlayState.SHOWCASE,
                    position = OverlayPosition.FULLSCREEN,
                    windowAttached = true
                )
            ),
            CompanionScenarioStepDef(
                "LAYOUT_REAPPLY",
                CompanionScenarioExpectation(
                    state = OverlayState.SHOWCASE,
                    position = OverlayPosition.FULLSCREEN,
                    windowAttached = true
                )
            )
        )
    )

    /** MINI → EDGE_HIDE → Call End → IDLE */
    private fun case5() = CompanionExceptionCaseDef(
        id = CompanionExceptionCaseId.CASE_5_EDGE_HIDE_CALL_END,
        name = "Case 5 Edge Hide Call End",
        description = "Mini→EdgeHide→CallEnd→Idle",
        steps = listOf(
            CompanionScenarioStepDef(
                "MINI",
                CompanionScenarioExpectation(
                    state = OverlayState.MINI_CASE,
                    position = OverlayPosition.MINI_CASE,
                    miniVisibility = MiniCaseVisibility.VISIBLE,
                    windowAttached = true
                )
            ),
            CompanionScenarioStepDef(
                "EDGE_HIDE",
                CompanionScenarioExpectation(
                    state = OverlayState.MINI_CASE,
                    miniVisibility = MiniCaseVisibility.EDGE_HIDDEN,
                    windowAttached = true
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

    /** SHOWCASE → HOME → 앱 Kill → 복귀 → IDLE, no leak */
    private fun case6() = CompanionExceptionCaseDef(
        id = CompanionExceptionCaseId.CASE_6_APP_KILL_RETURN,
        name = "Case 6 App Kill Return",
        description = "Showcase→Home→AppKill→Return→Idle cleaned",
        steps = listOf(
            CompanionScenarioStepDef(
                "SHOWCASE",
                CompanionScenarioExpectation(
                    state = OverlayState.SHOWCASE,
                    windowAttached = true
                )
            ),
            CompanionScenarioStepDef(
                "HOME",
                CompanionScenarioExpectation(
                    state = OverlayState.MINI_CASE,
                    windowAttached = true
                )
            ),
            CompanionScenarioStepDef(
                "APP_KILL",
                CompanionScenarioExpectation(
                    state = OverlayState.IDLE,
                    position = OverlayPosition.HIDDEN,
                    windowAttached = false
                )
            ),
            CompanionScenarioStepDef(
                "APP_RETURN",
                CompanionScenarioExpectation(
                    state = OverlayState.IDLE,
                    position = OverlayPosition.HIDDEN,
                    windowAttached = false
                )
            )
        )
    )

    /** Incoming → 다른 전화 → State 정리 → IDLE then single next */
    private fun case7() = CompanionExceptionCaseDef(
        id = CompanionExceptionCaseId.CASE_7_SECOND_CALL_CLEANUP,
        name = "Case 7 Second Call Cleanup",
        description = "Incoming→BigPush→second call→cleanup Idle",
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
                    windowAttached = true
                )
            ),
            CompanionScenarioStepDef(
                "SECOND_INCOMING",
                CompanionScenarioExpectation(
                    state = OverlayState.BIG_PUSH,
                    windowAttached = true
                )
            ),
            CompanionScenarioStepDef(
                "STATE_CLEANUP",
                CompanionScenarioExpectation(
                    state = OverlayState.IDLE,
                    position = OverlayPosition.HIDDEN,
                    windowAttached = false
                )
            )
        )
    )

    /** 연속 Incoming → Debounce → 단일 BigPush (attach 1회) */
    private fun case8() = CompanionExceptionCaseDef(
        id = CompanionExceptionCaseId.CASE_8_DEBOUNCE_SINGLE_BIG_PUSH,
        name = "Case 8 Debounce Single BigPush",
        description = "Burst Incoming→debounce→single BigPush attach",
        steps = listOf(
            CompanionScenarioStepDef(
                "INCOMING_BURST",
                CompanionScenarioExpectation(state = OverlayState.IDLE)
            ),
            CompanionScenarioStepDef(
                "DEBOUNCE",
                CompanionScenarioExpectation(
                    state = OverlayState.IDLE,
                    windowAttached = false
                )
            ),
            CompanionScenarioStepDef(
                "SINGLE_BIG_PUSH",
                CompanionScenarioExpectation(
                    state = OverlayState.BIG_PUSH,
                    position = OverlayPosition.BOTTOM,
                    windowAttached = true,
                    screenState = ScreenState.SCREEN_ON
                )
            )
        )
    )
}
