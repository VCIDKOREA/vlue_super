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
    private const val DISK_TTL_MS = 7L * 24L * 60L * 60L * 1000L
    private const val DISK_PREFS = "vlue_card_lookup_disk_v1"
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

    /** 메모리 → 디스크. 링잉 직후 인증명 즉시 표시용. */
    fun peekCached(context: Context, rawNumber: String): CardLookupResult? {
        peekCached(rawNumber)?.let { return it }
        val fromDisk = readDisk(context, rawNumber) ?: return null
        remember(rawNumber, fromDisk)
        return fromDisk
    }

    fun remember(rawNumber: String, result: CardLookupResult) {
        if (!result.matched) return
        val now = System.currentTimeMillis()
        for (key in cacheKeys(rawNumber)) {
            cache[key] = CachedLookup(result, now)
        }
    }

    fun remember(context: Context, rawNumber: String, result: CardLookupResult) {
        remember(rawNumber, result)
        if (result.matched) writeDisk(context, rawNumber, result)
    }

    /**
     * 로컬 안심 저장/공공 디렉터리는 즉시 표시용 provisional 데이터다.
     * 서버의 VLUE 회원·쇼케이스 카드보다 우선 확정하면 회원도 비회원 팝업으로 고착된다.
     */
    internal fun requiresAuthoritativeRefresh(result: CardLookupResult): Boolean {
        return try {
            val json = JSONObject(result.rawJson)
            val kind = json.optString("profileKind").trim()
            val source = json.optString("source").trim()
            source == "public_directory_local" ||
                kind == "public_directory_safe" ||
                kind == "contact_safe_care" ||
                kind == "lookup_pending" ||
                kind == "unverified" ||
                kind == "path_verify"
        } catch (_: Exception) {
            false
        }
    }

    /**
     * 통화목록「안심 저장」— 로컬 디렉터리 인덱스 + card lookup 디스크 캐시.
     * 이후 동일 번호 조회 시 네트워크 전에 즉시 안심팝업 JSON 반환.
     */
    fun rememberSafeCareLocal(context: Context, rawNumber: String, displayName: String): Boolean {
        val name = displayName.trim()
        if (name.isEmpty()) return false
        val e164 = CardLookupBridge.normalizeKr(rawNumber) ?: rawNumber.trim()
        if (e164.isBlank()) return false
        PublicDirectoryPhoneCache.rememberAndPersist(context, e164, name)
        /*
         * 이미 VLUE 회원·기관 등 강한 카드가 있으면 CardLookup 을 덮지 않음.
         * PublicDirectory 인덱스만 갱신 → 캐시 만료 후 폴백용.
         */
        peekCached(context, e164)?.let { existing ->
            if (existing.matched && !requiresAuthoritativeRefresh(existing)) {
                return true
            }
        }
        val json = buildPublicDirectorySafeJson(e164, name)
        remember(
            context,
            e164,
            CardLookupResult(
                matched = true,
                verified = true,
                displayName = name,
                rawJson = json
            )
        )
        return true
    }

    suspend fun lookup(
        context: Context,
        rawNumber: String,
        dcpRoute: String? = null
    ): CardLookupResult? =
        withContext(Dispatchers.IO) {
            lookupInternal(context, rawNumber, dcpRoute, fast = true)
        }

    /** 첫 조회 타임아웃 후 — 캐시 미스 시 느린 연결로 한 번 더 */
    suspend fun lookupSlow(
        context: Context,
        rawNumber: String,
        dcpRoute: String? = null
    ): CardLookupResult? =
        withContext(Dispatchers.IO) {
            lookupInternal(context, rawNumber, dcpRoute, fast = false)
        }

    private fun lookupInternal(
        context: Context,
        rawNumber: String,
        dcpRoute: String?,
        fast: Boolean
    ): CardLookupResult? {
            val e164 = CardLookupBridge.normalizeKr(rawNumber) ?: return null
            if (BlockedPhoneCache.isBlocked(context, e164)) return null
            var localSafeFallback: CardLookupResult? = null

            /*
             * 강한 회원 카드는 즉시 확정한다. 로컬 안심 데이터는 링잉 UI에는 이미
             * peekCached 로 먼저 표시됐으므로 여기서는 서버 회원 카드를 재확인한다.
             */
            peekCached(context, rawNumber)?.let { cached ->
                if (requiresAuthoritativeRefresh(cached)) {
                    localSafeFallback = cached
                } else {
                    bg.execute { reportLineCallEvent(context, rawNumber) }
                    return cached
                }
            }

            /* 공공 디렉터리 로컬 인덱스 — 서버 회원 조회 실패 때 사용할 폴백 */
            if (localSafeFallback == null) {
                PublicDirectoryPhoneCache.peek(context, rawNumber)?.let { hit ->
                    val json = buildPublicDirectorySafeJson(rawNumber, hit.displayName)
                    val synth = CardLookupResult(
                        matched = true,
                        verified = true,
                        displayName = hit.displayName,
                        rawJson = json
                    )
                    remember(context, rawNumber, synth)
                    localSafeFallback = synth
                }
            }
            PublicDirectoryPhoneCache.scheduleSyncIfStale(context)

            val base = BuildConfig.API_BASE_URL.trimEnd('/')
            val agency = NationalAgencyWhitelist.match(rawNumber)
            val numberParam = agency?.shortNumber ?: e164
            val result = lookupOnce(context, base, numberParam, dcpRoute, fast = fast)
            if (result != null && result.matched) {
                val filled =
                    result.copy(rawJson = OverlayCardOrgFill.fillIfMissing(context, result.rawJson))
                remember(context, rawNumber, filled)
                /* API 가 디렉터리 히트면 로컬 인덱스에도 적재 */
                try {
                    val pj = JSONObject(filled.rawJson)
                    if (pj.optString("profileKind") == "public_directory_safe") {
                        PublicDirectoryPhoneCache.remember(
                            pj.optString("phoneE164").ifBlank { rawNumber },
                            filled.displayName
                        )
                    }
                } catch (_: Exception) {
                }
                bg.execute {
                    reportLineCallEvent(context, rawNumber)
                }
                return filled
            }
            /* fast 타임아웃은 null 유지 → coordinator가 lookupSlow를 한 번 더 수행 */
            if (result == null && fast) return null
            return localSafeFallback ?: result
    }

    private fun buildPublicDirectorySafeJson(rawNumber: String, displayName: String): String {
        val e164 = CardLookupBridge.normalizeKr(rawNumber) ?: rawNumber
        return JSONObject()
            .put("matched", true)
            .put("is_verified", true)
            .put("source", "public_directory_local")
            .put("profileKind", "public_directory_safe")
            .put("displayName", displayName)
            .put("companyName", displayName)
            .put("phoneE164", e164)
            .put("membershipTier", "free")
            .put(
                "directory",
                JSONObject().put("vlueAuthLabel", "VLUE 인증")
            )
            .put(
                "dcp",
                JSONObject()
                    .put("routeStatus", "normal")
                    .put("publicDirectorySafe", true)
                    .put("contactName", displayName)
            )
            .toString()
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

    private fun diskKey(rawNumber: String): String {
        val canon = IncomingNumberResolver.canonicalDigits(rawNumber)
        return if (canon.isNotEmpty()) canon
        else CardLookupBridge.normalizeKr(rawNumber) ?: rawNumber.trim()
    }

    private fun writeDisk(context: Context, rawNumber: String, result: CardLookupResult) {
        try {
            val key = diskKey(rawNumber)
            if (key.isBlank()) return
            context.getSharedPreferences(DISK_PREFS, Context.MODE_PRIVATE)
                .edit()
                .putString(key, result.rawJson)
                .putLong("${key}_at", System.currentTimeMillis())
                .putBoolean("${key}_verified", result.verified)
                .putString("${key}_name", result.displayName)
                .apply()
        } catch (_: Exception) {
            /* ignore */
        }
    }

    private fun readDisk(context: Context, rawNumber: String): CardLookupResult? {
        return try {
            val key = diskKey(rawNumber)
            if (key.isBlank()) return null
            val prefs = context.getSharedPreferences(DISK_PREFS, Context.MODE_PRIVATE)
            val at = prefs.getLong("${key}_at", 0L)
            if (at <= 0L || System.currentTimeMillis() - at > DISK_TTL_MS) return null
            val body = prefs.getString(key, null)?.trim().orEmpty()
            if (body.isEmpty()) return null
            val json = JSONObject(body)
            if (!json.optBoolean("matched", false)) return null
            CardLookupResult(
                matched = true,
                verified = prefs.getBoolean("${key}_verified", json.optBoolean("is_verified", true)),
                displayName =
                    prefs.getString("${key}_name", null)?.ifBlank { null }
                        ?: json.optString("displayName", ""),
                rawJson = body
            )
        } catch (_: Exception) {
            null
        }
    }

    private fun lookupOnce(
        context: Context,
        base: String,
        numberParam: String,
        dcpRoute: String? = null,
        fast: Boolean = true
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
                /*
                 * 콜 오버레이 첫 페인트용: 짧게 끊고 캐시/재시도로 보완.
                 * 백그라운드 갱신(fast=false)은 여유 있게.
                 */
                connectTimeout = if (fast) 2_500 else 5_000
                readTimeout = if (fast) 3_500 else 12_000
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

    /** 발신 폰에서 원격·악성앱이 실행 중일 때 — 수신 VLUÉ 회원이 비정상을 볼 수 있게 보고 */
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
