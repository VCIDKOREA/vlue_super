package kr.vlue.calloverlay

import kr.vlue.calloverlay.CallPrefetchCache.Entry
import kr.vlue.calloverlay.CallPrefetchCache.Tier
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

class CallPrefetchCacheTest {
    @Before
    fun reset() {
        CallPrefetchCache.resetForTest()
    }

    private fun member(name: String = "VLUE상사", json: String? = null) =
        CardLookupResult(
            matched = true,
            verified = true,
            displayName = name,
            rawJson = json ?: """{"matched":true,"is_verified":true,"displayName":"$name","organization":"$name"}"""
        )

    private fun publicDb(name: String = "동네우체국") =
        CardLookupResult(
            matched = true,
            verified = false,
            displayName = name,
            rawJson = """{"matched":true,"source":"public_directory_local","profileKind":"public_directory_safe","displayName":"$name"}"""
        )

    private fun entry(tier: Tier, r: CardLookupResult?, at: Long = 1L, provisional: Boolean = false) =
        Entry(tier, r, CallPrefetchCache.labelOf(r), at, provisional)

    @Test
    fun classify_tiers() {
        assertEquals(Tier.VLUE_MEMBER, CallPrefetchCache.classify(member()))
        assertEquals(Tier.PUBLIC_DB, CallPrefetchCache.classify(publicDb()))
        assertEquals(
            Tier.UNREGISTERED,
            CallPrefetchCache.classify(
                CardLookupResult(matched = false, verified = false, displayName = "", rawJson = "{}")
            )
        )
        assertEquals(Tier.UNREGISTERED, CallPrefetchCache.classify(null))
    }

    @Test
    fun firstArrival_binds_lowerTier_thenUpgrades() {
        val key = "1080144666"
        assertTrue(CallPrefetchCache.offer(key, entry(Tier.PUBLIC_DB, publicDb())))
        assertTrue(CallPrefetchCache.offer(key, entry(Tier.VLUE_MEMBER, member(), at = 2L)))
    }

    @Test
    fun lowerTier_neverOverwrites_higherTier() {
        val key = "1080144666"
        assertTrue(CallPrefetchCache.offer(key, entry(Tier.VLUE_MEMBER, member())))
        assertFalse(CallPrefetchCache.offer(key, entry(Tier.PUBLIC_DB, publicDb(), at = 5L)))
        assertFalse(CallPrefetchCache.offer(key, entry(Tier.UNREGISTERED, null, at = 6L, provisional = true)))
    }

    @Test
    fun timeoutUnregistered_isUpgradedByLateMember() {
        val key = "1012345678"
        assertTrue(CallPrefetchCache.offer(key, entry(Tier.UNREGISTERED, null, provisional = true)))
        assertTrue(CallPrefetchCache.offer(key, entry(Tier.VLUE_MEMBER, member(), at = 9L)))
    }

    @Test
    fun duplicateUnregistered_isNotRebound() {
        val key = "1012345678"
        assertTrue(CallPrefetchCache.offer(key, entry(Tier.UNREGISTERED, null)))
        assertFalse(CallPrefetchCache.offer(key, entry(Tier.UNREGISTERED, null, at = 3L, provisional = true)))
    }

    @Test
    fun sameTier_freshContent_replacesStale() {
        val key = "1080144666"
        assertTrue(CallPrefetchCache.offer(key, entry(Tier.VLUE_MEMBER, member("옛상호"), at = 1L)))
        assertTrue(CallPrefetchCache.offer(key, entry(Tier.VLUE_MEMBER, member("새상호"), at = 2L)))
    }

    @Test
    fun peek_unknownNumber_isNull() {
        assertNull(CallPrefetchCache.peek("010-1111-2222"))
    }

    @Test
    fun label_prefersOrganization_thenDisplayName() {
        assertEquals("VLUE상사", CallPrefetchCache.labelOf(member("VLUE상사")))
        assertEquals("동네우체국", CallPrefetchCache.labelOf(publicDb()))
        assertEquals("", CallPrefetchCache.labelOf(null))
    }
}
