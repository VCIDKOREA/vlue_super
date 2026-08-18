package kr.vlue.calloverlay.dcp

import kr.vlue.calloverlay.companion.OverlayState

/**
 * 국가기관 DCP 정상은 수화 후 팝업.
 * 경로 검증 비정상(원격앱 실행 등)은 벨이 울릴 때부터 사유와 함께 띄운다.
 * 설정 테스트는 통화 없이 팝업만.
 */
object DcpPopupPolicy {
    fun shouldShow(
        route: String,
        overlayState: OverlayState,
        popupOnlyTest: Boolean,
        pathVerifyAbnormal: Boolean = false
    ): Boolean {
        if (route != "normal" && route != "abnormal") return false
        if (popupOnlyTest) return true
        if (pathVerifyAbnormal && route == "abnormal") {
            return overlayState == OverlayState.BIG_PUSH ||
                overlayState == OverlayState.SHOWCASE ||
                overlayState == OverlayState.IDLE
        }
        /* 국가기관 DCP 정상은 수화 후. 링잉 빅푸시·다른앱 미니는 화면을 잠그지 않음 */
        return overlayState == OverlayState.SHOWCASE
    }
}
