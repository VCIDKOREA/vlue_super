package kr.vlue.calloverlay.update

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import org.json.JSONObject

class AppVersionPolicyTest {

    private fun remote(
        latest: Int = 90,
        name: String = "1.0.40",
        min: Int = 80,
        forced: Boolean = false
    ) =
        AppVersionInfo(
            latestVersionCode = latest,
            latestVersionName = name,
            minRequiredVersionCode = min,
            isForced = forced,
            message = "선택 업데이트",
            forceMessage = "강제 업데이트"
        )

    @Test
    fun upToDate_noPrompt() {
        val d = AppVersionPolicy.decide(90, "1.0.40", remote(90))
        assertEquals(AppUpdateKind.NONE, d.kind)
    }

    @Test
    fun newerThanLatest_noPrompt() {
        val d = AppVersionPolicy.decide(91, "1.0.41", remote(90))
        assertEquals(AppUpdateKind.NONE, d.kind)
    }

    @Test
    fun belowLatest_aboveMin_optional() {
        val d = AppVersionPolicy.decide(85, "1.0.35", remote(90, min = 80, forced = false))
        assertEquals(AppUpdateKind.OPTIONAL, d.kind)
        assertEquals("선택 업데이트", d.message)
        assertEquals("1.0.35", d.currentVersionName)
        assertEquals("1.0.40", d.latestVersionName)
    }

    @Test
    fun belowMin_forced() {
        val d = AppVersionPolicy.decide(70, "1.0.20", remote(90, min = 80, forced = false))
        assertEquals(AppUpdateKind.FORCED, d.kind)
        assertEquals("강제 업데이트", d.message)
    }

    @Test
    fun isForcedFlag_forcesEvenAboveMin() {
        val d = AppVersionPolicy.decide(85, "1.0.35", remote(90, min = 80, forced = true))
        assertEquals(AppUpdateKind.FORCED, d.kind)
    }

    @Test
    fun invalidLatest_noPrompt() {
        val d = AppVersionPolicy.decide(10, "1.0.0", remote(latest = 0))
        assertEquals(AppUpdateKind.NONE, d.kind)
    }

    @Test
    fun parseJson_snakeAndCamel() {
        val json =
            JSONObject(
                """
                {
                  "latest_version_code": 99,
                  "latest_version": "2.0.0",
                  "min_required_version": 50,
                  "is_forced": true,
                  "message": "m",
                  "force_message": "f",
                  "store": { "play": "https://play.google.com/store/apps/details?id=kr.vlue.app" }
                }
                """.trimIndent()
            )
        val info = AppVersionInfo.fromJson(json)
        assertEquals(99, info.latestVersionCode)
        assertEquals("2.0.0", info.latestVersionName)
        assertEquals(50, info.minRequiredVersionCode)
        assertTrue(info.isForced)
        assertEquals("f", info.forceMessage)
        assertTrue(info.playStoreUrl!!.contains("play.google.com"))
    }

    @Test
    fun parseJson_camelCase() {
        val json =
            JSONObject(
                """
                {
                  "latestVersionCode": 88,
                  "latestVersionName": "1.0.36",
                  "minRequiredVersionCode": 70,
                  "isForced": false
                }
                """.trimIndent()
            )
        val info = AppVersionInfo.fromJson(json)
        assertEquals(88, info.latestVersionCode)
        assertEquals(70, info.minRequiredVersionCode)
        val d = AppVersionPolicy.decide(75, "1.0.30", info)
        assertEquals(AppUpdateKind.OPTIONAL, d.kind)
    }
}
