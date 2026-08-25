package kr.vlue.calloverlay

import org.junit.Assert.assertEquals
import org.junit.Test

class KrPhoneKindClassifierTest {
    @Test
    fun classifiesMobile() {
        assertEquals(KrPhoneKindClassifier.Kind.MOBILE, KrPhoneKindClassifier.classify("010-8014-4666"))
        assertEquals(KrPhoneKindClassifier.Kind.MOBILE, KrPhoneKindClassifier.classify("+821080144666"))
    }

    @Test
    fun classifiesRepresentative() {
        assertEquals(KrPhoneKindClassifier.Kind.REPRESENTATIVE, KrPhoneKindClassifier.classify("1588-1234"))
        assertEquals(KrPhoneKindClassifier.Kind.REPRESENTATIVE, KrPhoneKindClassifier.classify("080-123-4567"))
    }

    @Test
    fun classifiesLandline() {
        assertEquals(KrPhoneKindClassifier.Kind.LANDLINE, KrPhoneKindClassifier.classify("02-1234-5678"))
        assertEquals(KrPhoneKindClassifier.Kind.LANDLINE, KrPhoneKindClassifier.classify("031-123-4567"))
    }
}
