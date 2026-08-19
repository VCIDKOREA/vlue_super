package kr.vlue.calloverlay

import android.content.Context
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kr.vlue.calloverlay.dcp.NationalAgencyWhitelist
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder
import java.util.concurrent.Executors

data class CardLookupResult(
    val matched: Boolean,
    val verified: Boolean,
    val displayName: String,
    val rawJson: String
)

object CardLookupRepository {
    private const val CACHE_TTL_MS = 30L * 60L * 1000L
    private val cache = java.util.concurrent.ConcurrentHashMap<String, CachedLookup>()
    private val bg by lazy { Executors.newSingleThreadExecutor() }

    private data class CachedLookup(
        val result: CardLookupResult,
        val atMs: Long
    )

    fun peekCached(rawNumber: String): CardLookupResult? {
        val keys = cacheKeys(rawNumber)
        val now = System.currentTimeMillis()
        for (key in keys) {
            val hit = cache[key] ?: continue
            if (now - hit.atMs > CACHE_TTL_MS) {
                cache.remove(key)
                continue
            }
            if (hit.result.matched) return hit.result
        }
        return null
    }

    fun remember(rawNumber: String, result: CardLookupResult) {
        if (!result.matched) return
        for (key in cacheKeys(rawNumber)) {
            cache[key] = CachedLookup(result, System.currentTimeMillis())
        }
    }
    suspend fun lookup(
        context: Context,
        rawNumber: String,
        dcpRoute: String? = null
    ): CardLookupResult? =
        withContext(Dispatchers.IO) {
            val e164 = CardLookupBridge.normalizeKr(rawNumber) ?: return@withContext null
            if (BlockedPhoneCache.isBlocked(context, e164)) return@withContext null

            peekCached(rawNumber)?.let {
                bg.execute { reportLineCallEvent(context, rawNumber) }
                /* 캐시는 즉시 오버레이용. 조회는 매번 네트워크 — 상대 원격 실행 신호를 놓치지 않음 */
            }

            val base = BuildConfig.API_BASE_URL.trimEnd('/')
            val agency = NationalAgencyWhitelist.match(rawNumber)
            val numberParam = agency?.shortNumber ?: e164
            val result = lookupOnce(context, base, numberParam, dcpRoute)
            if (result != null && result.matched) {
                val filled = result.copy(rawJson = OverlayCardOrgFill.fillIfMissing(context, result.rawJson))
                remember(rawNumber, filled)
                bg.execute { reportLineCallEvent(context, rawNumber) }
                return@withContext filled
            }
            return@withContext result
        }

    private fun cacheKeys(rawNumber: String): List<String> {
        val out = LinkedHashSet<String>()
        val trimmed = rawNumber.trim()
        if (trimmed.isNotEmpty()) out.add(trimmed)
        CardLookupBridge.normalizeKr(rawNumber)?.let { out.add(it) }
        val digits = rawNumber.filter { it.isDigit() }
        if (digits.isNotEmpty()) out.add(digits)
        val canon = IncomingNumberResolver.canonicalDigits(rawNumber)
        if (canon.isNotEmpty()) out.add(canon)
        return out.toList()
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
                /* 조회는 서버에서 짧게. 앱 대기는 넉넉히 — 2.5s 타임아웃으로 회원 미매칭 처리하지 않음 */
                connectTimeout = 5000
                readTimeout = 12000
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

    /** 발신 폰에서 원격·악성앱이 실행 중일 때 — 수신 VLUE 회원이 비정상을 볼 수 있게 보고 */
    fun reportOutgoingCallPath(context: Context, reasons: List<String>) {
        if (reasons.isEmpty()) return
        val token = LetteringPrefs.getAccessToken(context)
        val userId = LetteringPrefs.getUserId(context)
        if (token.isNullOrBlank() && userId.isNullOrBlank()) return
        try {
            val base = BuildConfig.API_BASE_URL.trimEnd('/')
            val url = URL("$base/api/cards/call-path-report")
            val conn = (url.openConnection() as HttpURLConnection).apply {
                requestMethod = "POST"
                connectTimeout = 5000
                readTimeout = 8000
                doOutput = true
                setRequestProperty("Content-Type", "application/json; charset=utf-8")
                token?.let { setRequestProperty("Authorization", "Bearer $it") }
                userId?.let { setRequestProperty("X-VLUE-User-Id", it) }
            }
            try {
                conn.outputStream.use { os ->
                    os.write(
                        JSONObject()
                            .put("reasons", org.json.JSONArray(reasons))
                            .toString()
                            .toByteArray(Charsets.UTF_8)
                    )
                }
                conn.responseCode
            } finally {
                conn.disconnect()
            }
        } catch (_: Exception) {
            /* ignore */
        }
    }

    /** 상대 회선 소유자 통화목록 — 캐시 히트여도 매번 보고 */
    private fun reportLineCallEvent(context: Context, number: String) {
        val raw = number.trim()
        if (raw.isEmpty()) return
        if (NationalAgencyWhitelist.match(raw) != null) return
        try {
            val base = BuildConfig.API_BASE_URL.trimEnd('/')
            val url = URL("$base/api/cards/line-call-events")
            val conn = (url.openConnection() as HttpURLConnection).apply {
                requestMethod = "POST"
                connectTimeout = 8000
                readTimeout = 8000
                doOutput = true
                setRequestProperty("Content-Type", "application/json; charset=utf-8")
                LetteringPrefs.getAccessToken(context)?.let {
                    setRequestProperty("Authorization", "Bearer $it")
                }
                LetteringPrefs.getUserId(context)?.let {
                    setRequestProperty("X-VLUE-User-Id", it)
                }
            }
            try {
                conn.outputStream.use { os ->
                    os.write(
                        JSONObject()
                            .put("number", raw)
                            .put("direction", "in")
                            .toString()
                            .toByteArray(Charsets.UTF_8)
                    )
                }
                conn.responseCode
            } finally {
                conn.disconnect()
            }
        } catch (_: Exception) {
            /* ignore */
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
