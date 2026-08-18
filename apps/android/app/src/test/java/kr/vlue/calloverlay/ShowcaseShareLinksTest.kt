package kr.vlue.calloverlay

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class ShowcaseShareLinksTest {
    @Test
    fun publicUrl_usesMobileShowcasePath() {
        assertEquals(
            "https://m.vlue.kr/showcase/01080144666",
            ShowcaseShareLinks.publicShowcaseUrl("010-8014-4666")
        )
        assertEquals(
            "https://m.vlue.kr/showcase/01080144666",
            ShowcaseShareLinks.publicShowcaseUrl("+821080144666")
        )
    }

    @Test
    fun smsBody_includesCleanWebUrlNotApi() {
        val body = ShowcaseShareLinks.smsBody("01080144666")
        assertTrue(body.contains("https://m.vlue.kr/showcase/01080144666"))
        assertTrue(body.trim().endsWith("https://m.vlue.kr/showcase/01080144666"))
        assertTrue(!body.contains("api.vlue.kr"))
        assertTrue(!body.contains("www.vlue.kr"))
        assertTrue(!body.contains("/api/v1/showcase/view/"))
        assertTrue(body.contains("[VLUE]"))
        assertTrue(body.contains("m.vlue.kr"))
        assertTrue(!body.contains("링크를 눌러"))
    }
}
