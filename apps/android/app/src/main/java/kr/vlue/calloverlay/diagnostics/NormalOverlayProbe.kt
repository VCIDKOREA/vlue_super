package kr.vlue.calloverlay.diagnostics

import android.content.Context
import android.content.Intent
import android.os.Build
import android.telephony.TelephonyManager
import android.util.Log
import kr.vlue.calloverlay.CallOverlayService
import kr.vlue.calloverlay.LetteringPermissionHelper
import kr.vlue.calloverlay.VlueBigPushTrace
import org.json.JSONObject

/**
 * 통화 중이 아닐 때 CallOverlayService + 동일 LayoutParams 로 addView 실험.
 * NORMAL_OVERLAY_PROBE vs CALL_OVERLAY_PROBE 비교로 Samsung 통화 중 제한을 검증한다.
 */
object NormalOverlayProbe {
    private const val TAG = "NormalOverlayProbe"
    private const val PREFS = "vlue_overlay_probe"
    private const val KEY_LAST_AT = "normal_last_at_ms"
    private const val KEY_LAST_RESULT = "normal_last_result"
    private const val KEY_LAST_MSG = "normal_last_msg"
    private const val KEY_LAST_SESSION = "normal_last_session"
    /** 프로세스당 최소 간격 — 과도한 FGS 기동 방지 */
    private const val MIN_INTERVAL_MS = 10 * 60 * 1000L

    @Volatile
    private var scheduledThisProcess = false

    fun lastResultJson(context: Context): JSONObject {
        val p = context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        return JSONObject().apply {
            put("result", p.getString(KEY_LAST_RESULT, null) ?: JSONObject.NULL)
            put("message", p.getString(KEY_LAST_MSG, null) ?: JSONObject.NULL)
            put("atMs", p.getLong(KEY_LAST_AT, 0L))
            put("sessionId", p.getString(KEY_LAST_SESSION, null) ?: JSONObject.NULL)
            put(
                "ageMs",
                if (p.getLong(KEY_LAST_AT, 0L) > 0L) {
                    System.currentTimeMillis() - p.getLong(KEY_LAST_AT, 0L)
                } else {
                    -1
                }
            )
        }
    }

    fun rememberResult(context: Context, result: String, message: String?, sessionId: String?) {
        context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
            .putLong(KEY_LAST_AT, System.currentTimeMillis())
            .putString(KEY_LAST_RESULT, result)
            .putString(KEY_LAST_MSG, message)
            .putString(KEY_LAST_SESSION, sessionId)
            .apply()
    }

    fun isPhoneIdle(context: Context): Boolean {
        return try {
            val tm = context.getSystemService(Context.TELEPHONY_SERVICE) as? TelephonyManager
                ?: return true
            tm.callState == TelephonyManager.CALL_STATE_IDLE
        } catch (_: Exception) {
            true
        }
    }

    /**
     * MainActivity 등에서 호출. UI 변경 없음 — 백그라운드 FGS 프로브만.
     */
    fun scheduleIfEligible(context: Context) {
        val app = context.applicationContext
        if (scheduledThisProcess) return
        if (!LetteringPermissionHelper.canDrawOverlays(app)) {
            Log.i(TAG, "skip: canDrawOverlays=false")
            return
        }
        if (!isPhoneIdle(app)) {
            Log.i(TAG, "skip: phone not IDLE")
            return
        }
        if (CallOverlayService.isRunning()) {
            Log.i(TAG, "skip: CallOverlayService already running")
            return
        }
        if (DiagnosticsSessionStore.current()?.feature == DiagnosticsFeature.BIG_PUSH) {
            Log.i(TAG, "skip: BIG_PUSH session active")
            return
        }
        val prefs = app.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        val last = prefs.getLong(KEY_LAST_AT, 0L)
        if (last > 0L && System.currentTimeMillis() - last < MIN_INTERVAL_MS) {
            Log.i(TAG, "skip: throttled")
            return
        }
        scheduledThisProcess = true
        VlueBigPushTrace.bind(app)
        try {
            DiagnosticsSessionStore.ensureSession(
                app,
                feature = DiagnosticsFeature.OVERLAY,
                source = "NORMAL_OVERLAY_PROBE"
            )
            val intent = Intent(app, CallOverlayService::class.java).apply {
                action = CallOverlayService.ACTION_NORMAL_OVERLAY_PROBE
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                app.startForegroundService(intent)
            } else {
                app.startService(intent)
            }
            Log.i(TAG, "started ACTION_NORMAL_OVERLAY_PROBE")
        } catch (e: Exception) {
            scheduledThisProcess = false
            Log.e(TAG, "failed to start normal overlay probe", e)
            VlueBigPushTrace.recordOverlayAddViewProbe(
                context = app,
                probeKind = "NORMAL_OVERLAY_PROBE",
                result = "FAIL",
                params = null,
                error = e,
                extra = JSONObject().put("phase", "startService")
            )
        }
    }
}
