package kr.vlue.calloverlay.diagnostics.oem

import org.json.JSONArray
import org.json.JSONObject

/**
 * OEM별 알려진 Overlay 제한 — 문서화·Diagnostics만.
 * 정책·Controller·Window·State Machine을 바꾸지 않는다.
 */
enum class OemFamily {
    SAMSUNG,
    PIXEL,
    XIAOMI,
    OTHER
}

data class OemKnownRestriction(
    val id: String,
    val title: String,
    val detail: String,
    val relatedFailureReasons: List<String>
)

object OemRuleCatalog {
    fun resolveFamily(manufacturer: String?, brand: String?): OemFamily {
        val m = (manufacturer ?: "").lowercase()
        val b = (brand ?: "").lowercase()
        return when {
            m.contains("samsung") || b.contains("samsung") -> OemFamily.SAMSUNG
            m.contains("google") || b.contains("google") || m.contains("pixel") ||
                b.contains("pixel") -> OemFamily.PIXEL
            m.contains("xiaomi") || b.contains("xiaomi") || m.contains("redmi") ||
                b.contains("redmi") || m.contains("poco") || b.contains("poco") -> OemFamily.XIAOMI
            else -> OemFamily.OTHER
        }
    }

    fun restrictionsFor(family: OemFamily): List<OemKnownRestriction> =
        when (family) {
            OemFamily.SAMSUNG -> samsung()
            OemFamily.PIXEL -> pixel()
            OemFamily.XIAOMI -> xiaomi()
            OemFamily.OTHER -> common()
        }

    fun common(): List<OemKnownRestriction> = listOf(
        OemKnownRestriction(
            id = "OVERLAY_PERMISSION",
            title = "Overlay Permission",
            detail = "SYSTEM_ALERT_WINDOW / canDrawOverlays required",
            relatedFailureReasons = listOf("PERMISSION_DENIED")
        ),
        OemKnownRestriction(
            id = "TYPE_APPLICATION_OVERLAY",
            title = "TYPE_APPLICATION_OVERLAY",
            detail = "Single Companion Window type 2038 only",
            relatedFailureReasons = listOf("BAD_TOKEN", "OEM_RESTRICTED", "WINDOW_REJECTED")
        ),
        OemKnownRestriction(
            id = "BAD_TOKEN",
            title = "BadTokenException",
            detail = "Invalid token or OEM reject on addView",
            relatedFailureReasons = listOf("BAD_TOKEN", "OEM_RESTRICTED")
        ),
        OemKnownRestriction(
            id = "FOREGROUND_SERVICE",
            title = "Foreground Service",
            detail = "Call FGS may be required for stable overlay on OEM builds",
            relatedFailureReasons = listOf("WINDOW_REJECTED", "UNKNOWN")
        ),
        OemKnownRestriction(
            id = "BATTERY_OPTIMIZATION",
            title = "Battery Optimization",
            detail = "Doze / battery opt may delay FGS or incoming handling",
            relatedFailureReasons = listOf("UNKNOWN")
        ),
        OemKnownRestriction(
            id = "SCREEN_OFF_AOD",
            title = "Screen OFF / AOD",
            detail = "BigPush position HIDDEN while SCREEN_OFF/AOD — state kept",
            relatedFailureReasons = listOf("SCREEN_OFF_POLICY")
        )
    )

    fun samsung(): List<OemKnownRestriction> = common() + listOf(
        OemKnownRestriction(
            id = "SAMSUNG_CALL_OVERLAY_RESTRICT",
            title = "One UI Call Overlay Restrict",
            detail = "Even with canDrawOverlays=true, TYPE_APPLICATION_OVERLAY may be denied during calls (esp. non-store installs)",
            relatedFailureReasons = listOf("OEM_RESTRICTED", "BAD_TOKEN")
        ),
        OemKnownRestriction(
            id = "SAMSUNG_MINI_CALL",
            title = "One UI Mini Call",
            detail = "System Mini Call UI — Companion does not compete; single window only",
            relatedFailureReasons = listOf("WINDOW_REJECTED")
        ),
        OemKnownRestriction(
            id = "SAMSUNG_CALL_UI",
            title = "One UI Call UI",
            detail = "Incoming Call UI / in-call UI may coincide with BigPush TOP/BOTTOM policy",
            relatedFailureReasons = listOf("OEM_RESTRICTED")
        ),
        OemKnownRestriction(
            id = "SAMSUNG_WINDOW_TOKEN",
            title = "Window Token",
            detail = "BadToken with permission denied for window type 2038 → OEM_RESTRICTED",
            relatedFailureReasons = listOf("OEM_RESTRICTED", "BAD_TOKEN")
        )
    )

    fun pixel(): List<OemKnownRestriction> = common() + listOf(
        OemKnownRestriction(
            id = "PIXEL_AOSP_TELECOM",
            title = "AOSP Telecom",
            detail = "Fewer OEM call-time 2038 denies than Samsung; still requires overlay permission",
            relatedFailureReasons = listOf("PERMISSION_DENIED", "BAD_TOKEN")
        )
    )

    fun xiaomi(): List<OemKnownRestriction> = common() + listOf(
        OemKnownRestriction(
            id = "XIAOMI_DISPLAY_POPUP",
            title = "MIUI Display Popup",
            detail = "Extra display-over-apps toggle may exist beyond canDrawOverlays",
            relatedFailureReasons = listOf("PERMISSION_DENIED", "OEM_RESTRICTED")
        ),
        OemKnownRestriction(
            id = "XIAOMI_AUTOSTART_BATTERY",
            title = "Autostart / Battery",
            detail = "Autostart and battery saver can drop FGS or incoming overlay",
            relatedFailureReasons = listOf("WINDOW_REJECTED", "UNKNOWN")
        )
    )

    /**
     * Admin Device Compatibility 페이로드 — 정책 변경 없음.
     */
    fun deviceCompatibilityJson(
        manufacturer: String?,
        brand: String?,
        model: String?,
        sdkInt: Int?,
        overlayPermission: Boolean?,
        batteryOptimizationIgnored: Any?,
        roleDialer: Boolean? = null
    ): JSONObject {
        val family = resolveFamily(manufacturer, brand)
        val restrictions = restrictionsFor(family)
        return JSONObject().apply {
            put("manufacturer", manufacturer ?: "")
            put("brand", brand ?: "")
            put("model", model ?: "")
            put("sdkInt", sdkInt ?: JSONObject.NULL)
            put("oemFamily", family.name)
            put("overlayPermission", overlayPermission ?: JSONObject.NULL)
            put("batteryOptimizationIgnored", batteryOptimizationIgnored ?: JSONObject.NULL)
            if (roleDialer != null) put("roleDialer", roleDialer)
            put(
                "knownRestrictions",
                JSONArray().also { arr ->
                    restrictions.forEach { r ->
                        arr.put(
                            JSONObject().apply {
                                put("id", r.id)
                                put("title", r.title)
                                put("detail", r.detail)
                                put(
                                    "relatedFailureReasons",
                                    JSONArray(r.relatedFailureReasons)
                                )
                            }
                        )
                    }
                }
            )
            put(
                "knownRestrictionTitles",
                JSONArray(restrictions.map { it.title })
            )
        }
    }

    fun fromOemDeviceInfo(oem: JSONObject?): JSONObject {
        if (oem == null) {
            return deviceCompatibilityJson(null, null, null, null, null, null)
        }
        return deviceCompatibilityJson(
            manufacturer = oem.optString("manufacturer").ifBlank { null },
            brand = oem.optString("brand").ifBlank { null },
            model = oem.optString("model").ifBlank { null },
            sdkInt = if (oem.has("sdkInt")) oem.optInt("sdkInt") else null,
            overlayPermission =
                if (oem.has("overlayPermission")) oem.optBoolean("overlayPermission") else null,
            batteryOptimizationIgnored =
                if (oem.has("batteryOptimizationIgnored") && !oem.isNull("batteryOptimizationIgnored")) {
                    oem.get("batteryOptimizationIgnored")
                } else {
                    null
                },
            roleDialer = if (oem.has("roleDialer")) oem.optBoolean("roleDialer") else null
        )
    }
}
