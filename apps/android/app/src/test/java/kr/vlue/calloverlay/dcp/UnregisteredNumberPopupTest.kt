package kr.vlue.calloverlay.dcp

import kr.vlue.calloverlay.companion.OverlayState
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class UnregisteredNumberPopupTest {
    @Test
    fun copy_matchesContract() {
        assertEquals("• 발신경로 정상 (VLUE 미등록 번호)", UnregisteredNumberPopup.LINE_PATH_NORMAL)
        assertEquals("• 유선상 금전요구는 주의바랍니다.", UnregisteredNumberPopup.LINE_MONEY_CAUTION)
        assertEquals("제보하기", UnregisteredNumberPopup.TIP_BUTTON)
        assertEquals("신고하기", UnregisteredNumberPopup.REPORT_BUTTON)
        assertEquals("피싱안심SOS", UnregisteredNumberPopup.SOS_BUTTON)
        assertEquals(2, UnregisteredNumberPopup.BODY.lines().size)
    }

    @Test
    fun json_isResolvedUnverified_notPendingNotMember() {
        val json = UnregisteredNumberPopup.json("+821012345678")
        assertTrue(VlueAuthMemberPopupPolicy.isUnverifiedResolved(json))
        assertFalse(VlueAuthMemberPopupPolicy.isAuthMemberOnly(json, verified = false))
        assertFalse(VlueAuthMemberPopupPolicy.hasBroadcastShowcaseContent(json))
    }

    @Test
    fun popup_showsAfterAnswerOrTap_notBefore() {
        assertFalse(
            ContactSafeCarePolicy.shouldShowUnregistered(OverlayState.BIG_PUSH, popupOnly = false, callAnswered = false)
        )
        assertTrue(
            ContactSafeCarePolicy.shouldShowUnregistered(OverlayState.BIG_PUSH, popupOnly = false, callAnswered = true)
        )
        assertTrue(
            ContactSafeCarePolicy.shouldShowUnregistered(OverlayState.SHOWCASE, popupOnly = false, callAnswered = true)
        )
    }

    @Test
    fun miniTap_restore_showsSamePopup_butPlainMiniDoesNot() {
        assertTrue(
            ContactSafeCarePolicy.shouldShowUnregistered(OverlayState.MINI_CASE, popupOnly = true, callAnswered = true)
        )
        assertFalse(
            ContactSafeCarePolicy.shouldShowUnregistered(OverlayState.MINI_CASE, popupOnly = false, callAnswered = true)
        )
    }
}
