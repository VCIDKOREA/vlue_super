package kr.vlue.calloverlay.diagnostics

import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

/**
 * Phase 4-B — Overlay Failure / Attach / Layout / OEM diagnostics (관찰 전용).
 */
class OverlayDiagTrackerFailureTest {
    @Before
    fun setUp() {
        OverlayDiagTracker.resetAllForTest()
    }

    @Test
    fun attach_success_recordsTimelineAndRate() {
        OverlayDiagTracker.beginAttach("BIG_PUSH")
        OverlayDiagTracker.markAddViewBegin()
        OverlayDiagTracker.markAddViewSuccess()

        val snap = OverlayDiagTracker.snapshotJson()
        val timeline = snap.getJSONArray("attachTimeline")
        assertEquals(3, timeline.length())
        assertEquals("REQUEST_ATTACH", timeline.getJSONObject(0).getString("step"))
        assertEquals("ADD_VIEW_BEGIN", timeline.getJSONObject(1).getString("step"))
        assertEquals("ADD_VIEW_SUCCESS", timeline.getJSONObject(2).getString("step"))
        assertEquals(
            OverlayFailureReason.SUCCESS.name,
            timeline.getJSONObject(2).getString("failureReason")
        )
        assertTrue(timeline.getJSONObject(2).has("elapsedMs"))

        val rel = snap.getJSONObject("overlayReliability")
        assertEquals(1, rel.getInt("attachAttemptCount"))
        assertEquals(1, rel.getInt("attachSuccessCount"))
        assertEquals(1.0, rel.getDouble("attachSuccessRate"), 0.001)
        assertEquals(0, rel.getInt("failureCount"))
        assertFalse(snap.has("lastOverlayFailure"))
    }

    @Test
    fun attach_failure_mock_recordsFailureReason() {
        OverlayDiagTracker.beginAttach("SHOWCASE")
        OverlayDiagTracker.markAddViewBegin()
        OverlayDiagTracker.markAddViewFailed(
            OverlayFailureReason.BAD_TOKEN,
            RuntimeException("Unable to add window — bad token"),
            phase = "SHOWCASE"
        )

        val snap = OverlayDiagTracker.snapshotJson()
        val timeline = snap.getJSONArray("attachTimeline")
        assertEquals("ADD_VIEW_FAILED", timeline.getJSONObject(2).getString("step"))
        assertEquals(
            OverlayFailureReason.BAD_TOKEN.name,
            timeline.getJSONObject(2).getString("failureReason")
        )

        val last = snap.getJSONObject("lastOverlayFailure")
        assertEquals(OverlayFailureReason.BAD_TOKEN.name, last.getString("failureReason"))
        assertEquals("SHOWCASE", last.getString("phase"))
        assertEquals(1, snap.getJSONObject("overlayReliability").getInt("failureCount"))
        assertEquals(0.0, snap.getJSONObject("overlayReliability").getDouble("attachSuccessRate"), 0.001)
    }

    @Test
    fun permission_denied_recordsFailure() {
        OverlayDiagTracker.recordOverlayFailure(
            OverlayFailureReason.PERMISSION_DENIED,
            phase = "BIG_PUSH",
            detail = "SYSTEM_ALERT_WINDOW missing"
        )
        val last = OverlayDiagTracker.snapshotJson().getJSONObject("lastOverlayFailure")
        assertEquals(OverlayFailureReason.PERMISSION_DENIED.name, last.getString("failureReason"))
        assertEquals("BIG_PUSH", last.getString("phase"))
    }

    @Test
    fun screen_off_policy_bigPushReject_recordsFailure() {
        OverlayDiagTracker.recordOverlayFailure(
            OverlayFailureReason.SCREEN_OFF_POLICY,
            phase = "BIG_PUSH",
            detail = "requestBigPush rejected: SCREEN_OFF"
        )
        val last = OverlayDiagTracker.snapshotJson().getJSONObject("lastOverlayFailure")
        assertEquals(OverlayFailureReason.SCREEN_OFF_POLICY.name, last.getString("failureReason"))
        assertEquals("BIG_PUSH", last.getString("phase"))
    }

    @Test
    fun window_attach_no_retry_singleAttemptOnly() {
        OverlayDiagTracker.beginAttach("BIG_PUSH")
        OverlayDiagTracker.markAddViewBegin()
        OverlayDiagTracker.markAddViewFailed(
            OverlayFailureReason.WINDOW_REJECTED,
            RuntimeException("rejected"),
            phase = "BIG_PUSH"
        )
        // 관찰만 — 실패 후 beginAttach를 다시 호출하지 않음 (retry 금지 확인)
        val rel = OverlayDiagTracker.snapshotJson().getJSONObject("overlayReliability")
        assertEquals(1, rel.getInt("attachAttemptCount"))
        assertEquals(0, rel.getInt("attachSuccessCount"))
        val timeline = OverlayDiagTracker.snapshotJson().getJSONArray("attachTimeline")
        var requestCount = 0
        for (i in 0 until timeline.length()) {
            if (timeline.getJSONObject(i).optString("step") == "REQUEST_ATTACH") requestCount++
        }
        assertEquals(1, requestCount)
    }

    @Test
    fun layout_timeline_fullscreen_and_gone() {
        OverlayDiagTracker.beginLayout("FULLSCREEN", source = "answer")
        OverlayDiagTracker.markLayoutApplied("FULLSCREEN", "FULLSCREEN")
        OverlayDiagTracker.beginLayout("HIDDEN", source = "screenOff")
        OverlayDiagTracker.markLayoutApplied("GONE", "HIDDEN")

        val layout = OverlayDiagTracker.snapshotJson().getJSONArray("layoutTimeline")
        assertEquals(4, layout.length())
        assertEquals("REQUEST_LAYOUT", layout.getJSONObject(0).getString("step"))
        assertEquals("LAYOUT_APPLIED", layout.getJSONObject(1).getString("step"))
        assertEquals("FULLSCREEN", layout.getJSONObject(1).getString("result"))
        assertEquals("GONE", layout.getJSONObject(3).getString("result"))
        assertEquals("HIDDEN", layout.getJSONObject(3).getString("position"))

        val rel = OverlayDiagTracker.snapshotJson().getJSONObject("overlayReliability")
        assertEquals(1.0, rel.getDouble("layoutSuccessRate"), 0.001)
    }

    @Test
    fun layout_failure_miniRestore() {
        OverlayDiagTracker.beginLayout("MINI_CASE", source = "js.restoreShowcase")
        OverlayDiagTracker.markLayoutFailed(
            OverlayFailureReason.WINDOW_REJECTED,
            "MINI_CASE",
            RuntimeException("layout rejected")
        )
        val last = OverlayDiagTracker.snapshotJson().getJSONObject("lastOverlayFailure")
        assertEquals(OverlayFailureReason.WINDOW_REJECTED.name, last.getString("failureReason"))
        assertTrue(last.getString("phase").contains("MINI_CASE"))
    }

    @Test
    fun failure_matrix_allCasesRecordable() {
        // Case 1 Incoming → BigPush 실패
        OverlayDiagTracker.recordOverlayFailure(
            OverlayFailureReason.SCREEN_OFF_POLICY,
            phase = "BIG_PUSH"
        )
        // Case 2 Answer → Showcase 실패
        OverlayDiagTracker.beginAttach("SHOWCASE")
        OverlayDiagTracker.markAddViewFailed(
            OverlayFailureReason.OEM_RESTRICTED,
            RuntimeException("permission denied for window type 2038"),
            phase = "SHOWCASE"
        )
        // Case 3 Mini Restore 실패
        OverlayDiagTracker.recordOverlayFailure(
            OverlayFailureReason.UNKNOWN,
            phase = "MINI_RESTORE",
            detail = "rejected"
        )
        // Case 4 Window attach 실패
        OverlayDiagTracker.beginAttach("BIG_PUSH")
        OverlayDiagTracker.markAddViewFailed(
            OverlayFailureReason.BAD_TOKEN,
            RuntimeException("bad token"),
            phase = "BIG_PUSH"
        )
        // Case 5 Permission 없음
        OverlayDiagTracker.recordOverlayFailure(
            OverlayFailureReason.PERMISSION_DENIED,
            phase = "BIG_PUSH",
            detail = "SYSTEM_ALERT_WINDOW missing"
        )

        val fails = OverlayDiagTracker.snapshotJson().getJSONArray("overlayFailures")
        assertTrue(fails.length() >= 5)
        val reasons = mutableSetOf<String>()
        for (i in 0 until fails.length()) {
            reasons.add(fails.getJSONObject(i).getString("failureReason"))
        }
        assertTrue(reasons.contains(OverlayFailureReason.SCREEN_OFF_POLICY.name))
        assertTrue(reasons.contains(OverlayFailureReason.OEM_RESTRICTED.name))
        assertTrue(reasons.contains(OverlayFailureReason.UNKNOWN.name))
        assertTrue(reasons.contains(OverlayFailureReason.BAD_TOKEN.name))
        assertTrue(reasons.contains(OverlayFailureReason.PERMISSION_DENIED.name))
    }

    @Test
    fun oem_deviceInfo_and_adminFields_inSnapshot() {
        OverlayDiagTracker.setOemDeviceInfo(
            JSONObject()
                .put("manufacturer", "samsung")
                .put("brand", "samsung")
                .put("model", "SM-TEST")
                .put("sdkInt", 34)
                .put("overlayPermission", true)
                .put("batteryOptimizationIgnored", false)
                .put("roleDialer", true)
        )
        OverlayDiagTracker.beginAttach("BIG_PUSH")
        OverlayDiagTracker.markAddViewSuccess()
        OverlayDiagTracker.recordOverlayFailure(
            OverlayFailureReason.CALL_ENDED,
            phase = "ATTACH",
            detail = "call ended before visible"
        )

        val snap = OverlayDiagTracker.snapshotJson()
        val oem = snap.getJSONObject("oemDeviceInfo")
        assertEquals("samsung", oem.getString("manufacturer"))
        assertEquals("SM-TEST", oem.getString("model"))
        assertEquals(34, oem.getInt("sdkInt"))
        assertTrue(oem.getBoolean("overlayPermission"))
        assertTrue(oem.getBoolean("roleDialer"))

        assertTrue(snap.has("lastOverlayFailure"))
        assertTrue(snap.has("overlayFailures"))
        assertTrue(snap.has("attachTimeline"))
        assertTrue(snap.has("layoutTimeline"))
        val rel = snap.getJSONObject("overlayReliability")
        assertTrue(rel.has("failureCount"))
        assertTrue(rel.has("attachSuccessRate"))
        assertTrue(rel.has("overlaySuccessRate"))
    }

    @Test
    fun success_reason_does_not_inflate_failureCount() {
        OverlayDiagTracker.recordOverlayFailure(
            OverlayFailureReason.SUCCESS,
            phase = "N/A"
        )
        assertEquals(
            0,
            OverlayDiagTracker.snapshotJson().getJSONObject("overlayReliability").getInt("failureCount")
        )
    }

    @Test
    fun classifyFailure_mapsExceptions() {
        assertEquals(
            OverlayFailureReason.PERMISSION_DENIED,
            OemDeviceProbe.classifyFailure(null, canDrawOverlays = false)
        )
        assertEquals(
            OverlayFailureReason.SCREEN_OFF_POLICY,
            OemDeviceProbe.classifyFailure(null, canDrawOverlays = true, screenOffPolicy = true)
        )
        assertEquals(
            OverlayFailureReason.BAD_TOKEN,
            OemDeviceProbe.classifyFailure(
                RuntimeException("Unable to add window — bad token"),
                canDrawOverlays = true
            )
        )
        assertEquals(
            OverlayFailureReason.OEM_RESTRICTED,
            OemDeviceProbe.classifyFailure(
                RuntimeException("permission denied for window type 2038"),
                canDrawOverlays = true
            )
        )
        assertEquals(
            OverlayFailureReason.WINDOW_REJECTED,
            OemDeviceProbe.classifyFailure(RuntimeException("other"), canDrawOverlays = true)
        )
        assertEquals(
            OverlayFailureReason.UNKNOWN,
            OemDeviceProbe.classifyFailure(null, canDrawOverlays = true)
        )
    }
}
