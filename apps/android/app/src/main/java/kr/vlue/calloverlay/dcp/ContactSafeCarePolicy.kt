package kr.vlue.calloverlay.dcp

import kr.vlue.calloverlay.companion.OverlayState

/**
 * 주소록 VLUE 비회원 안심케어 팝업.
 * 벨 울림(BIG_PUSH) 중에는 띄우지 않는다 — 수화(SHOWCASE/수화 확정) 후 정상 팝업.
 * (링잉 중 hide+popup 은 지문/키가드와 겹쳐 빅푸시만 사라지고 팝업도 실패하는 UX)
 */
object ContactSafeCarePolicy {
    fun shouldShow(
        profileKind: String,
        overlayState: OverlayState,
        popupOnly: Boolean
    ): Boolean {
        if (profileKind != ContactSafeCarePayload.PROFILE_KIND) return false
        if (popupOnly) return true
        return overlayState == OverlayState.SHOWCASE ||
            overlayState == OverlayState.IDLE
    }
}
