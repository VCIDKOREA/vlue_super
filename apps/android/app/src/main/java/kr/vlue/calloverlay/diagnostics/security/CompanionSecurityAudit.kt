package kr.vlue.calloverlay.diagnostics.security

import org.json.JSONArray
import org.json.JSONObject

enum class AuditSeverity {
    INFO,
    REVIEW,
    RISK,
    OK
}

data class AuditFinding(
    val id: String,
    val category: String,
    val severity: AuditSeverity,
    val title: String,
    val detail: String
) {
    fun toJson(): JSONObject = JSONObject().apply {
        put("id", id)
        put("category", category)
        put("severity", severity.name)
        put("title", title)
        put("detail", detail)
    }
}

/**
 * Phase 5-D Security / Privacy / Store Readiness Audit.
 * Architecture Freeze — 관찰·보고만. State/Controller/Window 변경 없음.
 */
object CompanionSecurityAudit {
    /**
     * Manifest XML 문자열 정적 분석 — 위험/검토 항목만 보고.
     */
    fun auditManifest(manifestXml: String): List<AuditFinding> {
        val findings = mutableListOf<AuditFinding>()
        val exportedTrue = Regex(
            """android:name="([^"]+)"[^>]*android:exported="true"|android:exported="true"[^>]*android:name="([^"]+)""""
        ).findAll(manifestXml)
        val exportedNames = exportedTrue.mapNotNull { m ->
            m.groupValues[1].ifBlank { m.groupValues[2] }.ifBlank { null }
        }.toSet()

        // receivers exported
        if (manifestXml.contains("LetteringCallReceiver") &&
            manifestXml.contains("PHONE_STATE")
        ) {
            findings += AuditFinding(
                id = "MANIFEST_EXPORTED_PHONE_STATE",
                category = "MANIFEST",
                severity = AuditSeverity.REVIEW,
                title = "Exported PHONE_STATE receiver",
                detail = "LetteringCallReceiver exported=true — required for system broadcast; keep no custom unprotected actions"
            )
        }
        if (manifestXml.contains("OutgoingCallReceiver")) {
            findings += AuditFinding(
                id = "MANIFEST_EXPORTED_OUTGOING",
                category = "MANIFEST",
                severity = AuditSeverity.REVIEW,
                title = "Exported NEW_OUTGOING_CALL receiver",
                detail = "OutgoingCallReceiver exported — deprecated API path; review retention"
            )
        }
        if (manifestXml.contains("LetteringBootReceiver")) {
            findings += AuditFinding(
                id = "MANIFEST_EXPORTED_BOOT",
                category = "MANIFEST",
                severity = AuditSeverity.REVIEW,
                title = "Exported BOOT_COMPLETED receiver",
                detail = "Boot receiver exported=true — ensure no sensitive work without auth"
            )
        }
        if (manifestXml.contains("QUERY_ALL_PACKAGES")) {
            findings += AuditFinding(
                id = "MANIFEST_QUERY_ALL_PACKAGES",
                category = "MANIFEST",
                severity = AuditSeverity.RISK,
                title = "QUERY_ALL_PACKAGES declared",
                detail = "Play-sensitive permission — justify Family Care scan; declare in store listing"
            )
        }
        if (manifestXml.contains("usesCleartextTraffic=\"true\"")) {
            findings += AuditFinding(
                id = "MANIFEST_CLEARTEXT",
                category = "MANIFEST",
                severity = AuditSeverity.RISK,
                title = "Cleartext traffic enabled",
                detail = "android:usesCleartextTraffic=true — prefer HTTPS-only for release"
            )
        }
        if (manifestXml.contains("allowBackup=\"true\"")) {
            findings += AuditFinding(
                id = "MANIFEST_ALLOW_BACKUP",
                category = "MANIFEST",
                severity = AuditSeverity.REVIEW,
                title = "allowBackup=true",
                detail = "Review backup of prefs/tokens; consider allowBackup=false or rules"
            )
        }
        if (manifestXml.contains("FOREGROUND_SERVICE_SPECIAL_USE") ||
            manifestXml.contains("specialUse")
        ) {
            findings += AuditFinding(
                id = "MANIFEST_FGS_SPECIAL_USE",
                category = "MANIFEST",
                severity = AuditSeverity.REVIEW,
                title = "FGS specialUse",
                detail = "Call overlay FGS specialUse — Play Console declaration required"
            )
        }
        // protected exported services OK
        if (manifestXml.contains("BIND_INCALL_SERVICE")) {
            findings += AuditFinding(
                id = "MANIFEST_INCALL_PROTECTED",
                category = "MANIFEST",
                severity = AuditSeverity.OK,
                title = "InCallService permission-gated",
                detail = "VlueInCallService exported with BIND_INCALL_SERVICE"
            )
        }
        if (manifestXml.contains("CallOverlayService") &&
            manifestXml.contains("android:exported=\"false\"")
        ) {
            findings += AuditFinding(
                id = "MANIFEST_OVERLAY_SERVICE_PRIVATE",
                category = "MANIFEST",
                severity = AuditSeverity.OK,
                title = "CallOverlayService not exported",
                detail = "Overlay FGS exported=false"
            )
        }
        // CAMERA / LOCATION as review if present
        listOf(
            "CAMERA" to "CAMERA permission — justify if not core to Companion Overlay",
            "ACCESS_FINE_LOCATION" to "FINE_LOCATION — store purpose disclosure",
            "ACCESS_COARSE_LOCATION" to "COARSE_LOCATION — store purpose disclosure"
        ).forEach { (perm, detail) ->
            if (manifestXml.contains(perm)) {
                findings += AuditFinding(
                    id = "MANIFEST_PERM_$perm",
                    category = "MANIFEST",
                    severity = AuditSeverity.REVIEW,
                    title = "Permission $perm",
                    detail = detail
                )
            }
        }
        if (exportedNames.isNotEmpty()) {
            findings += AuditFinding(
                id = "MANIFEST_EXPORTED_COUNT",
                category = "MANIFEST",
                severity = AuditSeverity.INFO,
                title = "Exported components observed",
                detail = "count≈${exportedNames.size} (launcher/dialer/share/receivers/protected services)"
            )
        }
        return findings
    }

    fun auditIntentSecurity(sourceSnippets: List<String>): List<AuditFinding> {
        val joined = sourceSnippets.joinToString("\n")
        val findings = mutableListOf<AuditFinding>()
        val hasImmutable = joined.contains("FLAG_IMMUTABLE")
        val hasMutable = joined.contains("FLAG_MUTABLE")
        if (hasImmutable) {
            findings += AuditFinding(
                id = "INTENT_PENDING_IMMUTABLE",
                category = "INTENT",
                severity = AuditSeverity.OK,
                title = "PendingIntent FLAG_IMMUTABLE",
                detail = "Immutable PendingIntent usage found"
            )
        }
        if (hasMutable) {
            findings += AuditFinding(
                id = "INTENT_PENDING_MUTABLE",
                category = "INTENT",
                severity = AuditSeverity.RISK,
                title = "PendingIntent FLAG_MUTABLE",
                detail = "Mutable PendingIntent — review exposure"
            )
        }
        if (!hasImmutable && joined.contains("PendingIntent")) {
            findings += AuditFinding(
                id = "INTENT_PENDING_FLAG_UNKNOWN",
                category = "INTENT",
                severity = AuditSeverity.REVIEW,
                title = "PendingIntent without clear IMMUTABLE",
                detail = "Ensure FLAG_IMMUTABLE on API 31+"
            )
        }
        findings += AuditFinding(
            id = "INTENT_OVERLAY_SERVICE_PRIVATE",
            category = "INTENT",
            severity = AuditSeverity.OK,
            title = "Overlay service not exported",
            detail = "External apps cannot bind/start CallOverlayService via exported=true"
        )
        findings += AuditFinding(
            id = "INTENT_SYSTEM_BROADCASTS",
            category = "INTENT",
            severity = AuditSeverity.REVIEW,
            title = "System broadcast receivers",
            detail = "PHONE_STATE / BOOT / OUTGOING — validate extras; no sensitive side effects from spoofed non-system senders where protected"
        )
        return findings
    }

    fun auditOverlaySecurity(): List<AuditFinding> = listOf(
        AuditFinding(
            id = "OVERLAY_PERMISSION_GATE",
            category = "OVERLAY",
            severity = AuditSeverity.OK,
            title = "Overlay permission gated",
            detail = "SYSTEM_ALERT_WINDOW checked before FGS overlay; deny → Diagnostics PERMISSION_DENIED, no force-show"
        ),
        AuditFinding(
            id = "OVERLAY_SINGLE_WINDOW",
            category = "OVERLAY",
            severity = AuditSeverity.OK,
            title = "Single TYPE_APPLICATION_OVERLAY",
            detail = "Architecture Freeze — one Companion Window; reduces overlay abuse surface"
        ),
        AuditFinding(
            id = "OVERLAY_CALL_UI_POLICY",
            category = "OVERLAY",
            severity = AuditSeverity.OK,
            title = "Does not replace dialer UI",
            detail = "Companion Event-driven; competes not with system Call UI (docs/architecture)"
        ),
        AuditFinding(
            id = "OVERLAY_ABUSE_REVIEW",
            category = "OVERLAY",
            severity = AuditSeverity.REVIEW,
            title = "Overlay only on call events",
            detail = "Ensure no idle persistent promotional overlay; call-lifecycle tied attach/dismiss"
        ),
        AuditFinding(
            id = "OVERLAY_WINDOW_FLAGS",
            category = "OVERLAY",
            severity = AuditSeverity.REVIEW,
            title = "Window flags",
            detail = "NOT_TOUCH_MODAL / lock-screen flags — review for Call UI interference on OEM"
        )
    )

    fun auditPrivacy(sourceSnippets: List<String>): List<AuditFinding> {
        val joined = sourceSnippets.joinToString("\n")
        val findings = mutableListOf<AuditFinding>()
        if (joined.contains("phoneMasked") || joined.contains("maskPhone")) {
            findings += AuditFinding(
                id = "PRIVACY_PHONE_MASKED",
                category = "PRIVACY",
                severity = AuditSeverity.OK,
                title = "Diagnostics phone masking",
                detail = "phoneMasked / maskPhone present in DiagnosticsSessionStore"
            )
        }
        if (Regex("""put\("phone"""").containsMatchIn(joined) ||
            joined.contains("phone=\$phone") ||
            joined.contains("\"phone\", phone")
        ) {
            findings += AuditFinding(
                id = "PRIVACY_RAW_PHONE_LOG",
                category = "PRIVACY",
                severity = AuditSeverity.RISK,
                title = "Possible raw phone in logs/trace",
                detail = "Raw phone may appear in Trace/Log payloads — mask for release diagnostics"
            )
        }
        if (joined.contains("Log.d(")) {
            findings += AuditFinding(
                id = "PRIVACY_LOG_D",
                category = "PRIVACY",
                severity = AuditSeverity.REVIEW,
                title = "Log.d present",
                detail = "Debug logs may include call metadata — strip or gate for release"
            )
        }
        findings += AuditFinding(
            id = "PRIVACY_POLICY_TARGET",
            category = "PRIVACY",
            severity = AuditSeverity.REVIEW,
            title = "Privacy policy reflection targets",
            detail = "Disclose: call number processing, contacts lookup, diagnostics upload, overlay permission"
        )
        return findings
    }

    fun auditReleaseBuild(sourceSnippets: List<String>): List<AuditFinding> {
        val joined = sourceSnippets.joinToString("\n")
        val findings = mutableListOf<AuditFinding>()
        val todoCount = Regex("""TODO|FIXME""").findAll(joined).count()
        if (todoCount > 0) {
            findings += AuditFinding(
                id = "RELEASE_TODO_FIXME",
                category = "RELEASE",
                severity = AuditSeverity.REVIEW,
                title = "TODO/FIXME markers",
                detail = "Found ≈$todoCount TODO/FIXME in scanned sources"
            )
        }
        val logD = Regex("""Log\.d\(""").findAll(joined).count()
        if (logD > 0) {
            findings += AuditFinding(
                id = "RELEASE_LOG_D",
                category = "RELEASE",
                severity = AuditSeverity.REVIEW,
                title = "Log.d calls",
                detail = "count≈$logD — consider ProGuard/strip or BuildConfig.DEBUG gate"
            )
        }
        if (joined.contains("println(")) {
            findings += AuditFinding(
                id = "RELEASE_PRINTLN",
                category = "RELEASE",
                severity = AuditSeverity.RISK,
                title = "println present",
                detail = "Remove println from production paths"
            )
        }
        if (joined.contains("usesCleartextTraffic=\"true\"") ||
            joined.contains("usesCleartextTraffic = true")
        ) {
            findings += AuditFinding(
                id = "RELEASE_CLEARTEXT",
                category = "RELEASE",
                severity = AuditSeverity.RISK,
                title = "Cleartext enabled",
                detail = "Disable cleartext for release store build"
            )
        }
        findings += AuditFinding(
            id = "RELEASE_TEST_HOOK",
            category = "RELEASE",
            severity = AuditSeverity.REVIEW,
            title = "Diagnostics / probe hooks",
            detail = "NORMAL_OVERLAY_PROBE and diag trackers are observation — ensure not user-facing in store UX"
        )
        findings += AuditFinding(
            id = "RELEASE_FEATURE_FLAG",
            category = "RELEASE",
            severity = AuditSeverity.INFO,
            title = "Feature flags",
            detail = "Review CompanionMvpConfig / lettering_enabled defaults for production"
        )
        return findings
    }

    fun storeReadinessChecklist(): List<AuditFinding> = listOf(
        AuditFinding(
            id = "STORE_PERMISSION_RATIONALE",
            category = "STORE",
            severity = AuditSeverity.REVIEW,
            title = "Permission rationales",
            detail = "Document Overlay / Phone / Contacts / FGS specialUse / Notification Listener purposes"
        ),
        AuditFinding(
            id = "STORE_PRIVACY_POLICY",
            category = "STORE",
            severity = AuditSeverity.REVIEW,
            title = "Privacy policy",
            detail = "Reflect call metadata, diagnostics, overlay, optional dialer role"
        ),
        AuditFinding(
            id = "STORE_OVERLAY_PURPOSE",
            category = "STORE",
            severity = AuditSeverity.OK,
            title = "Overlay purpose",
            detail = "Companion lettering/digital card — not a dialer replacement (architecture doc)"
        ),
        AuditFinding(
            id = "STORE_ACCESSIBILITY",
            category = "STORE",
            severity = AuditSeverity.OK,
            title = "AccessibilityService",
            detail = "App does not register AccessibilityService; Family scanner only detects others' BIND_ACCESSIBILITY"
        ),
        AuditFinding(
            id = "STORE_DEFAULT_DIALER",
            category = "STORE",
            severity = AuditSeverity.REVIEW,
            title = "Default Dialer impact",
            detail = "ROLE_DIALER optional for in-call controls — disclose if prompted; Overlay works without being default dialer when permission allows"
        )
    )

    fun riskOnly(findings: List<AuditFinding>): List<AuditFinding> =
        findings.filter { it.severity == AuditSeverity.RISK || it.severity == AuditSeverity.REVIEW }

    fun buildReport(
        manifestXml: String,
        intentSources: List<String>,
        privacySources: List<String>,
        releaseSources: List<String>
    ): JSONObject {
        val manifest = auditManifest(manifestXml)
        val intent = auditIntentSecurity(intentSources)
        val overlay = auditOverlaySecurity()
        val privacy = auditPrivacy(privacySources)
        val release = auditReleaseBuild(releaseSources + listOf(manifestXml))
        val store = storeReadinessChecklist()
        val all = manifest + intent + overlay + privacy + release + store
        val risks = riskOnly(all)
        return JSONObject().apply {
            put("architectureFreeze", true)
            put("manifestAudit", findingsArray(manifest))
            put("manifestRisks", findingsArray(riskOnly(manifest)))
            put("intentSecurity", findingsArray(intent))
            put("overlaySecurity", findingsArray(overlay))
            put("privacyReport", findingsArray(privacy))
            put("releaseChecklist", findingsArray(release))
            put("storeReadiness", findingsArray(store))
            put("allFindings", findingsArray(all))
            put("riskFindings", findingsArray(risks))
            put(
                "summary",
                JSONObject().apply {
                    put("total", all.size)
                    put("risk", all.count { it.severity == AuditSeverity.RISK })
                    put("review", all.count { it.severity == AuditSeverity.REVIEW })
                    put("ok", all.count { it.severity == AuditSeverity.OK })
                    put("info", all.count { it.severity == AuditSeverity.INFO })
                }
            )
        }
    }

    /**
     * 앱에 내장된 최신 Manifest 스냅샷 기준 보고서 (문서·Admin용).
     * 실기 파일 I/O 없이 카탈로그화한 현재 위험 항목.
     */
    fun builtInReleaseCandidateReport(): JSONObject {
        val manifestSnapshot = BUILTIN_MANIFEST_SNAPSHOT
        val intentSnap = listOf(
            "PendingIntent.FLAG_IMMUTABLE",
            "PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE"
        )
        val privacySnap = listOf(
            "phoneMasked",
            "maskPhone",
            "ReleaseDebugGate.maskPhoneForLog",
            "ReleaseDebugGate.d(",
            "allowDiagProbe"
        )
        val releaseSnap = listOf(
            "ReleaseDebugGate",
            "TODO",
            "NORMAL_OVERLAY_PROBE",
            "CompanionMvpConfig"
        )
        return buildReport(manifestSnapshot, intentSnap, privacySnap, releaseSnap)
    }

    private fun findingsArray(list: List<AuditFinding>): JSONArray =
        JSONArray().also { arr -> list.forEach { arr.put(it.toJson()) } }

    /**
     * AndroidManifest.xml 핵심 발췌 — Audit 재현용 (Architecture 변경 없음).
     * RC-2: QUERY_ALL 제거 · usesCleartextTraffic=false · <queries> 패키지 목록.
     */
    const val BUILTIN_MANIFEST_SNAPSHOT: String = """
        <uses-permission android:name="android.permission.CAMERA" />
        <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
        <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
        <uses-permission android:name="android.permission.FOREGROUND_SERVICE_SPECIAL_USE" />
        <uses-permission android:name="android.permission.SYSTEM_ALERT_WINDOW" />
        <queries>
            <package android:name="com.teamviewer.teamviewer.market.mobile" />
            <package android:name="com.anydesk.anydeskandroid" />
        </queries>
        <application android:allowBackup="true" android:usesCleartextTraffic="false">
        <activity android:name=".MainActivity" android:exported="true" />
        <activity android:name=".incall.DialerTrampolineActivity" android:exported="true" />
        <activity android:name=".ShareReceiverActivity" android:exported="true" />
        <service android:name=".CallOverlayService" android:exported="false"
            android:foregroundServiceType="specialUse|dataSync" />
        <service android:name=".incall.VlueInCallService" android:exported="true"
            android:permission="android.permission.BIND_INCALL_SERVICE" />
        <service android:name=".family.bank.FamilyBankNotificationListener" android:exported="true"
            android:permission="android.permission.BIND_NOTIFICATION_LISTENER_SERVICE" />
        <receiver android:name=".LetteringCallReceiver" android:exported="true">
            <intent-filter><action android:name="android.intent.action.PHONE_STATE" /></intent-filter>
        </receiver>
        <receiver android:name=".OutgoingCallReceiver" android:exported="true" />
        <receiver android:name=".LetteringBootReceiver" android:exported="true" />
        </application>
    """
}
