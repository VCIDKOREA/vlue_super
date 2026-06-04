package kr.vlue.calloverlay

import android.content.Context
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
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
    suspend fun lookup(context: Context, rawNumber: String): CardLookupResult? =
        withContext(Dispatchers.IO) {
            val e164 = CardLookupBridge.normalizeKr(rawNumber) ?: return@withContext null
            if (BlockedPhoneCache.isBlocked(context, e164)) return@withContext null

            val base = BuildConfig.API_BASE_URL.trimEnd('/')
            val q = URLEncoder.encode(rawNumber, "UTF-8")
            val url = URL("$base/api/cards/by-number?number=$q")
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
                val json = JSONObject(body)
                val matched = json.optBoolean("matched", false)
                CardLookupResult(
                    matched = matched,
                    verified = json.optBoolean("is_verified", matched),
                    displayName = json.optString("displayName", ""),
                    rawJson = body
                )
            } catch (_: Exception) {
                null
            } finally {
                conn.disconnect()
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
