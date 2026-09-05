package kr.vlue.calloverlay

import android.content.Context
import android.content.Intent
import android.os.SystemClock
import android.util.Log
import java.util.concurrent.atomic.AtomicLong
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kr.vlue.calloverlay.dcp.CallPathLookupMerge
import kr.vlue.calloverlay.dcp.CallPathSession
import kr.vlue.calloverlay.dcp.CallPathVerdict
import kr.vlue.calloverlay.dcp.ContactSafeCarePayload
import kr.vlue.calloverlay.dcp.DcpLookupPayload
import kr.vlue.calloverlay.dcp.NationalAgencyWhitelist
import kr.vlue.calloverlay.diagnostics.CompanionBigPushDiag
import kr.vlue.calloverlay.diagnostics.CompanionRuntimeStabilityDiag
import kr.vlue.calloverlay.diagnostics.DiagnosticsSessionStore
import kr.vlue.calloverlay.diagnostics.OverlayDiagTracker
import kr.vlue.calloverlay.diagnostics.OverlayFailureReason
import kr.vlue.calloverlay.diagnostics.ReleaseDebugGate

/**
 * 통화 이벤트 → Overlay 즉시 기동 → (이후) 번호/회원 enrich.
 * Phase 6-H: CallLog/lookup 이 startOverlayService 를 블로킹하지 않는다.
 */
object LetteringCallCoordinator {
    private const val TAG = "LetteringCoordinator"
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)

    @Volatile
    private var lastRingAt = 0L

    @Volatile
    private var lastRingNumber: String = ""

    @Volatile
    private var lastOutgoing: Boolean = false

    /** onRinging ~ 오버레이 attach 전 홈 미리보기 숨김용 */
    @Volatile
    private var incomingRingingActive: Boolean = false

    fun isIncomingRingingActive(): Boolean = incomingRingingActive

    /** CallLog 업그레이드·enrich 가 다음 통화를 덮지 못하게 세대 번호 */
    private val callGen = AtomicLong(0L)

    /** 홈 화면 정상/비정상 테스트 — 실제 통화·전체 오버레이 없이 팝업만 */
    fun onDcpPathTest(context: Context, abnormal: Boolean) {
        lastRingAt = 0L
        lastRingNumber = ""
        callGen.incrementAndGet()
        CallPathSession.armMock(abnormal)
        LetteringPrefs.setLetteringEnabled(context, true)
        val app = context.applicationContext
        val agency = NationalAgencyWhitelist.match("112") ?: return
        val verdict = CallPathSession.consumeOrVerify(app)
        val json = DcpLookupPayload.toJson(agency, verdict)
        if (!LetteringPermissionHelper.canDrawOverlays(app)) {
            Log.w(TAG, "DCP popup test skipped — overlay permission missing")
            return
        }
        val intent = Intent(app, CallOverlayService::class.java).apply {
            action = CallOverlayService.ACTION_DCP_TEST_POPUP
            putExtra(CallOverlayService.EXTRA_PHONE, agency.shortNumber)
            putExtra(CallOverlayService.EXTRA_VERIFIED, true)
            putExtra(CallOverlayService.EXTRA_CARD_JSON, json)
            putExtra(CallOverlayService.EXTRA_DCP_ROUTE, verdict.routeQuery)
        }
        app.startForegroundService(intent)
    }

    fun onRinging(context: Context, number: String?, outgoing: Boolean = false) {
        try {
            val app = context.applicationContext
            if (!LetteringPrefs.isLetteringEnabled(app)) {
                VlueBigPushTrace.skip(1, "lettering_enabled=false (coordinator)")
                Log.w(TAG, "skip ringing: lettering_enabled=false")
                LetteringPrefs.setLastOverlayError(app, "lettering_enabled=false")
                return
            }

            /*
             * Phase 6-H: CallLog ContentResolver 동기 조회를 여기서 하지 않는다.
             * (Samsung 수신 직후 CallLog 가 수 초 블로킹 → Incoming→startOverlay ~3s)
             * 번호는 extras 만 즉시 사용하고, 미지정이면 unknown 으로 Overlay 먼저 띄운다.
             */
            val resolved = number?.trim().orEmpty()
            val nextUnknown = IncomingNumberResolver.isUnknown(resolved)

            val now = System.currentTimeMillis()
            val prevUnknown = IncomingNumberResolver.isUnknown(lastRingNumber)
            val sameNumber =
                IncomingNumberResolver.sameCanonicalNumber(resolved, lastRingNumber)
            val isUpgrade = prevUnknown && !nextUnknown && now - lastRingAt < 3_000L
            val isDuplicate =
                !isUpgrade &&
                    now - lastRingAt < 800L &&
                    lastOutgoing == outgoing &&
                    (sameNumber || (nextUnknown && prevUnknown))

            if (isDuplicate) {
                VlueBigPushTrace.skip(
                    3,
                    "debounce — last=$lastRingNumber next=$resolved out=$outgoing within 800ms"
                )
                ReleaseDebugGate.d(TAG, "skip ringing: debounce last=$lastRingNumber next=$resolved")
                return
            }

            /*
             * TelephonyCallback / OFFHOOK 은 번호를 안 준다.
             * 이미 아는 번호를 unknown 으로 덮으면 오버레이가 「신원 확인 중」에 멈춘다.
             * 같은 발신/수신 방향의 같은 통화에만 유지 — 바로 다음 발신의 unknown OFFHOOK 이
             * 직전 070 을 붙잡고 있으면 010 통화에 070 이 남는다.
             */
            if (nextUnknown && !prevUnknown && lastOutgoing == outgoing && now - lastRingAt < 30_000L) {
                VlueBigPushTrace.skip(
                    3,
                    "keep known number — ignore unknown RINGING/OFFHOOK last=$lastRingNumber"
                )
                Log.i(TAG, "skip ringing: keep known ${ReleaseDebugGate.maskPhoneForLog(lastRingNumber)}")
                val keepNumber = lastRingNumber
                val keepStartedAt = lastRingAt
                val keepOut = outgoing
                scope.launch {
                    detectSuccessorOutgoingNumber(app, keepNumber, keepStartedAt, keepOut)
                }
                return
            }

            if (!nextUnknown && !prevUnknown && !sameNumber) {
                callGen.incrementAndGet()
            }

            lastRingAt = now
            lastRingNumber = if (nextUnknown) "unknown" else resolved
            lastOutgoing = outgoing
            incomingRingingActive = true
            val gen = callGen.get()

            val raw = if (nextUnknown) "unknown" else resolved
            LetteringPrefs.setLastCallEvent(app, "ringing:$raw:out=$outgoing")

            /*
             * 수신 체감 지연: CallPathSession.verify(센서·패키지 스캔) 를 Overlay 앞에 두면
             * 발신보다 BigPush 가 늦게 뜬다. 캐시/pending 으로 창을 먼저 붙이고
             * 경로검증·API 는 백그라운드에서 올린다 (인터넷 대기 ≠ 창 대기).
             */
            val agency = if (nextUnknown) null else NationalAgencyWhitelist.match(raw)
            val cachedMember =
                if (agency == null && !nextUnknown) CardLookupRepository.peekCached(app, raw) else null
            val cachedJson = cachedMember?.rawJson?.let { OverlayCardOrgFill.applyLocalDefaults(it) }
            val overlayJsonFast =
                cachedJson
                    ?: OverlayCardOrgFill.seedIfPlatformCeoPhone(raw)
                    ?: if (!nextUnknown) lookupPendingJson(raw) else null
            val overlayNumber = agency?.shortNumber ?: raw
            val hasMemberSeed =
                agency != null ||
                    cachedMember?.matched == true ||
                    cachedMember?.verified == true ||
                    OverlayCardOrgFill.seedIfPlatformCeoPhone(raw) != null

            val canDraw = LetteringPermissionHelper.canDrawOverlays(app)
            if (canDraw) {
                startOverlayService(
                    app,
                    overlayNumber,
                    verified = hasMemberSeed,
                    cardJson = overlayJsonFast,
                    outgoing = outgoing,
                    dcpRoute = ""
                )
            } else {
                val restrictHint =
                    if (LetteringPermissionHelper.isLikelySamsungCallOverlayRestricted(app)) {
                        "SAMSUNG_SIDELOAD_CALL_RESTRICT installer=${LetteringPermissionHelper.installerPackage(app)} " +
                            "appOps=${LetteringPermissionHelper.overlayAppOpsModeName(app)} — " +
                            "My Files APK 가 아닌 adb install / Play·Galaxy Store 설치 필요"
                    } else {
                        "SYSTEM_ALERT_WINDOW missing appOps=${LetteringPermissionHelper.overlayAppOpsModeName(app)}"
                    }
                OverlayDiagTracker.recordOverlayFailure(
                    OverlayFailureReason.PERMISSION_DENIED,
                    phase = "BIG_PUSH",
                    detail = restrictHint
                )
                VlueBigPushTrace.skip(3, "Overlay permission denied ($restrictHint)")
                Log.w(TAG, "overlay permission missing — $restrictHint")
                LetteringPrefs.setLastOverlayError(app, restrictHint)
            }

            /* 경로검증·회원조회 — Overlay 기동 이후 (수신 첫 페인트와 병렬) */
            if (agency != null) {
                scope.launch(Dispatchers.Default) {
                    val dcpVerdict = CallPathSession.consumeOrVerify(app)
                    if (dcpVerdict.isAbnormal && outgoing) {
                        launch(Dispatchers.IO) {
                            CardLookupRepository.reportOutgoingCallPath(app, dcpVerdict.reasons)
                        }
                    }
                    Log.i(
                        TAG,
                        "path-verify ${ReleaseDebugGate.maskPhoneForLog(overlayNumber)} " +
                            "route=${dcpVerdict.routeQuery} reasons=${dcpVerdict.reasons} mock=${dcpVerdict.fromMock}"
                    )
                    enrichDcpLookup(app, agency, dcpVerdict, outgoing)
                }
            } else if (nextUnknown) {
                val startedAt = lastRingAt
            scope.launch {
                    upgradeNumberAfterOverlay(app, outgoing, gen, startedAt)
                }
            } else {
                scope.launch(Dispatchers.Default) {
                    val dcpVerdict = CallPathSession.consumeOrVerify(app)
                    if (dcpVerdict.isAbnormal) {
                        if (outgoing) {
                            launch(Dispatchers.IO) {
                                CardLookupRepository.reportOutgoingCallPath(app, dcpVerdict.reasons)
                            }
                        }
                        val placeholder =
                            CallPathLookupMerge.placeholderJson(raw, dcpVerdict, outgoing)
                        val mergedCached =
                            cachedJson?.let {
                                CallPathLookupMerge.merge(it, dcpVerdict, outgoing).json
                            }
                        if (canDraw) {
                            withContext(Dispatchers.Main.immediate) {
                                CallOverlayService.updateCallInfo(
                                    app,
                                    overlayNumber,
                                    verified = hasMemberSeed,
                                    cardJson = mergedCached ?: placeholder,
                                    outgoing = outgoing,
                                    dcpRoute = "abnormal"
                                )
                            }
                        }
                        Log.i(
                            TAG,
                            "path-verify abnormal ${ReleaseDebugGate.maskPhoneForLog(raw)} " +
                                "reasons=${dcpVerdict.reasons}"
                        )
                    }
                    enrichWithLookup(app, raw, outgoing)
                }
            }

            /* 2) 세션/게이트 기록 — Overlay 시작 이후 (임계 경로 밖) */
            DiagnosticsSessionStore.updatePhoneMasked(raw)
            CompanionBigPushDiag.noteIncomingReceived(
                source = if (outgoing) "onRinging_outgoing" else "onRinging_incoming"
            )
            if (!CompanionRuntimeStabilityDiag.isCallSessionActive()) {
                CompanionRuntimeStabilityDiag.beginCallSession(
                    if (outgoing) "onRinging_outgoing" else "onRinging_incoming"
                )
            }
            CompanionRuntimeStabilityDiag.mark(
                "INCOMING_RECEIVED",
                if (outgoing) "onRinging_outgoing" else "onRinging_incoming"
            )
            CompanionBigPushDiag.noteOverlayPermissionCheck(
                context = app,
                source = CompanionBigPushDiag.SOURCE_INCOMING_GATE,
                canDrawOverlays = canDraw,
                callPhase = if (outgoing) "OUTGOING" else "RINGING",
                requestedWindowType = android.view.WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
            )

            /* 3) HUN — 오버레이 불가할 때만. BigPush 보이면 가리지 않음 */
            if (canDraw) {
                LetteringIncomingNotifier.cancel(app)
            } else {
                LetteringIncomingNotifier.post(app, raw, outgoing, forceFallback = true)
            }

        } catch (e: Exception) {
            Log.e(TAG, "onRinging failed", e)
            LetteringPrefs.setLastOverlayError(context, "onRinging:${e.message}")
        }
    }

    /** CallLog 조회는 IO — Overlay 시작을 막지 않는다 */
    private suspend fun upgradeNumberAfterOverlay(
        app: Context,
        outgoing: Boolean,
        gen: Long,
        callStartedAt: Long
    ) {
        if (callGen.get() != gen) return
        val fromLog = withContext(Dispatchers.IO) {
            IncomingNumberResolver.resolveRecentNumber(
                app,
                outgoing,
                minDateMs = callLogMinDate(callStartedAt)
            )
        }
        if (applyCallLogUpgradeIfCurrent(app, outgoing, gen, fromLog)) return
        retryResolveUnknown(app, outgoing, gen, callStartedAt)
    }

    private suspend fun retryResolveUnknown(
        app: Context,
        outgoing: Boolean,
        gen: Long,
        callStartedAt: Long
    ) {
        repeat(8) { attempt ->
            delay(if (attempt == 0) 120L else 280L + attempt * 220L)
            if (callGen.get() != gen) return
            val n = withContext(Dispatchers.IO) {
                IncomingNumberResolver.resolveRecentNumber(
                    app,
                    outgoing,
                    minDateMs = callLogMinDate(callStartedAt)
                )
            } ?: return@repeat
            if (applyCallLogUpgradeIfCurrent(app, outgoing, gen, n)) return
        }
        Log.w(TAG, "number still unknown after CallLog retries")
        LetteringPrefs.setLastOverlayError(app, "number_unknown_after_retry")
    }

    /**
     * IDLE 누락 후 바로 다음 발신: unknown OFFHOOK 은 직전 번호를 유지한다.
     * 그 사이 CallLog 에 다른 번호가 생기면 이번 통화로 교체한다.
     */
    private suspend fun detectSuccessorOutgoingNumber(
        app: Context,
        keptNumber: String,
        keptStartedAt: Long,
        outgoing: Boolean
    ) {
        repeat(6) { attempt ->
            if (attempt > 0) delay(400L + attempt * 300L)
            if (!IncomingNumberResolver.sameCanonicalNumber(lastRingNumber, keptNumber)) return
            val n = withContext(Dispatchers.IO) {
                IncomingNumberResolver.resolveRecentNumber(
                    app,
                    outgoing,
                    minDateMs = keptStartedAt + 400L
                )
            } ?: return@repeat
            if (IncomingNumberResolver.isUnknown(n)) return@repeat
            if (IncomingNumberResolver.sameCanonicalNumber(n, keptNumber)) return@repeat
            Log.i(
                TAG,
                "successor call ${ReleaseDebugGate.maskPhoneForLog(n)} replaces ${ReleaseDebugGate.maskPhoneForLog(keptNumber)}"
            )
            onRinging(app, n, outgoing)
            return
        }
    }

    /**
     * unknown 오버레이만 CallLog 로 채운다.
     * 이미 다른 실번호(010)가 있으면 직전 070 CallLog 로 덮지 않는다.
     */
    private suspend fun applyCallLogUpgradeIfCurrent(
        app: Context,
        outgoing: Boolean,
        gen: Long,
        fromLog: String?
    ): Boolean {
        if (callGen.get() != gen) return true
        if (IncomingNumberResolver.isUnknown(fromLog)) return false
        val n = fromLog!!
        val current = lastRingNumber
        if (!IncomingNumberResolver.isUnknown(current) &&
            !IncomingNumberResolver.sameCanonicalNumber(current, n)
        ) {
            Log.i(
                TAG,
                "skip CallLog ${ReleaseDebugGate.maskPhoneForLog(n)} — overlay already ${ReleaseDebugGate.maskPhoneForLog(current)}"
            )
            return true
        }
        Log.i(TAG, "upgrade unknown → ${ReleaseDebugGate.maskPhoneForLog(n)} (CallLog)")
        lastRingNumber = n
        lastRingAt = System.currentTimeMillis()
        LetteringPrefs.setLastCallEvent(app, "ringing_upgrade:$n:out=$outgoing")
        if (applyWhitelistPathIfMatched(app, n, outgoing)) return true
        if (LetteringPermissionHelper.canDrawOverlays(app)) {
            CallOverlayService.updateCallInfo(app, n, verified = false, cardJson = null, outgoing)
            LetteringIncomingNotifier.cancel(app)
        } else {
            LetteringIncomingNotifier.post(app, n, outgoing, forceFallback = true)
        }
        enrichWithLookup(app, n, outgoing)
        return true
    }

    private fun callLogMinDate(callStartedAt: Long): Long =
        (callStartedAt - 1_500L).coerceAtLeast(0L)

    private suspend fun enrichWithLookup(app: Context, raw: String, outgoing: Boolean) {
        if (applyWhitelistPathIfMatched(app, raw, outgoing)) return
        val masked = ReleaseDebugGate.maskPhoneForLog(raw)
        val started = SystemClock.elapsedRealtime()
        CompanionRuntimeStabilityDiag.noteMemberLookup(
            phase = "PHONE_RECEIVED",
            maskedPhone = masked,
            dataSource = "coordinator"
        )
        val normalized = CardLookupBridge.normalizeKr(raw)
        CompanionRuntimeStabilityDiag.noteMemberLookup(
            phase = "PHONE_NORMALIZED",
            maskedPhone = masked,
            normalizedOk = normalized != null,
            dataSource = "CardLookupBridge.normalizeKr"
        )
        CompanionRuntimeStabilityDiag.noteMemberLookup(
            phase = "LOOKUP_STARTED",
            maskedPhone = masked,
            dataSource = "CardLookupRepository"
        )
        try {
            var lookup = CardLookupRepository.lookup(app, raw)
            /* 네트워크 null(타임아웃) — 느린 재시도. matched:false 는 확정 */
            if (lookup == null) {
                delay(180L)
                lookup = CardLookupRepository.lookupSlow(app, raw)
            }
            val elapsed = (SystemClock.elapsedRealtime() - started).coerceAtLeast(0L)
            if (lookup == null) {
                CompanionRuntimeStabilityDiag.noteMemberLookup(
                    phase = "LOOKUP_COMPLETED",
                    maskedPhone = masked,
                    lookupElapsedMs = elapsed,
                    matched = false,
                    dataSource = "api_timeout",
                    normalizedOk = normalized != null
                )
                Log.w(TAG, "lookup timeout for $masked — try contact safe-care then keep pending")
                LetteringPrefs.setLastOverlayError(app, "lookup_timeout:$masked")
                if (applyContactSafeCareIfSaved(app, raw, outgoing)) return
                return
            }
            if (!lookup.matched) {
                CompanionRuntimeStabilityDiag.noteMemberLookup(
                    phase = "LOOKUP_COMPLETED",
                    maskedPhone = masked,
                    lookupElapsedMs = elapsed,
                    matched = false,
                    dataSource = "api",
                    normalizedOk = normalized != null
                )
                Log.w(TAG, "lookup unmatched for $masked")
                LetteringPrefs.setLastOverlayError(app, "lookup_unmatched:$masked")
                val cachedPositive = CardLookupRepository.peekCached(app, raw)
                if (cachedPositive != null && cachedPositive.matched) {
                    val mergedCached = CallPathLookupMerge.merge(
                        cachedPositive.rawJson,
                        CallPathSession.lastVerdict,
                        outgoing
                    )
                    if (LetteringPermissionHelper.canDrawOverlays(app)) {
                        CallOverlayService.updateCallInfo(
                            app,
                            raw,
                            verified = cachedPositive.verified,
                            cardJson = mergedCached.json,
                            outgoing = outgoing,
                            dcpRoute = mergedCached.route
                        )
                    }
                    return
                }
                if (applyContactSafeCareIfSaved(app, raw, outgoing)) return
                val merged = CallPathLookupMerge.merge(
                    lookup.rawJson,
                    CallPathSession.lastVerdict,
                    outgoing
                )
                /* 경로 비정상만 즉시 반영. 일반 unmatched 는 lookup_pending 유지 —
                 * 웹 by-number 가 회원 카드를 살릴 때까지 미인증「VLUE Showcase」금지 */
                if (merged.route == "abnormal") {
                    if (LetteringPermissionHelper.canDrawOverlays(app)) {
                        CallOverlayService.updateCallInfo(
                            app,
                            raw,
                            verified = false,
                            cardJson = merged.json,
                            outgoing = outgoing,
                            dcpRoute = merged.route
                        )
                        LetteringIncomingNotifier.cancel(app)
                    }
                } else {
                    Log.i(TAG, "lookup unmatched — keep lookup_pending for web by-number ($masked)")
                }
                return
            }
            CompanionRuntimeStabilityDiag.noteMemberLookup(
                phase = "LOOKUP_MATCHED",
                maskedPhone = masked,
                lookupElapsedMs = elapsed,
                matched = true,
                dataSource = "api",
                normalizedOk = normalized != null
            )
            CompanionRuntimeStabilityDiag.noteMemberLookup(
                phase = "CARD_DATA_READY",
                maskedPhone = masked,
                lookupElapsedMs = elapsed,
                matched = true,
                dataSource = "api"
            )
            if (!IncomingNumberResolver.sameCanonicalNumber(lastRingNumber, raw)) {
                CompanionRuntimeStabilityDiag.noteStaleEvent(
                    "LOOKUP_UPDATE_STALE_NUMBER",
                    "enrichWithLookup",
                    detail = "drop=${ReleaseDebugGate.maskPhoneForLog(raw)} current=${ReleaseDebugGate.maskPhoneForLog(lastRingNumber)}"
                )
                Log.i(
                    TAG,
                    "drop stale lookup ${ReleaseDebugGate.maskPhoneForLog(raw)} current=${ReleaseDebugGate.maskPhoneForLog(lastRingNumber)}"
                )
                return
            }
            if (!CompanionRuntimeStabilityDiag.isCallSessionActive() &&
                CompanionRuntimeStabilityDiag.shouldIgnorePostEndOverlayStart()
            ) {
                CompanionRuntimeStabilityDiag.noteStaleEvent(
                    "LOOKUP_UPDATE_AFTER_CALL_END",
                    "enrichWithLookup",
                    detail = "matched=true but session ended"
                )
                return
            }
            val label = lookup.displayName.ifBlank { raw }
            val merged = CallPathLookupMerge.merge(
                lookup.rawJson,
                CallPathSession.lastVerdict,
                outgoing
            )
            if (LetteringPermissionHelper.canDrawOverlays(app)) {
                CallOverlayService.updateCallInfo(
                    app,
                    raw,
                    verified = lookup.verified,
                    cardJson = merged.json,
                    outgoing = outgoing,
                    dcpRoute = merged.route
                )
                LetteringIncomingNotifier.cancel(app)
            } else {
                LetteringIncomingNotifier.post(
                    app,
                    raw,
                    outgoing,
                    displayName = label,
                    forceFallback = true
                )
            }
        } catch (e: Exception) {
            Log.e(TAG, "lookup failed after overlay start", e)
            LetteringPrefs.setLastOverlayError(app, "lookup_error:${e.message}")
            CompanionRuntimeStabilityDiag.noteMemberLookup(
                phase = "LOOKUP_COMPLETED",
                maskedPhone = masked,
                lookupElapsedMs = (SystemClock.elapsedRealtime() - started).coerceAtLeast(0L),
                matched = false,
                dataSource = "error:${e.javaClass.simpleName}"
            )
            if (applyContactSafeCareIfSaved(app, raw, outgoing)) return
            /* 예외 시에도 unmatched 미인증 페인트 금지 — pending 유지, 웹 조회에 맡김 */
            Log.w(TAG, "lookup error — keep lookup_pending ($masked)")
        }
    }

    private fun unmatchedLookupJson(raw: String): String =
        org.json.JSONObject()
            .put("matched", false)
            .put("is_verified", false)
            .put("phoneE164", raw)
            .put("profileKind", "")
            .toString()

    /** 조회 완료 전 — 미인증 앰버 UI 깜빡임 방지 */
    private fun lookupPendingJson(raw: String): String =
        org.json.JSONObject()
            .put("matched", false)
            .put("is_verified", false)
            .put("phoneE164", raw)
            .put("profileKind", "lookup_pending")
            .put("displayName", "")
            .put("name", "")
            .toString()

    private fun applyContactSafeCareIfSaved(app: Context, raw: String, outgoing: Boolean): Boolean {
        val contactName = DeviceContactsReader.findDisplayName(app, raw) ?: return false
        if (contactName.isBlank()) return false
        val verdict = CallPathSession.lastVerdict ?: CallPathSession.consumeOrVerify(app)
        val json = ContactSafeCarePayload.toJson(raw, contactName, verdict)
        Log.i(
            TAG,
            "contact safe-care ${ReleaseDebugGate.maskPhoneForLog(raw)} name=$contactName route=${verdict.routeQuery}"
        )
        if (LetteringPermissionHelper.canDrawOverlays(app)) {
            CallOverlayService.updateCallInfo(
                app,
                raw,
                verified = false,
                cardJson = json,
                outgoing = outgoing,
                dcpRoute = verdict.routeQuery
            )
            LetteringIncomingNotifier.cancel(app)
        } else {
            LetteringIncomingNotifier.post(app, raw, outgoing, displayName = contactName)
        }
        return true
    }

    private fun applyWhitelistPathIfMatched(app: Context, number: String, outgoing: Boolean): Boolean {
        val agency = NationalAgencyWhitelist.match(number) ?: return false
        val verdict = CallPathSession.consumeOrVerify(app)
        val json = DcpLookupPayload.toJson(agency, verdict)
        Log.i(
            TAG,
            "path-verify ${agency.shortNumber} ${agency.agencyName} route=${verdict.routeQuery} mock=${verdict.fromMock}"
        )
        if (LetteringPermissionHelper.canDrawOverlays(app)) {
            CallOverlayService.updateCallInfo(
                app,
                agency.shortNumber,
                verified = true,
                cardJson = json,
                outgoing = outgoing,
                dcpRoute = verdict.routeQuery
            )
            LetteringIncomingNotifier.cancel(app)
        } else {
            LetteringIncomingNotifier.post(
                app,
                agency.shortNumber,
                outgoing,
                displayName = agency.agencyName,
                forceFallback = true
            )
        }
        scope.launch { enrichDcpLookup(app, agency, verdict, outgoing) }
        return true
    }

    private suspend fun enrichDcpLookup(
        app: Context,
        agency: NationalAgencyWhitelist.Agency,
        verdict: CallPathVerdict,
        outgoing: Boolean
    ) {
        try {
            val lookup = CardLookupRepository.lookup(
                app,
                agency.shortNumber,
                dcpRoute = verdict.routeQuery
            )
            if (lookup == null || !lookup.matched) return
            if (!CompanionRuntimeStabilityDiag.isCallSessionActive() &&
                CompanionRuntimeStabilityDiag.shouldIgnorePostEndOverlayStart()
            ) {
                return
            }
            if (LetteringPermissionHelper.canDrawOverlays(app)) {
                CallOverlayService.updateCallInfo(
                    app,
                    agency.shortNumber,
                    verified = lookup.verified,
                    cardJson = lookup.rawJson,
                    outgoing = outgoing,
                    dcpRoute = verdict.routeQuery
                )
            }
        } catch (e: Exception) {
            Log.w(TAG, "dcp lookup enrich failed", e)
        }
    }

    fun ensureOverlayOnly(context: Context, number: String, outgoing: Boolean) {
        val app = context.applicationContext
        if (!LetteringPrefs.isLetteringEnabled(app)) return
        if (!LetteringPermissionHelper.canDrawOverlays(app)) {
            OverlayDiagTracker.recordOverlayFailure(
                OverlayFailureReason.PERMISSION_DENIED,
                phase = "ENSURE_OVERLAY",
                detail = "SYSTEM_ALERT_WINDOW missing"
            )
            return
        }
        startOverlayService(app, number.ifBlank { "unknown" }, verified = false, cardJson = null, outgoing)
    }

    fun onCallEnded(context: Context) {
        try {
            CallPathSession.clear()
            val app = context.applicationContext
            CompanionRuntimeStabilityDiag.endCallSession("LetteringCallCoordinator.onCallEnded")
            VlueBigPushTrace.step(11, "Call End", "source=LetteringCallCoordinator.onCallEnded")
            LetteringPrefs.setLastCallEvent(app, "idle")
            incomingRingingActive = false
            lastRingNumber = ""
            callGen.incrementAndGet()
            LetteringIncomingNotifier.cancel(app)
            LetteringRingingActivity.requestFinish(app)

            if (CompanionMvpConfig.DELEGATE_CALL_UI) {
                kr.vlue.calloverlay.incall.VlueInCallController.keepOverlayAfterHangup = false
                dismissCallOverlayOnly(app)
                return
            }

            if (kr.vlue.calloverlay.incall.VlueInCallController.keepOverlayAfterHangup) {
                kr.vlue.calloverlay.incall.VlueInCallController.keepOverlayAfterHangup = false
                CallOverlayService.notifyKeepAfterEnd(app)
                return
            }
            dismissCallOverlayOnly(app)
        } catch (e: Exception) {
            Log.e(TAG, "onCallEnded failed", e)
        }
    }

    private fun dismissCallOverlayOnly(app: Context) {
        val intent = Intent(app, CallOverlayService::class.java).apply {
            action = CallOverlayService.ACTION_DISMISS
        }
        app.startService(intent)
    }

    private fun startOverlayService(
        context: Context,
        number: String,
        verified: Boolean,
        cardJson: String?,
        outgoing: Boolean,
        dcpRoute: String = ""
    ) {
        try {
            /* FGS 를 diag/step 보다 먼저 — Incoming→BigPush 임계 경로 */
            val intent = Intent(context, CallOverlayService::class.java).apply {
                putExtra(CallOverlayService.EXTRA_PHONE, number)
                putExtra(CallOverlayService.EXTRA_VERIFIED, verified)
                putExtra(CallOverlayService.EXTRA_OUTGOING, outgoing)
                putExtra(CallOverlayService.EXTRA_CARD_JSON, cardJson)
                putExtra(CallOverlayService.EXTRA_DCP_ROUTE, dcpRoute)
            }
            context.startForegroundService(intent)
            CompanionRuntimeStabilityDiag.mark(
                "SERVICE_START_REQUEST",
                "LetteringCallCoordinator.startOverlayService"
            )
            VlueBigPushTrace.step(
                3,
                "LetteringCallCoordinator.startOverlayService()",
                "number=${ReleaseDebugGate.maskPhoneForLog(number)} verified=$verified outgoing=$outgoing hasCard=${!cardJson.isNullOrBlank()}"
            )
            DiagnosticsSessionStore.noteSource(context, "LetteringCallCoordinator")
            Log.i(TAG, "showOverlay number=${ReleaseDebugGate.maskPhoneForLog(number)} verified=$verified outgoing=$outgoing")
        } catch (e: Exception) {
            VlueBigPushTrace.skip(
                3,
                "startForegroundService failed: ${e.javaClass.name}: ${e.message}"
            )
            Log.e(TAG, "showOverlay failed", e)
            LetteringPrefs.setLastOverlayError(context, "fgs:${e.message}")
        }
    }
}
