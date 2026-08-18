package kr.vlue.calloverlay.dcp

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class CallPathLookupMergeTest {
    @Test
    fun local_abnormal_writes_reason_and_path_verify() {
        val verdict = CallPathVerdict.abnormal(listOf("overlay_in_use:com.anydesk.anydeskandroid"))
        val merged = CallPathLookupMerge.merge("{\"matched\":true,\"displayName\":\"종근\"}", verdict, false)
        assertEquals("abnormal", merged.route)
        assertTrue(merged.json.contains("pathVerify"))
        assertTrue(merged.json.contains("AnyDesk") || merged.json.contains("원격제어"))
    }

    @Test
    fun peer_remote_in_json_is_abnormal_even_if_local_normal() {
        val raw = """
            {"matched":true,"dcp":{"routeStatus":"abnormal","reasons":["peer_remote_outgoing"]}}
        """.trimIndent()
        val merged = CallPathLookupMerge.merge(raw, CallPathVerdict.normal(), false)
        assertEquals("abnormal", merged.route)
        assertTrue(merged.json.contains("상대"))
    }

    @Test
    fun local_normal_without_peer_stays_empty_route() {
        val merged = CallPathLookupMerge.merge("{\"matched\":true}", CallPathVerdict.normal(), false)
        assertEquals("", merged.route)
    }
}
