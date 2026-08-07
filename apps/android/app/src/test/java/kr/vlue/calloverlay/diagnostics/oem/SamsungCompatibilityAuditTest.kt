package kr.vlue.calloverlay.diagnostics.oem

import kr.vlue.calloverlay.diagnostics.OemDeviceProbe
import kr.vlue.calloverlay.diagnostics.OverlayDiagTracker
import kr.vlue.calloverlay.diagnostics.OverlayFailureReason
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

/**
 * Phase 5-A — Samsung / OEM Hardening Audit (Architecture Freeze · 관찰만).
 */
class SamsungCompatibilityAuditTest {
    @Before
    fun setUp() {
        OverlayDiagTracker.resetAllForTest()
    }

    @Test
    fun oemRuleCatalog_resolvesSamsungPixelXiaomi() {
        assertEquals(OemFamily.SAMSUNG, OemRuleCatalog.resolveFamily("samsung", "samsung"))
        assertEquals(OemFamily.PIXEL, OemRuleCatalog.resolveFamily("Google", "google"))
        assertEquals(OemFamily.XIAOMI, OemRuleCatalog.resolveFamily("Xiaomi", "Redmi"))
        assertEquals(OemFamily.OTHER, OemRuleCatalog.resolveFamily("Other", "brand"))
    }

    @Test
    fun knownRestrictionCatalog_samsungIncludesCallRestrict() {
        val samsung = OemRuleCatalog.restrictionsFor(OemFamily.SAMSUNG)
        assertTrue(samsung.any { it.id == "SAMSUNG_CALL_OVERLAY_RESTRICT" })
        assertTrue(samsung.any { it.id == "OVERLAY_PERMISSION" })
        assertTrue(samsung.any { it.id == "BAD_TOKEN" })
        assertTrue(samsung.any { it.id == "SCREEN_OFF_AOD" })
        assertTrue(samsung.any { it.id == "SAMSUNG_MINI_CALL" })

        val pixel = OemRuleCatalog.restrictionsFor(OemFamily.PIXEL)
        assertTrue(pixel.any { it.id == "PIXEL_AOSP_TELECOM" })

        val xiaomi = OemRuleCatalog.restrictionsFor(OemFamily.XIAOMI)
        assertTrue(xiaomi.any { it.id == "XIAOMI_DISPLAY_POPUP" })
    }

    @Test
    fun deviceCompatibility_json_forAdmin() {
        val compat = OemRuleCatalog.deviceCompatibilityJson(
            manufacturer = "samsung",
            brand = "samsung",
            model = "SM-S911N",
            sdkInt = 34,
            overlayPermission = true,
            batteryOptimizationIgnored = false,
            roleDialer = false
        )
        assertEquals("SAMSUNG", compat.getString("oemFamily"))
        assertEquals("samsung", compat.getString("manufacturer"))
        assertEquals(34, compat.getInt("sdkInt"))
        assertTrue(compat.getBoolean("overlayPermission"))
        assertFalse(compat.getBoolean("batteryOptimizationIgnored"))
        assertTrue(compat.getJSONArray("knownRestrictions").length() > 0)
        assertTrue(compat.getJSONArray("knownRestrictionTitles").length() > 0)
    }

    @Test
    fun classifyFailure_badToken_permission_oemReject() {
        assertEquals(
            OverlayFailureReason.BAD_TOKEN,
            OemDeviceProbe.classifyFailure(
                RuntimeException("BadTokenException:Unable to add window"),
                canDrawOverlays = true
            )
        )
        assertEquals(
            OverlayFailureReason.PERMISSION_DENIED,
            OemDeviceProbe.classifyFailure(null, canDrawOverlays = false)
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
            OemDeviceProbe.classifyFailure(RuntimeException("rejected"), canDrawOverlays = true)
        )
    }

    @Test
    fun samsungAudit_mock_attachLayout_andRates() {
        OverlayDiagTracker.setOemDeviceInfo(
            JSONObject()
                .put("manufacturer", "samsung")
                .put("brand", "samsung")
                .put("model", "SM-TEST")
                .put("sdkInt", 34)
                .put("overlayPermission", true)
                .put("batteryOptimizationIgnored", true)
        )
        val audit = SamsungCompatibilityAudit.runMockAttachLayoutAudit()
        OverlayDiagTracker.refreshSamsungCompatibilityAudit()

        assertEquals("SAMSUNG", audit.getString("oemFamily"))
        assertTrue(audit.getBoolean("architectureFreeze"))

        val attach = audit.getJSONObject("attachAudit")
        assertTrue(attach.getInt("attachAttemptCount") >= 3)
        assertTrue(attach.getInt("attachSuccessCount") >= 1)
        assertTrue(attach.getInt("badTokenCount") >= 1)
        assertTrue(attach.getInt("oemRejectCount") >= 1)
        assertTrue(attach.getInt("permissionRejectCount") >= 1)
        assertTrue(attach.has("attachSuccessRate"))
        assertTrue(attach.has("attachFailRate"))

        val layout = audit.getJSONObject("layoutAudit")
        assertTrue(layout.getBoolean("allLayoutsObservedOk"))
        val commits = layout.getJSONObject("commits")
        assertTrue(commits.getInt("TOP") >= 1)
        assertTrue(commits.getInt("BOTTOM") >= 1)
        assertTrue(commits.getInt("FULLSCREEN") >= 1)
        assertTrue(commits.getInt("MINI_CASE") >= 1)
        assertTrue(commits.getInt("GONE") >= 1 || commits.getInt("HIDDEN") >= 1)

        val checklist = audit.getJSONArray("checklist")
        val ids = mutableSetOf<String>()
        for (i in 0 until checklist.length()) {
            ids.add(checklist.getJSONObject(i).getString("id"))
        }
        SamsungCompatibilityAudit.auditChecklistIds.forEach {
            assertTrue("missing $it", ids.contains(it))
        }

        val snap = OverlayDiagTracker.snapshotJson()
        assertTrue(snap.has("deviceCompatibility"))
        assertTrue(snap.has("samsungCompatibilityAudit"))
        assertEquals(
            "SAMSUNG",
            snap.getJSONObject("deviceCompatibility").getString("oemFamily")
        )
    }

    @Test
    fun oneUiCallFlow_passes() {
        val result = SamsungCompatibilityAudit.runOneUiCallFlow()
        assertTrue(result.getBoolean("passed"))
        assertEquals("PASS", result.getString("verdict"))
        assertEquals(7, result.getJSONArray("timeline").length())
        OverlayDiagTracker.recordOneUiCallFlowResult(result)
        assertTrue(OverlayDiagTracker.snapshotJson().has("oneUiCallFlowResult"))
    }

    @Test
    fun windowAttach_success_observed() {
        OverlayDiagTracker.beginAttach("AUDIT")
        OverlayDiagTracker.markAddViewBegin()
        OverlayDiagTracker.markAddViewSuccess()
        OverlayDiagTracker.refreshSamsungCompatibilityAudit()
        val attach =
            OverlayDiagTracker.snapshotJson()
                .getJSONObject("samsungCompatibilityAudit")
                .getJSONObject("attachAudit")
        assertEquals(1, attach.getInt("attachSuccessCount"))
        assertEquals(0.0, attach.getDouble("attachFailRate"), 0.001)
    }

    @Test
    fun overlayReject_recordedAsOemOrWindow() {
        OverlayDiagTracker.beginAttach("REJECT")
        OverlayDiagTracker.markAddViewFailed(
            OverlayFailureReason.OEM_RESTRICTED,
            RuntimeException("permission denied for window type 2038"),
            phase = "AUDIT"
        )
        OverlayDiagTracker.refreshSamsungCompatibilityAudit()
        val attach =
            OverlayDiagTracker.snapshotJson()
                .getJSONObject("samsungCompatibilityAudit")
                .getJSONObject("attachAudit")
        assertTrue(attach.getInt("oemRejectCount") >= 1)
        assertEquals(1.0, attach.getDouble("attachFailRate"), 0.001)
    }
}
