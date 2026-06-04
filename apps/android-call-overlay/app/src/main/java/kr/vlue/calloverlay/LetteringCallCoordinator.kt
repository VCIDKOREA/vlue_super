package kr.vlue.calloverlay

import android.content.Context
import android.content.Intent
import android.util.Log
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch

/** 통화 이벤트 → API 조회 → 오버레이 생명주기 */
object LetteringCallCoordinator {
    private const val TAG = "LetteringCoordinator"
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)

    fun onRinging(context: Context, number: String?, outgoing: Boolean = false) {
        try {
            val app = context.applicationContext
            if (!LetteringPrefs.isLetteringEnabled(app)) return
            val raw = number?.trim().orEmpty()
            if (raw.isEmpty()) return

            scope.launch {
                try {
                    val lookup = CardLookupRepository.lookup(app, raw)
                    if (lookup == null || !lookup.matched) {
                        showOverlay(app, raw, verified = false, cardJson = null, outgoing)
                        return@launch
                    }
                    showOverlay(app, raw, verified = lookup.verified, cardJson = lookup.rawJson, outgoing)
                } catch (e: Exception) {
                    Log.e(TAG, "lookup failed", e)
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "onRinging failed", e)
        }
    }

    fun onCallEnded(context: Context) {
        try {
            val app = context.applicationContext
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
