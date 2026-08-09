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
    }

    @Test
    fun parseModel_unknownPhone_fallback() {
        val m = BigPushShowcaseBar.parseModel("unknown", verified = false, cardJson = null)
        assertEquals("VLUE Showcase", m.brandLabel)
        assertEquals("번호 확인 중…", m.primaryLine)
    }
}
