package kr.vlue.calloverlay.dcp

import kr.vlue.calloverlay.companion.OverlayState

/**
 * 주소록 VLUÉ 비회원 안심케어 팝업.
 * 벨 울림(BIG_PUSH · 미수화) 중에는 띄우지 않는다 — 수화 확정 후 정상 팝업.
 * (링잉 중 hide+popup 은 지문/키가드와 겹쳐 빅푸시만 사라지고 팝업도 실패하는 UX)
 */
object ContactSafeCarePolicy {
    fun shouldShow(
        profileKind: String,
        overlayState: OverlayState,
        popupOnly: Boolean,
        callAnswered: Boolean = false
    ): Boolean {
        if (profileKind != ContactSafeCarePayload.PROFILE_KIND) return false
        /* 미수화 — 정상 팝업 금지 (BigPush만) */
        if (!callAnswered) return false
        if (popupOnly) {
            return overlayState == OverlayState.SHOWCASE ||
                overlayState == OverlayState.IDLE ||
                overlayState == OverlayState.BIG_PUSH
        }
        return overlayState == OverlayState.SHOWCASE ||
            overlayState == OverlayState.IDLE ||
            overlayState == OverlayState.BIG_PUSH
    }
}
