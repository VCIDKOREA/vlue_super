package kr.vlue.calloverlay

import android.content.Context
import android.content.Intent
import android.util.Log
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kr.vlue.calloverlay.diagnostics.DiagnosticsSessionStore
import kr.vlue.calloverlay.incall.VlueInCallController

/** 통화 이벤트 → API 조회 → 오버레이·알림·액티비티 폴백 */
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

            var resolved = number?.trim().orEmpty()
            if (IncomingNumberResolver.isUnknown(resolved)) {
                IncomingNumberResolver.resolveRecentNumber(app, outgoing)?.let { resolved = it }
            }

            val now = System.currentTimeMillis()
            val prevUnknown = IncomingNumberResolver.isUnknown(lastRingNumber)
            val nextUnknown = IncomingNumberResolver.isUnknown(resolved)
            val isUpgrade = prevUnknown && !nextUnknown && now - lastRingAt < 3_000L
            val isDuplicate =
                !isUpgrade &&
                    now - lastRingAt < 800L &&
                    lastOutgoing == outgoing &&
                    (resolved == lastRingNumber || (nextUnknown && prevUnknown))

            if (isDuplicate) {
                VlueBigPushTrace.skip(
                    3,
                    "debounce — last=$lastRingNumber next=$resolved out=$outgoing within 800ms"
                )
                Log.d(TAG, "skip ringing: debounce last=$lastRingNumber next=$resolved")
                return
            }

            lastRingAt = now
            lastRingNumber = if (nextUnknown) "unknown" else resolved
            lastOutgoing = outgoing

            val raw = if (nextUnknown) "unknown" else resolved
            LetteringPrefs.setLastCallEvent(app, "ringing:$raw:out=$outgoing")
            kr.vlue.calloverlay.diagnostics.DiagnosticsSessionStore.updatePhoneMasked(raw)

            /* 1) FGS 오버레이 — SYSTEM_ALERT_WINDOW 있을 때 */
            if (LetteringPermissionHelper.canDrawOverlays(app)) {
                startOverlayService(app, raw, verified = false, cardJson = null, outgoing)
            } else {
                VlueBigPushTrace.skip(3, "Overlay permission denied (SYSTEM_ALERT_WINDOW missing)")
                Log.w(TAG, "overlay permission missing — notif/activity fallback")
                LetteringPrefs.setLastOverlayError(app, "SYSTEM_ALERT_WINDOW missing")
            }

            /* 2) 헤드업 + 풀스크린 인텐트 — 전화 UI 아래 깔림 대비 */
            LetteringIncomingNotifier.post(app, raw, outgoing)

            /* 3) 액티비티 직접 기동 (백그라운드 제한 시 실패할 수 있음) */
            LetteringRingingActivity.launch(app, raw, outgoing)

            if (raw == "unknown") {
                /* CallLog 가 늦게 쌓이는 OEM — 짧게 재시도 후 번호 업그레이드 */
                scope.launch {
                    retryResolveUnknown(app, outgoing)
                }
                return
            }

            scope.launch {
                enrichWithLookup(app, raw, outgoing)
            }
        } catch (e: Exception) {
            Log.e(TAG, "onRinging failed", e)
            LetteringPrefs.setLastOverlayError(context, "onRinging:${e.message}")
        }
    }

    private suspend fun retryResolveUnknown(app: Context, outgoing: Boolean) {
        repeat(4) { attempt ->
            delay(350L + attempt * 200L)
            val n = IncomingNumberResolver.resolveRecentNumber(app, outgoing) ?: return@repeat
            if (IncomingNumberResolver.isUnknown(n)) return@repeat
            Log.i(TAG, "upgrade unknown → $n (attempt=$attempt)")
            lastRingNumber = n
            lastRingAt = System.currentTimeMillis()
            LetteringPrefs.setLastCallEvent(app, "ringing_upgrade:$n:out=$outgoing")
            if (LetteringPermissionHelper.canDrawOverlays(app)) {
                CallOverlayService.updateCallInfo(app, n, verified = false, cardJson = null, outgoing)
            }
            LetteringIncomingNotifier.post(app, n, outgoing)
            enrichWithLookup(app, n, outgoing)
            return
        }
        Log.w(TAG, "number still unknown after CallLog retries")
        LetteringPrefs.setLastOverlayError(app, "number_unknown_after_retry")
    }

    private suspend fun enrichWithLookup(app: Context, raw: String, outgoing: Boolean) {
        try {
            val lookup = CardLookupRepository.lookup(app, raw)
            if (lookup == null || !lookup.matched) {
                Log.w(TAG, "lookup unmatched for $raw")
                LetteringPrefs.setLastOverlayError(app, "lookup_unmatched:$raw")
                LetteringIncomingNotifier.post(app, raw, outgoing, displayName = null)
                return
            }
            val label = lookup.displayName.ifBlank { raw }
            LetteringIncomingNotifier.post(app, raw, outgoing, displayName = label)
            if (LetteringPermissionHelper.canDrawOverlays(app)) {
                CallOverlayService.updateCallInfo(
                    app,
                    raw,
                    verified = lookup.verified,
                    cardJson = lookup.rawJson,
                    outgoing = outgoing
                )
            } else {
                startOverlayService(app, raw, verified = lookup.verified, cardJson = lookup.rawJson, outgoing)
            }
        } catch (e: Exception) {
            Log.e(TAG, "lookup failed after overlay start", e)
            LetteringPrefs.setLastOverlayError(app, "lookup_error:${e.message}")
        }
    }

    /** RingingActivity 가 이미 떠 있을 때 — 오버레이만 재시도 (알림/액티비티 재기동 없음) */
    fun ensureOverlayOnly(context: Context, number: String, outgoing: Boolean) {
        val app = context.applicationContext
        if (!LetteringPrefs.isLetteringEnabled(app)) return
        if (!LetteringPermissionHelper.canDrawOverlays(app)) return
        startOverlayService(app, number.ifBlank { "unknown" }, verified = false, cardJson = null, outgoing)
    }

    fun onCallEnded(context: Context) {
        try {
            val app = context.applicationContext
            VlueBigPushTrace.step(11, "Call End", "source=LetteringCallCoordinator.onCallEnded")
            LetteringPrefs.setLastCallEvent(app, "idle")
            lastRingNumber = ""
            LetteringIncomingNotifier.cancel(app)
            LetteringRingingActivity.requestFinish(app)

            /*
             * 통화 종료 = 통화 UI(CallOverlay / Showcase / Mini Case)만 제거.
             * MainActivity·LetteringCallMonitorService 는 중지하지 않음 — 카톡형 상시 대기.
             */
            if (CompanionMvpConfig.DELEGATE_CALL_UI) {
                VlueInCallController.keepOverlayAfterHangup = false
                dismissCallOverlayOnly(app)
                return
            }

            /* Advanced: 통화 종료 후 쇼케이스 사후 감상 유지 옵션 */
            if (VlueInCallController.keepOverlayAfterHangup) {
                VlueInCallController.keepOverlayAfterHangup = false
                CallOverlayService.notifyKeepAfterEnd(app)
                return
            }
            dismissCallOverlayOnly(app)
        } catch (e: Exception) {
            Log.e(TAG, "onCallEnded failed", e)
        }
    }

    /** CallOverlayService 만 stop — 앱 프로세스·통화 모니터 FGS 는 유지 */
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
            VlueBigPushTrace.step(
                3,
                "LetteringCallCoordinator.startOverlayService()",
                "number=$number verified=$verified outgoing=$outgoing hasCard=${!cardJson.isNullOrBlank()}"
            )
            DiagnosticsSessionStore.noteSource(context, "LetteringCallCoordinator")
            Log.i(TAG, "showOverlay number=$number verified=$verified outgoing=$outgoing")
            val intent = Intent(context, CallOverlayService::class.java).apply {
                putExtra(CallOverlayService.EXTRA_PHONE, number)
                putExtra(CallOverlayService.EXTRA_VERIFIED, verified)
                putExtra(CallOverlayService.EXTRA_OUTGOING, outgoing)
                putExtra(CallOverlayService.EXTRA_CARD_JSON, cardJson)
            }
            context.startForegroundService(intent)
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
