package kr.vlue.calloverlay

import android.content.Context
import android.content.Intent
import android.util.Log
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import kr.vlue.calloverlay.incall.VlueInCallController

/** 통화 이벤트 → API 조회 → 오버레이 생명주기 */
object LetteringCallCoordinator {
    private const val TAG = "LetteringCoordinator"
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)

    fun onRinging(context: Context, number: String?, outgoing: Boolean = false) {
        try {
            val app = context.applicationContext
            if (!LetteringPrefs.isLetteringEnabled(app)) {
                Log.w(TAG, "skip ringing: lettering_enabled=false")
                return
            }
            if (!LetteringPermissionHelper.canDrawOverlays(app)) {
                Log.w(TAG, "skip ringing: SYSTEM_ALERT_WINDOW not granted")
                return
            }
            /* 번호 비어 있어도 오버레이는 띄움 (Samsung 등에서 EXTRA_INCOMING_NUMBER null 빈번) */
            val raw = number?.trim().orEmpty().ifEmpty { "unknown" }

            scope.launch {
                try {
                    if (raw == "unknown") {
                        showOverlay(app, raw, verified = false, cardJson = null, outgoing)
                        return@launch
                    }
                    val lookup = CardLookupRepository.lookup(app, raw)
                    if (lookup == null || !lookup.matched) {
                        showOverlay(app, raw, verified = false, cardJson = null, outgoing)
                        return@launch
                    }
                    showOverlay(app, raw, verified = lookup.verified, cardJson = lookup.rawJson, outgoing)
                } catch (e: Exception) {
                    Log.e(TAG, "lookup failed — showing unverified overlay", e)
                    showOverlay(app, raw, verified = false, cardJson = null, outgoing)
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "onRinging failed", e)
        }
    }

    /**
     * 통화 종료.
     * keepOverlayAfterHangup / VlueInCallController 플래그가 있으면 쇼케이스 유지.
     */
    fun onCallEnded(context: Context) {
        try {
            val app = context.applicationContext
            if (VlueInCallController.keepOverlayAfterHangup) {
                VlueInCallController.keepOverlayAfterHangup = false
                CallOverlayService.notifyKeepAfterEnd(app)
                return
            }
            val intent = Intent(app, CallOverlayService::class.java).apply {
                action = CallOverlayService.ACTION_DISMISS
            }
            app.startService(intent)
        } catch (e: Exception) {
            Log.e(TAG, "onCallEnded failed", e)
        }
    }

    private fun showOverlay(
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
        }
    }
}
