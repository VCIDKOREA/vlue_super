package kr.vlue.calloverlay

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class ContactPhoneKeysTest {
    @Test
    fun localDigits_stripsCountryCode() {
        assertEquals("01080144666", ContactPhoneKeys.localDigits("+821080144666"))
        assertEquals("01080144666", ContactPhoneKeys.localDigits("821080144666"))
        assertEquals("01080144666", ContactPhoneKeys.localDigits("010-8014-4666"))
    }

    @Test
    fun matches_krVariants() {
        assertTrue(ContactPhoneKeys.matches("01080144666", "+82 10-8014-4666"))
        assertTrue(ContactPhoneKeys.matches("010-1234-5678", "821012345678"))
        assertFalse(ContactPhoneKeys.matches("01080144666", "01099998888"))
    }
}
