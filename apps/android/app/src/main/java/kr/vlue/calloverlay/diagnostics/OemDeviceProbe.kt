package kr.vlue.calloverlay.diagnostics

import android.content.Context
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
import kr.vlue.calloverlay.LetteringPermissionHelper
import kr.vlue.calloverlay.incall.DialerRoleHelper
import org.json.JSONObject

/**
 * OEM / Device 환경 스냅샷 — 기록만. 정책·권한 요청 없음.
 */
object OemDeviceProbe {
    fun collect(context: Context): JSONObject {
        val app = context.applicationContext
        val ignoringBattery = try {
            val pm = app.getSystemService(Context.POWER_SERVICE) as? PowerManager
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                pm?.isIgnoringBatteryOptimizations(app.packageName) == true
            } else {
                true
            }
        } catch (_: Exception) {
            null
        }
        val canDraw = try {
            LetteringPermissionHelper.canDrawOverlays(app)
        } catch (_: Exception) {
            try {
                Settings.canDrawOverlays(app)
            } catch (_: Exception) {
                false
            }
        }
        return JSONObject().apply {
            put("manufacturer", Build.MANUFACTURER ?: "")
            put("brand", Build.BRAND ?: "")
            put("model", Build.MODEL ?: "")
            put("device", Build.DEVICE ?: "")
            put("sdkInt", Build.VERSION.SDK_INT)
            put("release", Build.VERSION.RELEASE ?: "")
            put("overlayPermission", canDraw)
            put("batteryOptimizationIgnored", ignoringBattery ?: JSONObject.NULL)
            put("roleDialer", DialerRoleHelper.isDefaultDialer(app))
            put(
                "typeApplicationOverlay",
                android.view.WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
            )
            // Known restrictions 첨부 — 정책 변경 없음 (OemRuleCatalog)
            val compat = kr.vlue.calloverlay.diagnostics.oem.OemRuleCatalog.deviceCompatibilityJson(
                manufacturer = Build.MANUFACTURER,
                brand = Build.BRAND,
                model = Build.MODEL,
                sdkInt = Build.VERSION.SDK_INT,
                overlayPermission = canDraw,
                batteryOptimizationIgnored = ignoringBattery,
                roleDialer = DialerRoleHelper.isDefaultDialer(app)
            )
            put("oemFamily", compat.optString("oemFamily"))
            put("knownRestrictions", compat.optJSONArray("knownRestrictions") ?: org.json.JSONArray())
        }
    }

    /**
     * Exception → FailureReason 분류 (관찰용).
     * OEM_RESTRICTED: Samsung 등 canDraw=true인데 type 2038 거부 휴리스틱.
     */
    fun classifyFailure(
        error: Throwable?,
        canDrawOverlays: Boolean,
        screenOffPolicy: Boolean = false
    ): OverlayFailureReason {
        if (screenOffPolicy) return OverlayFailureReason.SCREEN_OFF_POLICY
        if (!canDrawOverlays) return OverlayFailureReason.PERMISSION_DENIED
        val msg = (error?.message ?: "").lowercase()
        val name = error?.javaClass?.simpleName ?: ""
        return when {
            name.contains("BadToken", ignoreCase = true) ||
                msg.contains("badtoken") ||
                msg.contains("unable to add window") -> {
                if (msg.contains("permission denied") || msg.contains("2038")) {
                    OverlayFailureReason.OEM_RESTRICTED
                } else {
                    OverlayFailureReason.BAD_TOKEN
                }
            }
            msg.contains("permission denied") ->
                if (canDrawOverlays) OverlayFailureReason.OEM_RESTRICTED
                else OverlayFailureReason.PERMISSION_DENIED
            error != null -> OverlayFailureReason.WINDOW_REJECTED
            else -> OverlayFailureReason.UNKNOWN
        }
    }
}
