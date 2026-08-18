package kr.vlue.calloverlay.dcp

import kr.vlue.calloverlay.companion.OverlayState
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class ContactSafeCarePolicyTest {
    @Test
    fun ringing_showsInsteadOfUnverified() {
        assertTrue(
            ContactSafeCarePolicy.shouldShow(
                profileKind = ContactSafeCarePayload.PROFILE_KIND,
                overlayState = OverlayState.BIG_PUSH,
                popupOnly = false
            )
        )
    }

    @Test
    fun otherKinds_neverShow() {
        assertFalse(
            ContactSafeCarePolicy.shouldShow(
                profileKind = "dcp",
                overlayState = OverlayState.BIG_PUSH,
                popupOnly = true
            )
        )
        assertFalse(
            ContactSafeCarePolicy.shouldShow(
                profileKind = "",
                overlayState = OverlayState.SHOWCASE,
                popupOnly = false
            )
        )
    }
}
