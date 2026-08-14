package kr.vlue.calloverlay.dcp

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class NationalAgencyWhitelistTest {
    @Test
    fun match_short_numbers() {
        assertEquals("경찰청", NationalAgencyWhitelist.match("112")?.agencyName)
        assertEquals("소방청", NationalAgencyWhitelist.match("119")?.agencyName)
        assertEquals("금융감독원", NationalAgencyWhitelist.match("1332")?.agencyName)
    }

    @Test
    fun match_e164_and_hyphen() {
        assertNotNull(NationalAgencyWhitelist.match("+82112"))
        assertNotNull(NationalAgencyWhitelist.match("82-119"))
        assertEquals("112", NationalAgencyWhitelist.match("+82 112")?.shortNumber)
    }

    @Test
    fun non_agency_numbers_do_not_match() {
        assertNull(NationalAgencyWhitelist.match("01080144666"))
        assertNull(NationalAgencyWhitelist.match("+821080144666"))
        assertNull(NationalAgencyWhitelist.match(""))
        assertNull(NationalAgencyWhitelist.match(null))
        assertFalse(NationalAgencyWhitelist.isWhitelisted("1588-0000"))
    }

    @Test
    fun seed_covers_core_public_numbers() {
        val numbers = NationalAgencyWhitelist.AGENCIES.map { it.shortNumber }.toSet()
        assertTrue(numbers.containsAll(listOf("112", "119", "111", "122", "182", "1332", "110")))
        assertEquals(23, NationalAgencyWhitelist.AGENCIES.size)
    }

    @Test
    fun dcp_route_does_not_stick_to_member_calls() {
        assertEquals("", NationalAgencyWhitelist.routeForCall("01080144666", "abnormal"))
        assertEquals("", NationalAgencyWhitelist.routeForCall("+821080144666", "abnormal", "abnormal"))
        assertEquals("abnormal", NationalAgencyWhitelist.routeForCall("112", "abnormal"))
        assertEquals("normal", NationalAgencyWhitelist.routeForCall("112", "normal"))
        assertEquals("abnormal", NationalAgencyWhitelist.routeForCall("112", "", "abnormal"))
        assertEquals("", NationalAgencyWhitelist.routeForCall("unknown", "abnormal"))
    }
}
