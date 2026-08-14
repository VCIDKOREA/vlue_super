package kr.vlue.calloverlay

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class CardLookupRepositoryCacheTest {
    @Test
    fun remember_then_peek_same_digits() {
        val json = """{"matched":true,"is_verified":true,"displayName":"이종근","publicHandle":"ceo"}"""
        val result = CardLookupResult(
            matched = true,
            verified = true,
            displayName = "이종근",
            rawJson = json
        )
        CardLookupRepository.remember("010-8014-4666", result)
        val hit = CardLookupRepository.peekCached("+821080144666")
        assertEquals("이종근", hit?.displayName)
        assertEquals(json, hit?.rawJson)
    }

    @Test
    fun unmatched_is_not_cached() {
        CardLookupRepository.remember(
            "01000000000",
            CardLookupResult(matched = false, verified = false, displayName = "", rawJson = "{}")
        )
        assertNull(CardLookupRepository.peekCached("01000000000"))
    }
}
