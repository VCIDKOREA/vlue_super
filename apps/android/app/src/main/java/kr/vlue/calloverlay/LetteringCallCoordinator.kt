package kr.vlue.calloverlay

import android.content.Context
import android.content.Intent
import android.os.SystemClock
import android.util.Log
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
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

            lastRingAt = now
            lastRingNumber = if (nextUnknown) "unknown" else resolved
            lastOutgoing = outgoing

            val raw = if (nextUnknown) "unknown" else resolved
            LetteringPrefs.setLastCallEvent(app, "ringing:$raw:out=$outgoing")

            /* 1) Permission → Overlay 즉시 (diag/lookup 보다 먼저) */
            val canDraw = LetteringPermissionHelper.canDrawOverlays(app)
            if (canDraw) {
                startOverlayService(app, raw, verified = false, cardJson = null, outgoing)
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
                /* Activity 폴백은 홈/뒤로가기를 가로챔 — 아래 HUN 만 사용 */
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

            /* 4) 번호/회원 enrich — Overlay 이후 IO */
            if (nextUnknown) {
                scope.launch {
                    upgradeNumberAfterOverlay(app, outgoing)
                }
            } else {
                scope.launch {
                    enrichWithLookup(app, raw, outgoing)
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "onRinging failed", e)
            LetteringPrefs.setLastOverlayError(context, "onRinging:${e.message}")
        }
    }

    /** CallLog 조회는 IO — Overlay 시작을 막지 않는다 */
    private suspend fun upgradeNumberAfterOverlay(app: Context, outgoing: Boolean) {
        val fromLog = withContext(Dispatchers.IO) {
            IncomingNumberResolver.resolveRecentNumber(app, outgoing)
        }
        if (!IncomingNumberResolver.isUnknown(fromLog)) {
            val n = fromLog!!
            Log.i(TAG, "upgrade unknown → ${ReleaseDebugGate.maskPhoneForLog(n)} (immediate CallLog)")
            lastRingNumber = n
            lastRingAt = System.currentTimeMillis()
            LetteringPrefs.setLastCallEvent(app, "ringing_upgrade:$n:out=$outgoing")
            if (LetteringPermissionHelper.canDrawOverlays(app)) {
                CallOverlayService.updateCallInfo(app, n, verified = false, cardJson = null, outgoing)
                LetteringIncomingNotifier.cancel(app)
            } else {
                LetteringIncomingNotifier.post(app, n, outgoing, forceFallback = true)
            }
            enrichWithLookup(app, n, outgoing)
            return
        }
        retryResolveUnknown(app, outgoing)
    }

    private suspend fun retryResolveUnknown(app: Context, outgoing: Boolean) {
        repeat(4) { attempt ->
            delay(350L + attempt * 200L)
            val n = withContext(Dispatchers.IO) {
                IncomingNumberResolver.resolveRecentNumber(app, outgoing)
            } ?: return@repeat
            if (IncomingNumberResolver.isUnknown(n)) return@repeat
            Log.i(TAG, "upgrade unknown → ${ReleaseDebugGate.maskPhoneForLog(n)} (attempt=$attempt)")
            lastRingNumber = n
            lastRingAt = System.currentTimeMillis()
            LetteringPrefs.setLastCallEvent(app, "ringing_upgrade:$n:out=$outgoing")
            if (LetteringPermissionHelper.canDrawOverlays(app)) {
                CallOverlayService.updateCallInfo(app, n, verified = false, cardJson = null, outgoing)
                LetteringIncomingNotifier.cancel(app)
            } else {
                LetteringIncomingNotifier.post(app, n, outgoing, forceFallback = true)
            }
            enrichWithLookup(app, n, outgoing)
            return
        }
        Log.w(TAG, "number still unknown after CallLog retries")
        LetteringPrefs.setLastOverlayError(app, "number_unknown_after_retry")
    }

    private suspend fun enrichWithLookup(app: Context, raw: String, outgoing: Boolean) {
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
            val lookup = CardLookupRepository.lookup(app, raw)
            val elapsed = (SystemClock.elapsedRealtime() - started).coerceAtLeast(0L)
            if (lookup == null || !lookup.matched) {
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
                /* 오버레이 보이면 HUN 재게시 금지 — post() 가 자체 스킵 */
                LetteringIncomingNotifier.post(app, raw, outgoing, displayName = null)
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
            if (LetteringPermissionHelper.canDrawOverlays(app)) {
                CallOverlayService.updateCallInfo(
                    app,
                    raw,
                    verified = lookup.verified,
                    cardJson = lookup.rawJson,
                    outgoing = outgoing
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
            val app = context.applicationContext
            CompanionRuntimeStabilityDiag.endCallSession("LetteringCallCoordinator.onCallEnded")
            VlueBigPushTrace.step(11, "Call End", "source=LetteringCallCoordinator.onCallEnded")
            LetteringPrefs.setLastCallEvent(app, "idle")
            lastRingNumber = ""
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
        outgoing: Boolean
    ) {
        try {
            /* FGS 를 diag/step 보다 먼저 — Incoming→BigPush 임계 경로 */
            val intent = Intent(context, CallOverlayService::class.java).apply {
                putExtra(CallOverlayService.EXTRA_PHONE, number)
                putExtra(CallOverlayService.EXTRA_VERIFIED, verified)
                putExtra(CallOverlayService.EXTRA_OUTGOING, outgoing)
                putExtra(CallOverlayService.EXTRA_CARD_JSON, cardJson)
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
