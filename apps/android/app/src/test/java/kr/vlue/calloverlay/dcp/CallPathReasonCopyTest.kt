package kr.vlue.calloverlay.dcp

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class CallPathReasonCopyTest {
    @Test
    fun teamviewer_running_is_plain_korean() {
        val s = CallPathReasonCopy.summary(listOf("overlay_in_use:com.teamviewer.host.market"))
        assertTrue(s.contains("TeamViewer"))
        assertTrue(s.contains("실행"))
        val out = CallPathReasonCopy.summary(
            listOf("overlay_in_use:com.teamviewer.host.market"),
            outgoing = true
        )
        assertTrue(out.contains("걸고"))
    }

    @Test
    fun peer_remote_has_clear_reason() {
        val s = CallPathReasonCopy.summary(listOf("peer_remote_outgoing"))
        assertTrue(s.contains("상대"))
        assertTrue(s.contains("원격"))
    }

    @Test
    fun empty_has_fallback() {
        assertEquals(
            "비정상 경로로 확인된 전화입니다.",
            CallPathReasonCopy.summary(emptyList())
        )
    }
}
