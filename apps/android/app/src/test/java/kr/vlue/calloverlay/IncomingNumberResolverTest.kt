package kr.vlue.calloverlay

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class IncomingNumberResolverTest {
    @Test
    fun canonical_hyphen_digits_e164_match() {
        assertTrue(
            IncomingNumberResolver.sameCanonicalNumber("010-8014-4666", "01080144666")
        )
        assertTrue(
            IncomingNumberResolver.sameCanonicalNumber("01080144666", "+821080144666")
        )
        assertEquals(
            "821080144666",
            IncomingNumberResolver.canonicalDigits("010-8014-4666")
        )
    }

    @Test
    fun isUnknown_covers_null_token() {
        assertTrue(IncomingNumberResolver.isUnknown(null))
        assertTrue(IncomingNumberResolver.isUnknown(""))
        assertTrue(IncomingNumberResolver.isUnknown("unknown"))
        assertTrue(IncomingNumberResolver.isUnknown("null"))
        assertFalse(IncomingNumberResolver.isUnknown("01080144666"))
    }
}
