package kr.vlue.calloverlay.dcp

import kr.vlue.calloverlay.companion.OverlayState
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class ContactSafeCarePolicyTest {
    @Test
    fun ringing_doesNotShowWhileBigPush() {
        assertFalse(
            ContactSafeCarePolicy.shouldShow(
                profileKind = ContactSafeCarePayload.PROFILE_KIND,
                overlayState = OverlayState.BIG_PUSH,
                popupOnly = false
            )
        )
    }

    @Test
    fun answered_showsOnShowcase() {
        assertTrue(
            ContactSafeCarePolicy.shouldShow(
                profileKind = ContactSafeCarePayload.PROFILE_KIND,
                overlayState = OverlayState.SHOWCASE,
                popupOnly = false
            )
        )
    }

    @Test
    fun popupOnly_alwaysShows() {
        assertTrue(
            ContactSafeCarePolicy.shouldShow(
                profileKind = ContactSafeCarePayload.PROFILE_KIND,
                overlayState = OverlayState.BIG_PUSH,
                popupOnly = true
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
