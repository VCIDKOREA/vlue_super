package kr.vlue.calloverlay.dcp

enum class CallPathStatus {
    NORMAL,
    ABNORMAL
}

data class CallPathVerdict(
    val status: CallPathStatus,
    val reasons: List<String> = emptyList(),
    val fromMock: Boolean = false
) {
    val isAbnormal: Boolean get() = status == CallPathStatus.ABNORMAL

    val routeQuery: String
        get() = if (isAbnormal) "abnormal" else "normal"

    companion object {
        fun normal(fromMock: Boolean = false) =
            CallPathVerdict(CallPathStatus.NORMAL, emptyList(), fromMock)

        fun abnormal(reasons: List<String>, fromMock: Boolean = false) =
            CallPathVerdict(CallPathStatus.ABNORMAL, reasons, fromMock)
    }
}

/** 통화 이벤트에서 수집한 방어적 경로 신호 (단위 테스트용 순수 입력) */
data class CallPathSignals(
    val otherOverlayAppsInUse: List<String> = emptyList(),
    val suspiciousAccessibilityPackages: List<String> = emptyList(),
    val inCallUiOccludedByOtherApp: Boolean = false,
    val occludingPackage: String? = null
)
