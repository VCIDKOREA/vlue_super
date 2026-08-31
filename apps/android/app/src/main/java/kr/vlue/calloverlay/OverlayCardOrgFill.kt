package kr.vlue.calloverlay

import android.content.Context
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder

/**
 * 오버레이 첫 페인트에 상호가 비면 웹이 팔로우 프로필을 기다린다.
 * 로컬 보정(CEO) + 필요 시 follow/profile 로 상호를 붙여 주입한다.
 */
object OverlayCardOrgFill {
    fun hasOrganization(rawJson: String): Boolean = organizationOf(parse(rawJson)).isNotBlank()

    fun applyLocalDefaults(rawJson: String): String {
        val json = parse(rawJson) ?: return rawJson
        applyLocalDefaults(json)
        return json.toString()
    }

    fun fillIfMissing(context: Context, rawJson: String): String {
        val json = parse(rawJson) ?: return rawJson
        applyLocalDefaults(json)
        if (organizationOf(json).isNotBlank()) return json.toString()
        val userId = json.optString("userId").trim()
        if (userId.isEmpty()) return json.toString()
        val org = fetchFollowOrganization(context, userId)
        if (!org.isNullOrBlank()) {
            json.put("companyName", org)
            json.put("organization", org)
        }
        return json.toString()
    }

    internal fun organizationOf(json: JSONObject?): String {
        if (json == null) return ""
        val nested = json.optJSONObject("card")
        val profile = json.optJSONObject("profile")
        val export = json.optJSONObject("cardExport") ?: json.optJSONObject("exportSnapshot")
        return firstNonBlank(
            json.optString("companyName"),
            json.optString("organization"),
            nested?.optString("companyName"),
            nested?.optString("organization"),
            profile?.optString("companyName"),
            profile?.optString("organization"),
            export?.optString("organization"),
            export?.optString("companyName")
        )
    }

    internal fun applyLocalDefaults(json: JSONObject) {
        if (organizationOf(json).isBlank() && isPlatformCeo(json)) {
            json.put("companyName", "VCID KOREA")
            json.put("organization", "VCID KOREA")
        }
        if (isPlatformCeo(json)) {
            if (firstNonBlank(json.optString("name"), json.optString("displayName")).isBlank()) {
                json.put("name", "이종근")
                json.put("displayName", "이종근")
            }
            if (firstNonBlank(json.optString("publicHandle")).isBlank()) {
                json.put("publicHandle", "ceo")
            }
        }
        val tier = json.optString("membershipTier").trim()
        if (tier.isEmpty() &&
            (json.optBoolean("is_premium_line", false) || isPlatformCeo(json))
        ) {
            json.put("membershipTier", "paid")
        }
    }

    /**
     * API 조회 전 — CEO 번호면 즉시 VCID KOREA 카드 JSON (빅푸시 4~5초 공백 제거).
     */
    fun seedIfPlatformCeoPhone(phoneRaw: String): String? {
        val digits = normalizeDigits(phoneRaw)
        if (digits != "821080144666" && digits != "01080144666") return null
        return JSONObject()
            .put("matched", true)
            .put("verified", true)
            .put("is_verified", true)
            .put("companyName", "VCID KOREA")
            .put("organization", "VCID KOREA")
            .put("name", "이종근")
            .put("displayName", "이종근")
            .put("publicHandle", "ceo")
            .put("membershipTier", "paid")
            .put("phoneE164", "+821080144666")
            .put("userId", "13c75cbe-206b-4eed-82d2-a54c7bc80c9c")
            .toString()
    }

    private fun isPlatformCeo(json: JSONObject): Boolean {
        val handle = firstNonBlank(
            json.optString("publicHandle"),
            json.optJSONObject("card")?.optString("publicHandle")
        ).removePrefix("@").lowercase()
        if (handle == "ceo") return true
        val digits = normalizeDigits(
            firstNonBlank(
                json.optString("phoneE164"),
                json.optJSONObject("card")?.optString("phoneE164")
            )
        )
        return digits == "821080144666" || digits == "01080144666"
    }

    private fun fetchFollowOrganization(context: Context, userId: String): String? {
        return try {
            val base = BuildConfig.API_BASE_URL.trimEnd('/')
            val id = URLEncoder.encode(userId, "UTF-8")
            val url = URL("$base/api/follow/profile/$id")
            val conn = (url.openConnection() as HttpURLConnection).apply {
                requestMethod = "GET"
                connectTimeout = 3000
                readTimeout = 4000
                LetteringPrefs.getAccessToken(context)?.let {
                    setRequestProperty("Authorization", "Bearer $it")
                }
                LetteringPrefs.getUserId(context)?.let {
                    setRequestProperty("X-VLUE-User-Id", it)
                }
            }
            try {
                val code = conn.responseCode
                if (code !in 200..299) return null
                val body = conn.inputStream.bufferedReader().use { it.readText() }
                val data = JSONObject(body)
                firstNonBlank(
                    data.optJSONObject("cardExport")?.optString("organization"),
                    data.optJSONObject("cardExport")?.optString("companyName"),
                    data.optJSONObject("profile")?.optString("companyName"),
                    data.optJSONObject("profile")?.optString("organization")
                )
            } finally {
                conn.disconnect()
            }
        } catch (_: Exception) {
            null
        }
    }

    private fun parse(rawJson: String): JSONObject? =
        try {
            if (rawJson.isBlank()) null else JSONObject(rawJson)
        } catch (_: Exception) {
            null
        }

    private fun firstNonBlank(vararg values: String?): String {
        for (v in values) {
            val t = v?.trim().orEmpty()
            if (t.isNotEmpty() && t != "null") return t
        }
        return ""
    }

    private fun normalizeDigits(raw: String?): String =
        raw.orEmpty().filter { it.isDigit() }
}
