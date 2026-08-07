package kr.vlue.calloverlay.diagnostics.release

import org.json.JSONArray
import org.json.JSONObject

/**
 * Phase 6-B Release Candidate Checklist — RC-2 Store 제출 준비.
 * Architecture Freeze: Engine State/Controller/Window 변경 없음.
 */
object CompanionReleaseCandidateChecklist {
    const val ARCHITECTURE_VERSION = "companion-overlay-B-single-window-event-driven"
    const val STATE_VERSION = "OverlayState-IDLE-BIG_PUSH-SHOWCASE-MINI_CASE"
    const val OVERLAY_ENGINE_VERSION = "RC-2"
    const val APP_VERSION_NAME = "1.0.0-rc2"
    const val DOC_PATH = "docs/release/release-candidate-v2.md"

    enum class GateStatus {
        PASS,
        CONDITIONAL,
        FAIL
    }

    data class ChecklistItem(
        val id: String,
        val title: String,
        val status: GateStatus,
        val note: String
    )

    data class DeprecatedCandidate(
        val id: String,
        val symbol: String,
        val location: String,
        val kind: String,
        val note: String
    )

    data class OpenRisk(
        val id: String,
        val title: String,
        val severity: String,
        val mitigation: String
    )

    val checklist: List<ChecklistItem> = listOf(
        ChecklistItem(
            "ARCH_FREEZE",
            "Architecture Freeze 확인",
            GateStatus.PASS,
            "State/Controller/Window/Diagnostics structure frozen"
        ),
        ChecklistItem(
            "DIAGNOSTICS_ACTIVE",
            "Diagnostics 활성 여부",
            GateStatus.PASS,
            "Observation-only diagnostics active"
        ),
        ChecklistItem(
            "DEBUG_HOOK",
            "Debug Hook 제거 여부",
            GateStatus.PASS,
            "NORMAL_OVERLAY_PROBE gated by ReleaseDebugGate.allowDiagProbe (DEBUG only)"
        ),
        ChecklistItem(
            "DEPRECATED_CLEANUP",
            "Deprecated API 정리 여부",
            GateStatus.PASS,
            "Candidates catalogued only — no auto-delete"
        ),
        ChecklistItem(
            "MANIFEST_AUDIT",
            "Manifest Audit 확인",
            GateStatus.PASS,
            "QUERY_ALL removed; usesCleartextTraffic=false; <queries> for known packages"
        ),
        ChecklistItem(
            "SECURITY_AUDIT",
            "Security Audit 확인",
            GateStatus.PASS,
            "Phase 5-D audit + RC-2 blocker fixes"
        ),
        ChecklistItem(
            "PRIVACY_AUDIT",
            "Privacy Audit 확인",
            GateStatus.PASS,
            "Trace/Log phone masked via ReleaseDebugGate.maskPhoneForLog"
        ),
        ChecklistItem(
            "PERFORMANCE_KPI",
            "Performance KPI 확인",
            GateStatus.PASS,
            "Attach<200ms Answer→Showcase<500ms Window<=1"
        ),
        ChecklistItem(
            "RECOVERY_PASS",
            "Recovery PASS 확인",
            GateStatus.PASS,
            "Phase 5-C cases 1-7"
        ),
        ChecklistItem(
            "OEM_AUDIT_PASS",
            "OEM Audit PASS 확인",
            GateStatus.PASS,
            "Phase 5-A Samsung/OEM catalog + audit"
        )
    )

    val deprecatedCandidates: List<DeprecatedCandidate> = listOf(
        DeprecatedCandidate(
            "DEP_CARD_LOOKUP_BRIDGE",
            "CardLookupBridge",
            "CardLookupBridge.kt",
            "Deprecated Wrapper",
            "Use LetteringCallCoordinator.onRinging"
        ),
        DeprecatedCandidate(
            "DEP_DIAG_ELAPSED",
            "DiagnosticsSessionStore deprecated elapsed",
            "DiagnosticsSessionStore.kt",
            "Deprecated API",
            "Use elapsedRealtimeSinceStart"
        ),
        DeprecatedCandidate(
            "DEP_PERMISSION_HELPER_ALIAS",
            "LetteringPermissionHelper name-compat",
            "LetteringPermissionHelper.kt",
            "Legacy Helper",
            "Compat alias"
        ),
        DeprecatedCandidate(
            "DEP_COMPACT_LAYOUT_PARAMS",
            "buildCompactOverlayLayoutParams",
            "CallOverlayService.kt",
            "Deprecated Wrapper",
            "Probe compat — use buildBigPushLayoutParams"
        ),
        DeprecatedCandidate(
            "DBG_NORMAL_OVERLAY_PROBE",
            "ACTION_NORMAL_OVERLAY_PROBE / NormalOverlayProbe",
            "CallOverlayService / NormalOverlayProbe",
            "Debug Hook",
            "Release gated — DEBUG only"
        ),
        DeprecatedCandidate(
            "LEGACY_ENDED_KEEP",
            "ACTION_ENDED_KEEP Advanced path",
            "CallOverlayService / CompanionMvpConfig",
            "Legacy Path",
            "MVP DELEGATE_CALL_UI=true dismisses"
        ),
        DeprecatedCandidate(
            "LEGACY_OUTGOING_RECEIVER",
            "OutgoingCallReceiver NEW_OUTGOING_CALL",
            "AndroidManifest / OutgoingCallReceiver",
            "Legacy API",
            "Platform deprecated broadcast"
        )
    )

    /** RC-2: Store blockers R1–R3 closed. Remaining are post-submit / ops risks. */
    val openRisks: List<OpenRisk> = listOf(
        OpenRisk("R1", "Samsung Overlay policy (2038 deny)", "High", "OEM_RESTRICTED diag; store install preferred; no retry/dual window"),
        OpenRisk("R2", "allowBackup=true", "Medium", "Backup rules review before wide release"),
        OpenRisk("R3", "OEM variance (Xiaomi etc.)", "Medium", "OEM catalog + device Final QA"),
        OpenRisk("R4", "FGS specialUse store declaration", "Medium", "Play Console notice required"),
        OpenRisk("R5", "CAMERA/LOCATION permission scope", "Medium", "Disclose / minimize in listing"),
        OpenRisk("R6", "Release signing keystore", "Medium", "Replace debug fallback with production keystore.properties"),
        OpenRisk("R7", "WebView bridge phone to JS", "Low", "Functional contact data — not logcat; policy disclose")
    )

    val knownLimitations: List<String> = listOf(
        "No separate INCOMING OverlayState — IDLE until BigPush/Answer",
        "Keypad close does not auto-restore SHOWCASE — needs onRestoreShowcase",
        "BigPush is optional; Answer independent of BigPush lifecycle",
        "Diagnostics observe only — no recovery retry/delay",
        "WebView ready does not gate Showcase display",
        "OEM call-time overlay denies vary by device/installer",
        "Cleartext permitted only for localhost/10.0.2.2 via network_security_config (debug)"
    )

    val resolvedBlockers: List<String> = listOf(
        "R1 QUERY_ALL_PACKAGES removed — <queries> + known packages",
        "R2 usesCleartextTraffic=false — HTTPS default; debug localhost exception in NSC",
        "R3 Trace/Log phone masked; Log.d/Probe gated for Release"
    )

    fun validate(): JSONObject {
        val requiredIds = listOf(
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
        )
        val ids = checklist.map { it.id }.toSet()
        val missing = requiredIds.filter { it !in ids }
        val hardFail = checklist.any { it.status == GateStatus.FAIL }
        val engineGo =
            !hardFail &&
                checklist.filter {
                    it.id in setOf(
                        "ARCH_FREEZE",
                        "PERFORMANCE_KPI",
                        "RECOVERY_PASS",
                        "OEM_AUDIT_PASS",
                        "MANIFEST_AUDIT",
                        "SECURITY_AUDIT"
                    )
                }.all { it.status == GateStatus.PASS || it.status == GateStatus.CONDITIONAL }
        val storeBlockersClosed =
            checklist.filter {
                it.id in setOf("DEBUG_HOOK", "PRIVACY_AUDIT", "MANIFEST_AUDIT")
            }.all { it.status == GateStatus.PASS }
        val storeGo = engineGo && storeBlockersClosed && !hardFail
        return JSONObject().apply {
            put("architectureVersion", ARCHITECTURE_VERSION)
            put("stateVersion", STATE_VERSION)
            put("overlayEngineVersion", OVERLAY_ENGINE_VERSION)
            put("appVersionName", APP_VERSION_NAME)
            put("docPath", DOC_PATH)
            put("architectureFreeze", true)
            put("checklistComplete", missing.isEmpty())
            put("missingChecklistIds", JSONArray(missing))
            put("hardFail", hardFail)
            put("engineGo", engineGo)
            put("storeGo", storeGo)
            put("storeBlockersClosed", storeBlockersClosed)
            put(
                "goNoGo",
                when {
                    engineGo && storeGo -> "GO"
                    engineGo -> "ENGINE_GO_STORE_NO_GO"
                    else -> "NO_GO"
                }
            )
            put("resolvedBlockers", JSONArray(resolvedBlockers))
            put(
                "checklist",
                JSONArray().also { arr ->
                    checklist.forEach { item ->
                        arr.put(
                            JSONObject()
                                .put("id", item.id)
                                .put("title", item.title)
                                .put("status", item.status.name)
                                .put("note", item.note)
                        )
                    }
                }
            )
            put(
                "deprecatedCandidates",
                JSONArray().also { arr ->
                    deprecatedCandidates.forEach { d ->
                        arr.put(
                            JSONObject()
                                .put("id", d.id)
                                .put("symbol", d.symbol)
                                .put("location", d.location)
                                .put("kind", d.kind)
                                .put("note", d.note)
                        )
                    }
                }
            )
            put(
                "openRisks",
                JSONArray().also { arr ->
                    openRisks.forEach { r ->
                        arr.put(
                            JSONObject()
                                .put("id", r.id)
                                .put("title", r.title)
                                .put("severity", r.severity)
                                .put("mitigation", r.mitigation)
                        )
                    }
                }
            )
            put("knownLimitations", JSONArray(knownLimitations))
            put("deprecatedAutoDeleteForbidden", true)
        }
    }
}
