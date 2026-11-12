package kr.vlue.calloverlay.safetypatch

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class DeviceIntegrityProbeTest {
    @Test
    fun playStoreRelease_isClean() {
        val verdict = DeviceIntegrityProbe.classify(
            installer = DeviceIntegrityProbe.PLAY_STORE,
            fingerprint = "samsung/o1sxxx/o1s:14/UP1A/123:user/release-keys",
            model = "SM-S921N",
            manufacturer = "samsung",
            brand = "samsung",
            device = "o1s",
            hardware = "qcom",
            product = "o1sxxx",
            tags = "release-keys",
            suPresent = false
        )
        assertTrue(verdict.playStoreInstall)
        assertFalse(verdict.emulator)
        assertFalse(verdict.rooted)
        assertTrue(verdict.clean)
    }

    @Test
    fun sideload_isNotPlayStore() {
        val verdict = DeviceIntegrityProbe.classify(
            installer = "com.google.android.packageinstaller",
            fingerprint = "samsung/o1sxxx/o1s:14/UP1A/123:user/release-keys",
            model = "SM-S921N",
            manufacturer = "samsung",
            brand = "samsung",
            device = "o1s",
            hardware = "qcom",
            product = "o1sxxx",
            tags = "release-keys",
            suPresent = false
        )
        assertFalse(verdict.playStoreInstall)
        assertFalse(verdict.clean)
    }

    @Test
    fun emulatorAndRoot_areFlagged() {
        val emulator = DeviceIntegrityProbe.classify(
            installer = DeviceIntegrityProbe.PLAY_STORE,
            fingerprint = "generic/sdk_gphone64_arm64/emu64a:14/UE1A/123:user/release-keys",
            model = "sdk_gphone64_arm64",
            manufacturer = "Google",
            brand = "generic",
            device = "generic",
            hardware = "ranchu",
            product = "sdk_gphone64_arm64",
            tags = "release-keys",
            suPresent = false
        )
        assertTrue(emulator.emulator)

        val rooted = DeviceIntegrityProbe.classify(
            installer = DeviceIntegrityProbe.PLAY_STORE,
            fingerprint = "samsung/o1sxxx/o1s:14/UP1A/123:user/release-keys",
            model = "SM-S921N",
            manufacturer = "samsung",
            brand = "samsung",
            device = "o1s",
            hardware = "qcom",
            product = "o1sxxx",
            tags = "test-keys",
            suPresent = true
        )
        assertTrue(rooted.rooted)
        assertFalse(rooted.clean)
    }
}
