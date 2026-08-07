package kr.vlue.calloverlay.diagnostics.recovery

import kr.vlue.calloverlay.companion.OverlayState

/**
 * Phase 5-C Recovery Hardening — 시나리오 정의만.
 * Architecture Freeze: State / Controller / Window 변경 금지.
 */
enum class CompanionRecoveryCaseId {
    CASE_1_FGS_KILL_RESTART,
    CASE_2_LOW_MEMORY_TRIM,
    CASE_3_PROCESS_DEATH,
    CASE_4_CONFIGURATION_CHANGE,
    CASE_5_PACKAGE_UPDATE,
    CASE_6_BOOT_COMPLETED,
    CASE_7_CALL_END_THEN_KILL
}

data class CompanionRecoveryExpectation(
    val state: OverlayState,
    val windowAttached: Boolean = false,
    val recovered: Boolean = true
)

data class CompanionRecoveryStepDef(
    val event: String,
    val expected: CompanionRecoveryExpectation
)

data class CompanionRecoveryCaseDef(
    val id: CompanionRecoveryCaseId,
    val name: String,
    val description: String,
    val steps: List<CompanionRecoveryStepDef>
)

object CompanionRecoveryCatalog {
    val all: List<CompanionRecoveryCaseDef> = listOf(
        case1(),
        case2(),
        case3(),
        case4(),
        case5(),
        case6(),
        case7()
    )

    fun byId(id: CompanionRecoveryCaseId): CompanionRecoveryCaseDef =
        all.first { it.id == id }

    private fun case1() = CompanionRecoveryCaseDef(
        id = CompanionRecoveryCaseId.CASE_1_FGS_KILL_RESTART,
        name = "Case 1 FGS Kill Restart",
        description = "Foreground Service Kill → Service Restart → State IDLE",
        steps = listOf(
            CompanionRecoveryStepDef(
                "SHOWCASE_PRE",
                CompanionRecoveryExpectation(OverlayState.SHOWCASE, windowAttached = true)
            ),
            CompanionRecoveryStepDef(
                "FGS_KILL",
                CompanionRecoveryExpectation(OverlayState.IDLE, windowAttached = false)
            ),
            CompanionRecoveryStepDef(
                "SERVICE_RESTART",
                CompanionRecoveryExpectation(OverlayState.IDLE, windowAttached = false)
            ),
            CompanionRecoveryStepDef(
                "STATE_CHECK",
                CompanionRecoveryExpectation(OverlayState.IDLE, windowAttached = false)
            )
        )
    )

    private fun case2() = CompanionRecoveryCaseDef(
        id = CompanionRecoveryCaseId.CASE_2_LOW_MEMORY_TRIM,
        name = "Case 2 Low Memory Trim",
        description = "Low Memory → onTrimMemory → Overlay state kept (no architecture change)",
        steps = listOf(
            CompanionRecoveryStepDef(
                "SHOWCASE_PRE",
                CompanionRecoveryExpectation(OverlayState.SHOWCASE, windowAttached = true)
            ),
            CompanionRecoveryStepDef(
                "ON_TRIM_MEMORY",
                CompanionRecoveryExpectation(OverlayState.SHOWCASE, windowAttached = true)
            ),
            CompanionRecoveryStepDef(
                "STATE_CHECK",
                CompanionRecoveryExpectation(OverlayState.SHOWCASE, windowAttached = true)
            )
        )
    )

    private fun case3() = CompanionRecoveryCaseDef(
        id = CompanionRecoveryCaseId.CASE_3_PROCESS_DEATH,
        name = "Case 3 Process Death",
        description = "Process Death → App Restart → OverlayState IDLE",
        steps = listOf(
            CompanionRecoveryStepDef(
                "SHOWCASE_PRE",
                CompanionRecoveryExpectation(OverlayState.SHOWCASE, windowAttached = true)
            ),
            CompanionRecoveryStepDef(
                "PROCESS_DEATH",
                CompanionRecoveryExpectation(OverlayState.IDLE, windowAttached = false)
            ),
            CompanionRecoveryStepDef(
                "APP_RESTART",
                CompanionRecoveryExpectation(OverlayState.IDLE, windowAttached = false)
            ),
            CompanionRecoveryStepDef(
                "STATE_INIT_CHECK",
                CompanionRecoveryExpectation(OverlayState.IDLE, windowAttached = false)
            )
        )
    )

    private fun case4() = CompanionRecoveryCaseDef(
        id = CompanionRecoveryCaseId.CASE_4_CONFIGURATION_CHANGE,
        name = "Case 4 Configuration Change",
        description = "Rotation → Window kept (single) · State SHOWCASE",
        steps = listOf(
            CompanionRecoveryStepDef(
                "SHOWCASE_PRE",
                CompanionRecoveryExpectation(OverlayState.SHOWCASE, windowAttached = true)
            ),
            CompanionRecoveryStepDef(
                "ROTATION",
                CompanionRecoveryExpectation(OverlayState.SHOWCASE, windowAttached = true)
            ),
            CompanionRecoveryStepDef(
                "WINDOW_KEEP_CHECK",
                CompanionRecoveryExpectation(OverlayState.SHOWCASE, windowAttached = true)
            )
        )
    )

    private fun case5() = CompanionRecoveryCaseDef(
        id = CompanionRecoveryCaseId.CASE_5_PACKAGE_UPDATE,
        name = "Case 5 Package Update",
        description = "Package Update → App Relaunch → State IDLE",
        steps = listOf(
            CompanionRecoveryStepDef(
                "SHOWCASE_PRE",
                CompanionRecoveryExpectation(OverlayState.SHOWCASE, windowAttached = true)
            ),
            CompanionRecoveryStepDef(
                "PACKAGE_UPDATE",
                CompanionRecoveryExpectation(OverlayState.IDLE, windowAttached = false)
            ),
            CompanionRecoveryStepDef(
                "APP_RELAUNCH",
                CompanionRecoveryExpectation(OverlayState.IDLE, windowAttached = false)
            ),
            CompanionRecoveryStepDef(
                "STATE_INIT_CHECK",
                CompanionRecoveryExpectation(OverlayState.IDLE, windowAttached = false)
            )
        )
    )

    private fun case6() = CompanionRecoveryCaseDef(
        id = CompanionRecoveryCaseId.CASE_6_BOOT_COMPLETED,
        name = "Case 6 Boot Completed",
        description = "Boot Completed → Receiver → Idle",
        steps = listOf(
            CompanionRecoveryStepDef(
                "BOOT_COMPLETED",
                CompanionRecoveryExpectation(OverlayState.IDLE, windowAttached = false)
            ),
            CompanionRecoveryStepDef(
                "RECEIVER",
                CompanionRecoveryExpectation(OverlayState.IDLE, windowAttached = false)
            ),
            CompanionRecoveryStepDef(
                "IDLE_CHECK",
                CompanionRecoveryExpectation(OverlayState.IDLE, windowAttached = false)
            )
        )
    )

    private fun case7() = CompanionRecoveryCaseDef(
        id = CompanionRecoveryCaseId.CASE_7_CALL_END_THEN_KILL,
        name = "Case 7 Call End Then Kill",
        description = "Call End → Process Kill → Leak none · IDLE",
        steps = listOf(
            CompanionRecoveryStepDef(
                "SHOWCASE_PRE",
                CompanionRecoveryExpectation(OverlayState.SHOWCASE, windowAttached = true)
            ),
            CompanionRecoveryStepDef(
                "CALL_END",
                CompanionRecoveryExpectation(OverlayState.IDLE, windowAttached = false)
            ),
            CompanionRecoveryStepDef(
                "PROCESS_KILL",
                CompanionRecoveryExpectation(OverlayState.IDLE, windowAttached = false)
            ),
            CompanionRecoveryStepDef(
                "LEAK_CHECK",
                CompanionRecoveryExpectation(OverlayState.IDLE, windowAttached = false)
            )
        )
    )
}
