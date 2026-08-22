package kr.vlue.calloverlay

import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test

class OverlayCardOrgFillTest {
    @Test
    fun ceoHandle_getsVcidKoreaWhenCompanyMissing() {
        val raw = """{"matched":true,"displayName":"이종근","publicHandle":"ceo","companyName":""}"""
        val filled = OverlayCardOrgFill.applyLocalDefaults(raw)
        val json = JSONObject(filled)
        assertEquals("VCID KOREA", json.optString("companyName"))
        assertEquals("VCID KOREA", json.optString("organization"))
        assertTrue(OverlayCardOrgFill.hasOrganization(filled))
    }

    @Test
    fun ceoPhone_getsVcidKoreaWhenHandleMissing() {
        val raw = """{"matched":true,"displayName":"이종근","phoneE164":"+821080144666"}"""
        val filled = OverlayCardOrgFill.applyLocalDefaults(raw)
        assertEquals("VCID KOREA", JSONObject(filled).optString("companyName"))
    }

    @Test
    fun existingOrg_isNotOverwritten() {
        val raw = """{"matched":true,"publicHandle":"ceo","companyName":"ACME"}"""
        val filled = OverlayCardOrgFill.applyLocalDefaults(raw)
        assertEquals("ACME", JSONObject(filled).optString("companyName"))
    }

    @Test
    fun verifiedLookup_defaultsPaidTier() {
        val raw = """{"matched":true,"is_verified":true,"displayName":"이종근","publicHandle":"ceo"}"""
        val filled = OverlayCardOrgFill.applyLocalDefaults(raw)
        assertEquals("paid", JSONObject(filled).optString("membershipTier"))
        assertEquals("VCID KOREA", JSONObject(filled).optString("companyName"))
    }

    @Test
    fun otherMember_withoutOrg_staysEmpty() {
        val raw = """{"matched":true,"displayName":"홍길동","publicHandle":"hong","companyName":""}"""
        assertFalse(OverlayCardOrgFill.hasOrganization(OverlayCardOrgFill.applyLocalDefaults(raw)))
    }

    @Test
    fun seedIfPlatformCeoPhone_fillsVcidKorea() {
        val seeded = OverlayCardOrgFill.seedIfPlatformCeoPhone("010-8014-4666")
        assertNotNull(seeded)
        assertTrue(OverlayCardOrgFill.hasOrganization(seeded!!))
        assertTrue(seeded.contains("VCID KOREA"))
        assertTrue(seeded.contains("이종근"))
    }
}
