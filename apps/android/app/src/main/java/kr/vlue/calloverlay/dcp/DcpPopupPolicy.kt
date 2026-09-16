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
        @Suppress("UNUSED_PARAMETER")
        pathVerifyAbnormal: Boolean = false,
        callAnswered: Boolean = false
    ): Boolean {
        if (route != "normal" && route != "abnormal") return false
        if (popupOnlyTest) return true
        /*
         * 정상/비정상 모두 수화 전에는 BigPush만.
         * pathVerify 비정상도 링잉 중 별도 팝업을 붙이지 않는다.
         */
        if (!callAnswered) return false
        /* 수화 직후 Controller가 아직 BIG_PUSH여도 팝업으로 원자적 전환 허용 */
        return overlayState == OverlayState.BIG_PUSH ||
            overlayState == OverlayState.SHOWCASE
    }
}
