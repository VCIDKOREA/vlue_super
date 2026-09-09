package kr.vlue.calloverlay.dcp

import kr.vlue.calloverlay.companion.OverlayState

/**
 * 주소록 VLUE 비회원 안심케어 팝업.
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
        /*
         * popupOnly 단독으로 링잉(BIG_PUSH)·거는 중에 띄우지 않음.
         * 수화 확정(callAnswered) 또는 이미 SHOWCASE/IDLE 일 때만.
         */
        if (popupOnly) {
            if (callAnswered) return true
            return overlayState == OverlayState.SHOWCASE ||
                overlayState == OverlayState.IDLE
        }
        /* 수화 확정 후에는 BIG_PUSH 잔류 상태에서도 정상팝업 허용 (카드 지연·정책 레이스) */
        if (callAnswered) {
            return overlayState == OverlayState.SHOWCASE ||
                overlayState == OverlayState.IDLE ||
                overlayState == OverlayState.BIG_PUSH
        }
        return overlayState == OverlayState.SHOWCASE ||
            overlayState == OverlayState.IDLE
    }
}
