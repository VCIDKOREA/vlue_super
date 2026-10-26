package kr.vlue.calloverlay

import android.content.Context
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class LetteringAuthGateTest {
    private lateinit var context: Context

    @Before
    fun setUp() {
        context = RuntimeEnvironment.getApplication()
        context
            .getSharedPreferences("vlue_lettering_prefs", Context.MODE_PRIVATE)
            .edit()
            .clear()
            .commit()
    }

    @Test
    fun freshInstall_blocksOverlay() {
        assertFalse(LetteringAuthGate.canRunCallOverlay(context))
        assertFalse(LetteringPrefs.isLetteringEnabled(context))
    }

    @Test
    fun tokensOnly_withoutOnboarding_blocksOverlay() {
        LetteringPrefs.setSession(context, "user-1", "token-abc")
        LetteringPrefs.setAuthGate(
            context,
            identityVerified = false,
            onboardingComplete = false,
            accountStatus = "pending_identity"
        )
        assertFalse(LetteringAuthGate.canRunCallOverlay(context))
    }

    @Test
    fun passAndOnboardingComplete_allowsOverlay() {
        LetteringPrefs.setSession(context, "user-1", "token-abc")
        LetteringPrefs.setAuthGate(
            context,
            identityVerified = true,
            onboardingComplete = true,
            accountStatus = "active"
        )
        assertTrue(LetteringAuthGate.canRunCallOverlay(context))
    }

    @Test
    fun clearSession_disarmsOverlay() {
        LetteringPrefs.setSession(context, "user-1", "token-abc")
        LetteringPrefs.setAuthGate(
            context,
            identityVerified = true,
            onboardingComplete = true,
            accountStatus = "active"
        )
        assertTrue(LetteringAuthGate.canRunCallOverlay(context))
        LetteringPrefs.clearAuthSession(context)
        assertFalse(LetteringAuthGate.canRunCallOverlay(context))
    }
}
