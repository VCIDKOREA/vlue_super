package kr.vlue.calloverlay

import android.content.Context
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kr.vlue.calloverlay.dcp.NationalAgencyWhitelist
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder

data class CardLookupResult(
    val matched: Boolean,
    val verified: Boolean,
    val displayName: String,
    val rawJson: String
)

object CardLookupRepository {
    suspend fun lookup(
        context: Context,
        rawNumber: String,
        dcpRoute: String? = null
    ): CardLookupResult? =
        withContext(Dispatchers.IO) {
            val e164 = CardLookupBridge.normalizeKr(rawNumber) ?: return@withContext null
            if (BlockedPhoneCache.isBlocked(context, e164)) return@withContext null

            val base = BuildConfig.API_BASE_URL.trimEnd('/')
            /* API 에는 정규화된 E.164 를 우선 전달 — raw 하이픈/공백 불일치로 MISS 나지 않게 */
            val candidates = LinkedHashSet<String>()
            val agency = NationalAgencyWhitelist.match(rawNumber)
            if (agency != null) candidates.add(agency.shortNumber)
            candidates.add(e164)
            val canon = IncomingNumberResolver.canonicalDigits(rawNumber)
            if (canon.isNotEmpty()) candidates.add("+$canon")
            val digitsOnly = rawNumber.filter { it.isDigit() }
            if (digitsOnly.isNotEmpty()) candidates.add(digitsOnly)
            val trimmed = rawNumber.trim()
            if (trimmed.isNotEmpty()) candidates.add(trimmed)

            var lastUnmatched: CardLookupResult? = null
            for (candidate in candidates) {
                val result = lookupOnce(context, base, candidate, dcpRoute) ?: continue
                if (result.matched) return@withContext result
                lastUnmatched = result
            }
            lastUnmatched ?: lookupOnce(context, base, e164, dcpRoute)
        }

    private fun lookupOnce(
        context: Context,
        base: String,
        numberParam: String,
        dcpRoute: String? = null
    ): CardLookupResult? {
        return try {
            val q = URLEncoder.encode(numberParam, "UTF-8")
            val route = dcpRoute?.trim().orEmpty().lowercase()
            val routeQ =
                if (route == "normal" || route == "abnormal") {
                    "&dcp_route=${URLEncoder.encode(route, "UTF-8")}"
                } else {
                    ""
                }
            val url = URL("$base/api/cards/by-number?number=$q&purpose=call_overlay$routeQ")
            val conn = (url.openConnection() as HttpURLConnection).apply {
                requestMethod = "GET"
                connectTimeout = 8000
                readTimeout = 8000
                LetteringPrefs.getAccessToken(context)?.let {
                    setRequestProperty("Authorization", "Bearer $it")
                }
                LetteringPrefs.getUserId(context)?.let {
                    setRequestProperty("X-VLUE-User-Id", it)
                }
            }
            try {
                val code = conn.responseCode
                val body = (if (code in 200..299) conn.inputStream else conn.errorStream)
                    .bufferedReader().use { it.readText() }
                if (code !in 200..299) return null
                val json = JSONObject(body)
                val matched = json.optBoolean("matched", false)
                CardLookupResult(
                    matched = matched,
                    verified = json.optBoolean("is_verified", matched),
                    displayName = json.optString("displayName", ""),
                    rawJson = body
                )
            } finally {
                conn.disconnect()
            }
        } catch (_: Exception) {
            null
        }
    }
}

/** 로컬·서버 차단 번호 캐시 (오버레이 미표시) */
object BlockedPhoneCache {
    private const val NAME = "vlue_lettering_blocked_cache"

    fun add(context: Context, e164: String) {
        val set = readSet(context).toMutableSet()
        set.add(e164)
        context.getSharedPreferences(NAME, Context.MODE_PRIVATE)
            .edit()
            .putStringSet("phones", set)
            .apply()
    }

    fun isBlocked(context: Context, e164: String): Boolean =
        readSet(context).contains(e164)

    private fun readSet(context: Context): Set<String> =
        context.getSharedPreferences(NAME, Context.MODE_PRIVATE)
            .getStringSet("phones", emptySet()) ?: emptySet()
}
