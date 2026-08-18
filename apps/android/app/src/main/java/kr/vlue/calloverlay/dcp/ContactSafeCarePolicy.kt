package kr.vlue.calloverlay.dcp

import kr.vlue.calloverlay.companion.OverlayState

/**
 * 주소록 VLUE 비회원 안심케어 팝업.
 * 미인증 쇼케이스를 대체하므로 벨이 울릴 때부터 띄운다.
 */
object ContactSafeCarePolicy {
    fun shouldShow(
        profileKind: String,
        overlayState: OverlayState,
        popupOnly: Boolean
    ): Boolean {
        if (profileKind != ContactSafeCarePayload.PROFILE_KIND) return false
        if (popupOnly) return true
        return overlayState == OverlayState.BIG_PUSH ||
            overlayState == OverlayState.SHOWCASE ||
            overlayState == OverlayState.IDLE
    }
}
