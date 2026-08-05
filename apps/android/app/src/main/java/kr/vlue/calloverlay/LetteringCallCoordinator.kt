package kr.vlue.calloverlay

import android.content.Context
import android.content.Intent
import android.util.Log
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import kr.vlue.calloverlay.incall.VlueInCallController

/** 통화 이벤트 → API 조회 → 오버레이·알림·액티비티 폴백 */
object LetteringCallCoordinator {
    private const val TAG = "LetteringCoordinator"
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)

    @Volatile
    private var lastRingAt = 0L

    fun onRinging(context: Context, number: String?, outgoing: Boolean = false) {
        try {
            val app = context.applicationContext
            if (!LetteringPrefs.isLetteringEnabled(app)) {
                Log.w(TAG, "skip ringing: lettering_enabled=false")
                LetteringPrefs.setLastOverlayError(app, "lettering_enabled=false")
                return
            }

            val now = System.currentTimeMillis()
            if (now - lastRingAt < 800L) {
                Log.d(TAG, "skip ringing: debounce")
                return
            }
            lastRingAt = now

            val raw = number?.trim().orEmpty().ifEmpty { "unknown" }
            LetteringPrefs.setLastCallEvent(app, "ringing:$raw:out=$outgoing")

            /* 1) FGS 오버레이 — SYSTEM_ALERT_WINDOW 있을 때 */
            if (LetteringPermissionHelper.canDrawOverlays(app)) {
                startOverlayService(app, raw, verified = false, cardJson = null, outgoing)
            } else {
                Log.w(TAG, "overlay permission missing — notif/activity fallback")
                LetteringPrefs.setLastOverlayError(app, "SYSTEM_ALERT_WINDOW missing")
            }

            /* 2) 헤드업 + 풀스크린 인텐트 — 전화 UI 아래 깔림 대비 */
            LetteringIncomingNotifier.post(app, raw, outgoing)

            /* 3) 액티비티 직접 기동 (백그라운드 제한 시 실패할 수 있음) */
            LetteringRingingActivity.launch(app, raw, outgoing)

            if (raw == "unknown") return

            scope.launch {
                try {
                    val lookup = CardLookupRepository.lookup(app, raw)
                    if (lookup == null || !lookup.matched) {
                        Log.w(TAG, "lookup unmatched for $raw")
                        LetteringPrefs.setLastOverlayError(app, "lookup_unmatched:$raw")
                        return@launch
                    }
                    if (LetteringPermissionHelper.canDrawOverlays(app)) {
                        startOverlayService(app, raw, verified = lookup.verified, cardJson = lookup.rawJson, outgoing)
                    }
                } catch (e: Exception) {
                    Log.e(TAG, "lookup failed after overlay start", e)
                    LetteringPrefs.setLastOverlayError(app, "lookup_error:${e.message}")
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "onRinging failed", e)
            LetteringPrefs.setLastOverlayError(context, "onRinging:${e.message}")
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
            LetteringPrefs.setLastCallEvent(app, "idle")
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
            Log.i(TAG, "showOverlay number=$number verified=$verified outgoing=$outgoing")
            val intent = Intent(context, CallOverlayService::class.java).apply {
                putExtra(CallOverlayService.EXTRA_PHONE, number)
                putExtra(CallOverlayService.EXTRA_VERIFIED, verified)
                putExtra(CallOverlayService.EXTRA_OUTGOING, outgoing)
                putExtra(CallOverlayService.EXTRA_CARD_JSON, cardJson)
            }
            context.startForegroundService(intent)
        } catch (e: Exception) {
            Log.e(TAG, "showOverlay failed", e)
            LetteringPrefs.setLastOverlayError(context, "fgs:${e.message}")
        }
    }
}
