package kr.vlue.calloverlay.dcp

import kr.vlue.calloverlay.companion.OverlayState

/**
 * 주소록 VLUÉ 비회원 안심케어 팝업.
 * 벨 울림(BIG_PUSH · 미수화) 중에는 띄우지 않는다 — 수화 확정 후 정상 팝업.
 * (링잉 중 hide+popup 은 지문/키가드와 겹쳐 빅푸시만 사라지고 팝업도 실패하는 UX)
 */
object ContactSafeCarePolicy {
    /**
     * 미등록 번호 안심팝업 — 안심케어와 동일한 표시 게이트(수화/탭 후, BIG_PUSH·SHOWCASE·IDLE).
     * 별도 함수로 둔 이유: profileKind 문자열 해킹 없이 의도를 드러내고 테스트하기 위함.
     */
    fun shouldShowUnregistered(
        overlayState: OverlayState,
        popupOnly: Boolean,
        callAnswered: Boolean
    ): Boolean {
        if (!callAnswered) return false
        /* 미니버블 탭 → 같은 팝업 복원 (popupOnly 는 명시적 복원/표시 요청일 때만 true) */
        if (popupOnly && overlayState == OverlayState.MINI_CASE) return true
        return shouldShow(
            profileKind = ContactSafeCarePayload.PROFILE_KIND,
            overlayState = overlayState,
            popupOnly = popupOnly,
            callAnswered = callAnswered
        )
    }

    fun shouldShow(
        profileKind: String,
        overlayState: OverlayState,
        popupOnly: Boolean,
        callAnswered: Boolean = false
    ): Boolean {
        if (profileKind != ContactSafeCarePayload.PROFILE_KIND &&
            profileKind != PublicDirectorySafePayload.PROFILE_KIND
        ) {
            return false
        }
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
