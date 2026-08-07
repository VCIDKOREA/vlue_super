package kr.vlue.calloverlay.diagnostics.release

import java.io.File
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Phase 6-B — Release Checklist Validation RC-2 (Architecture Freeze · Store blockers closed).
 */
class CompanionReleaseCandidateChecklistTest {
    @Test
    fun releaseChecklist_hasAllRequiredItems() {
        val report = CompanionReleaseCandidateChecklist.validate()
        assertTrue(report.getBoolean("architectureFreeze"))
        assertTrue(report.getBoolean("checklistComplete"))
        assertEquals(0, report.getJSONArray("missingChecklistIds").length())
        assertFalse(report.getBoolean("hardFail"))
        assertEquals(10, report.getJSONArray("checklist").length())

        val ids = mutableSetOf<String>()
        val checklist = report.getJSONArray("checklist")
        for (i in 0 until checklist.length()) {
            ids.add(checklist.getJSONObject(i).getString("id"))
            assertTrue(
                checklist.getJSONObject(i).getString("status") in
                    setOf("PASS", "CONDITIONAL", "FAIL")
            )
        }
        listOf(
            "ARCH_FREEZE",
            "DIAGNOSTICS_ACTIVE",
            "DEBUG_HOOK",
            "DEPRECATED_CLEANUP",
            "MANIFEST_AUDIT",
            "SECURITY_AUDIT",
            "PRIVACY_AUDIT",
            "PERFORMANCE_KPI",
            "RECOVERY_PASS",
            "OEM_AUDIT_PASS"
        ).forEach { assertTrue(it in ids) }
    }

    @Test
    fun deprecatedCandidates_listed_withoutAutoDelete() {
        val report = CompanionReleaseCandidateChecklist.validate()
        assertTrue(report.getBoolean("deprecatedAutoDeleteForbidden"))
        assertTrue(report.getJSONArray("deprecatedCandidates").length() >= 5)
    }

    @Test
    fun openRisks_and_knownLimitations_present() {
        val report = CompanionReleaseCandidateChecklist.validate()
        assertTrue(report.getJSONArray("openRisks").length() >= 5)
        assertTrue(report.getJSONArray("knownLimitations").length() >= 4)
        assertEquals("RC-2", report.getString("overlayEngineVersion"))
        assertEquals("1.0.0-rc2", report.getString("appVersionName"))
        assertTrue(report.getJSONArray("resolvedBlockers").length() >= 3)
    }

    @Test
    fun goNoGo_engineGo_storeGo() {
        val report = CompanionReleaseCandidateChecklist.validate()
        assertTrue(report.getBoolean("engineGo"))
        assertTrue(report.getBoolean("storeGo"))
        assertTrue(report.getBoolean("storeBlockersClosed"))
        assertEquals("GO", report.getString("goNoGo"))
    }

    @Test
    fun releaseCandidateDocument_exists() {
        val candidates = listOf(
            File("docs/release/release-candidate-v2.md"),
            File("../docs/release/release-candidate-v2.md"),
            File("../../docs/release/release-candidate-v2.md"),
            File("../../../docs/release/release-candidate-v2.md"),
            File("../../../../docs/release/release-candidate-v2.md"),
            File("d:/dev/vlue_super/docs/release/release-candidate-v2.md")
        )
        val doc = candidates.firstOrNull { it.isFile }
        assertTrue(
            "Missing ${CompanionReleaseCandidateChecklist.DOC_PATH}",
            doc != null && doc.isFile
        )
        val text = doc!!.readText()
        assertTrue(text.contains("Architecture Freeze"))
        assertTrue(text.contains("Release Blocker"))
        assertTrue(text.contains("Go / No-Go"))
        assertTrue(text.contains("Store Submission"))
        assertTrue(text.contains("Final QA"))
    }
}
