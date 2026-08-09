package kr.vlue.calloverlay.companion

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class BigPushShowcaseBarTest {
    @Test
    fun parseModel_usesOrgAndName() {
        val json =
            """{"matched":true,"is_verified":true,"displayName":"이종근","companyName":"VCID KOREA","jobTitle":"대표","publicHandle":"ceo","image_url":"https://example.com/a.jpg","phoneE164":"+821080144666"}"""
        val m = BigPushShowcaseBar.parseModel("+821080144666", verified = true, cardJson = json)
        assertEquals("ceo Showcase", m.brandLabel)
        assertEquals("VCID KOREA · 이종근", m.primaryLine)
        assertTrue(m.secondaryLine.startsWith("VCID KOREA /"))
        assertTrue(m.verified)
        assertEquals("https://example.com/a.jpg", m.avatarUrl)
        assertEquals(BigPushShowcaseBar.AvatarKind.PHOTO, m.avatarKind)
    }

    @Test
    fun parseModel_ceoWithoutPhoto_usesBrandKind() {
        val json =
            """{"matched":true,"is_verified":true,"displayName":"이종근","companyName":"VCID KOREA","publicHandle":"ceo","phoneE164":"+821080144666"}"""
        val m = BigPushShowcaseBar.parseModel("+821080144666", verified = true, cardJson = json)
        assertEquals(BigPushShowcaseBar.AvatarKind.CEO_BRAND, m.avatarKind)
    }

    @Test
    fun parseModel_otherWithoutPhoto_usesSilhouette() {
        val json =
            """{"matched":true,"is_verified":true,"displayName":"전중희","companyName":"TEST","publicHandle":"jeonjunghee","phoneE164":"+821063358746"}"""
        val m = BigPushShowcaseBar.parseModel("+821063358746", verified = true, cardJson = json)
        assertEquals(BigPushShowcaseBar.AvatarKind.SILHOUETTE, m.avatarKind)
    }
}
