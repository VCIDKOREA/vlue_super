package kr.vlue.calloverlay.diagnostics.security

import kr.vlue.calloverlay.diagnostics.OverlayDiagTracker
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

/**
 * Phase 5-D / 6-B — Security / Privacy / Store Readiness Audit (Architecture Freeze).
 */
class CompanionSecurityAuditTest {
    @Before
    fun setUp() {
        OverlayDiagTracker.resetAllForTest()
    }

    @Test
    fun manifestAudit_rc2_clearsStoreBlockers() {
        val findings = CompanionSecurityAudit.auditManifest(
            CompanionSecurityAudit.BUILTIN_MANIFEST_SNAPSHOT
        )
        assertFalse(findings.any { it.id == "MANIFEST_QUERY_ALL_PACKAGES" })
        assertFalse(findings.any { it.id == "MANIFEST_CLEARTEXT" })
        assertTrue(findings.any { it.id == "MANIFEST_ALLOW_BACKUP" })
        assertTrue(findings.any { it.id == "MANIFEST_EXPORTED_PHONE_STATE" })
        assertTrue(findings.any { it.id == "MANIFEST_OVERLAY_SERVICE_PRIVATE" && it.severity == AuditSeverity.OK })
        assertTrue(findings.any { it.id == "MANIFEST_INCALL_PROTECTED" })
        val risks = CompanionSecurityAudit.riskOnly(findings)
        assertFalse(risks.any { it.severity == AuditSeverity.OK })
    }

    @Test
    fun manifestAudit_legacyPatternsStillFlagged() {
        val legacy = """
            <uses-permission android:name="android.permission.QUERY_ALL_PACKAGES" />
            <application android:usesCleartextTraffic="true" />
        """.trimIndent()
        val findings = CompanionSecurityAudit.auditManifest(legacy)
        assertTrue(findings.any { it.id == "MANIFEST_QUERY_ALL_PACKAGES" && it.severity == AuditSeverity.RISK })
        assertTrue(findings.any { it.id == "MANIFEST_CLEARTEXT" && it.severity == AuditSeverity.RISK })
    }

    @Test
    fun intentAudit_immutablePendingIntent() {
        val ok = CompanionSecurityAudit.auditIntentSecurity(
            listOf("PendingIntent.FLAG_IMMUTABLE", "FLAG_UPDATE_CURRENT or FLAG_IMMUTABLE")
        )
        assertTrue(ok.any { it.id == "INTENT_PENDING_IMMUTABLE" && it.severity == AuditSeverity.OK })

        val mutable = CompanionSecurityAudit.auditIntentSecurity(
            listOf("PendingIntent.FLAG_MUTABLE")
        )
        assertTrue(mutable.any { it.id == "INTENT_PENDING_MUTABLE" && it.severity == AuditSeverity.RISK })
    }

    @Test
    fun privacyAudit_detectsMaskAndRawPhone() {
        val findings = CompanionSecurityAudit.auditPrivacy(
            listOf(
                "phoneMasked",
                "maskPhone",
                """put("phone", phone)""",
                "Log.d(\"x\", \"y\")"
            )
        )
        assertTrue(findings.any { it.id == "PRIVACY_PHONE_MASKED" })
        assertTrue(findings.any { it.id == "PRIVACY_RAW_PHONE_LOG" && it.severity == AuditSeverity.RISK })
        assertTrue(findings.any { it.id == "PRIVACY_LOG_D" })
    }

    @Test
    fun releaseAudit_detectsDebugMarkers() {
        val findings = CompanionSecurityAudit.auditReleaseBuild(
            listOf("TODO fix", "Log.d(", "println(\"x\")", "NORMAL_OVERLAY_PROBE")
        )
        assertTrue(findings.any { it.id == "RELEASE_TODO_FIXME" })
        assertTrue(findings.any { it.id == "RELEASE_LOG_D" })
        assertTrue(findings.any { it.id == "RELEASE_PRINTLN" && it.severity == AuditSeverity.RISK })
    }

    @Test
    fun overlaySecurity_and_storeReadiness() {
        val overlay = CompanionSecurityAudit.auditOverlaySecurity()
        assertTrue(overlay.any { it.id == "OVERLAY_PERMISSION_GATE" })
        assertTrue(overlay.any { it.id == "OVERLAY_SINGLE_WINDOW" })
        val store = CompanionSecurityAudit.storeReadinessChecklist()
        assertTrue(store.any { it.id == "STORE_ACCESSIBILITY" && it.severity == AuditSeverity.OK })
        assertTrue(store.any { it.id == "STORE_OVERLAY_PURPOSE" })
        assertTrue(store.any { it.id == "STORE_DEFAULT_DIALER" })
    }

    @Test
    fun builtInReport_inDiagSnapshot() {
        OverlayDiagTracker.refreshSecurityAuditReport()
        val report = OverlayDiagTracker.snapshotJson().getJSONObject("securityAuditReport")
        assertTrue(report.getBoolean("architectureFreeze"))
        assertTrue(report.has("manifestAudit"))
        assertTrue(report.has("manifestRisks"))
        assertTrue(report.has("intentSecurity"))
        assertTrue(report.has("overlaySecurity"))
        assertTrue(report.has("privacyReport"))
        assertTrue(report.has("releaseChecklist"))
        assertTrue(report.has("storeReadiness"))
        val summary = report.getJSONObject("summary")
        assertTrue(summary.getInt("total") > 0)
        assertTrue(summary.getInt("review") >= 1)
        assertEquals(0, summary.getInt("risk"))
        assertTrue(report.getJSONArray("manifestRisks").length() >= 1)
        assertFalse(
            report.getJSONArray("manifestAudit").toString().contains("MANIFEST_QUERY_ALL_PACKAGES")
        )
        assertFalse(
            report.getJSONArray("manifestAudit").toString().contains("MANIFEST_CLEARTEXT")
        )
    }

    @Test
    fun riskOnly_excludesOk() {
        val all = CompanionSecurityAudit.auditOverlaySecurity() +
            CompanionSecurityAudit.auditManifest(CompanionSecurityAudit.BUILTIN_MANIFEST_SNAPSHOT)
        val risks = CompanionSecurityAudit.riskOnly(all)
        assertEquals(0, risks.count { it.severity == AuditSeverity.OK })
        assertEquals(0, risks.count { it.severity == AuditSeverity.INFO })
    }
}
