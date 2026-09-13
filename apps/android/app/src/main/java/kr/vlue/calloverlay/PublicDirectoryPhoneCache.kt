package kr.vlue.calloverlay

import android.content.Context
import android.util.Log
import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicBoolean

/**
 * 공공 디렉터리 전화→상호 로컬 인덱스.
 * 수신 시 매번 Supabase 풀스캔 대신: 메모리/디스크 캐시 → (미스 시) 기존 card lookup API.
 * 백그라운드에서 /api/v1/directory/sync 로 전화 있는 행만 증분 동기화.
 */
object PublicDirectoryPhoneCache {
    private const val TAG = "PublicDirPhoneCache"
    private const val PREFS = "vlue_public_directory_phone_v1"
    private const val KEY_MAP = "phone_map_json"
    private const val KEY_SYNCED_AT = "synced_at_ms"
    private const val SYNC_TTL_MS = 7L * 24L * 60L * 60L * 1000L
    private const val MAX_ENTRIES = 80_000

    private val mem = ConcurrentHashMap<String, String>()
    private val syncing = AtomicBoolean(false)
    private val bg by lazy { Executors.newSingleThreadExecutor() }

    data class Hit(val displayName: String, val phoneKey: String)

    fun peek(rawNumber: String): Hit? {
        val keys = digitKeys(rawNumber)
        for (k in keys) {
            val name = mem[k]
            if (!name.isNullOrBlank()) return Hit(name, k)
        }
        return null
    }

    fun peek(context: Context, rawNumber: String): Hit? {
        ensureLoaded(context)
        return peek(rawNumber)
    }

    fun remember(phoneDigitsOrE164: String, displayName: String) {
        val name = displayName.trim()
        if (name.isEmpty()) return
        for (k in digitKeys(phoneDigitsOrE164)) {
            if (k.length >= 8) mem[k] = name
        }
    }

    fun scheduleSyncIfStale(context: Context) {
        bg.execute {
            try {
                val prefs = context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                val syncedAt = prefs.getLong(KEY_SYNCED_AT, 0L)
                if (System.currentTimeMillis() - syncedAt < SYNC_TTL_MS && mem.isNotEmpty()) return@execute
                syncNow(context)
            } catch (e: Exception) {
                Log.w(TAG, "scheduleSyncIfStale: ${e.message}")
            }
        }
    }

    fun syncNow(context: Context) {
        if (!syncing.compareAndSet(false, true)) return
        try {
            ensureLoaded(context)
            val base = VlueLetteringConfig.apiBaseUrl.trimEnd('/')
            var cursor: String? = null
            var pages = 0
            val sinceIso = run {
                val prefs = context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                val at = prefs.getLong(KEY_SYNCED_AT, 0L)
                if (at > 0) java.time.Instant.ofEpochMilli(at).toString() else null
            }
            do {
                val qs = buildString {
                    append("limit=500")
                    if (!cursor.isNullOrBlank()) append("&cursor=").append(cursor)
                    if (!sinceIso.isNullOrBlank()) append("&since=").append(sinceIso)
                }
                val url = URL("$base/api/v1/directory/sync?$qs")
                val conn = (url.openConnection() as HttpURLConnection).apply {
                    connectTimeout = 12_000
                    readTimeout = 30_000
                    requestMethod = "GET"
                }
                val code = conn.responseCode
                val body = (if (code in 200..299) conn.inputStream else conn.errorStream)
                    ?.bufferedReader()
                    ?.use { it.readText() }
                    .orEmpty()
                conn.disconnect()
                if (code !in 200..299) {
                    Log.w(TAG, "sync http=$code")
                    break
                }
                val json = JSONObject(body)
                val entries = json.optJSONArray("entries") ?: JSONArray()
                for (i in 0 until entries.length()) {
                    val row = entries.optJSONObject(i) ?: continue
                    val name = row.optString("n").orEmpty()
                    val p = row.optString("p").orEmpty()
                    val d = row.optString("d").orEmpty()
                    if (name.isBlank()) continue
                    remember(p.ifBlank { d }, name)
                }
                cursor = json.optString("nextCursor").takeIf { it.isNotBlank() }
                pages++
                if (mem.size > MAX_ENTRIES) break
            } while (!cursor.isNullOrBlank() && pages < 40)

            persist(context)
            Log.i(TAG, "sync done entries=${mem.size} pages=$pages")
        } catch (e: Exception) {
            Log.w(TAG, "syncNow: ${e.message}")
        } finally {
            syncing.set(false)
        }
    }

    private fun ensureLoaded(context: Context) {
        if (mem.isNotEmpty()) return
        synchronized(mem) {
            if (mem.isNotEmpty()) return
            val prefs = context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            val raw = prefs.getString(KEY_MAP, "") ?: ""
            if (raw.isBlank()) return
            try {
                val obj = JSONObject(raw)
                val keys = obj.keys()
                while (keys.hasNext()) {
                    val k = keys.next()
                    val v = obj.optString(k)
                    if (k.length >= 8 && v.isNotBlank()) mem[k] = v
                }
            } catch (_: Exception) {
            }
        }
    }

    private fun persist(context: Context) {
        val obj = JSONObject()
        var n = 0
        for ((k, v) in mem) {
            if (n >= MAX_ENTRIES) break
            obj.put(k, v)
            n++
        }
        context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .edit()
            .putString(KEY_MAP, obj.toString())
            .putLong(KEY_SYNCED_AT, System.currentTimeMillis())
            .apply()
    }

    private fun digitKeys(raw: String): List<String> {
        val d = raw.filter { it.isDigit() }
        if (d.isEmpty()) return emptyList()
        val out = LinkedHashSet<String>()
        out.add(d)
        if (d.startsWith("82") && d.length > 2) {
            val rest = d.drop(2)
            out.add(rest)
            if (!rest.startsWith("0")) out.add("0$rest")
        }
        if (d.startsWith("0") && d.length > 1) out.add(d.drop(1))
        return out.toList()
    }
}
