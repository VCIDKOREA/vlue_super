package kr.vlue.calloverlay.dcp

import org.junit.Assert.assertEquals
import org.junit.Test

class DcpAbnormalWarningViewTest {
    @Test
    fun websiteHref_addsHttps() {
        assertEquals("https://www.police.go.kr", DcpAbnormalWarningView.websiteHref("www.police.go.kr"))
        assertEquals("https://www.police.go.kr", DcpAbnormalWarningView.websiteHref("https://www.police.go.kr"))
        assertEquals("", DcpAbnormalWarningView.websiteHref("  "))
    }

    @Test
    fun abnormal_confirm_goes_to_official_report() {
        assertEquals(
            "https://www.counterscam112.go.kr/report/reportGuide.do?type=itg",
            NationalAgencyWhitelist.ABNORMAL_REPORT_URL
        )
    }
}
