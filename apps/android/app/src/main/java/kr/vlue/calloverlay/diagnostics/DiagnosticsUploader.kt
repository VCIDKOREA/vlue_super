package kr.vlue.calloverlay.diagnostics

import android.content.Context
import android.util.Log
import kr.vlue.calloverlay.BuildConfig
import kr.vlue.calloverlay.LetteringPrefs
import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

/** HTTPS upload for diagnostics (CardLookupRepository-style HttpURLConnection). */
object DiagnosticsUploader {
    private const val TAG = "DiagnosticsUploader"

    fun postSession(context: Context, session: JSONObject): Boolean =
        postJson(context, "/api/diagnostics/sessions", session)

    fun postEvents(context: Context, session: JSONObject?, events: JSONArray): Boolean {
        val body = JSONObject().apply {
            if (session != null) put("session", session)
            put("events", events)
        }
        return postJson(context, "/api/diagnostics/events", body)
    }

    private fun postJson(context: Context, path: String, body: JSONObject): Boolean {
        if (!DiagnosticsRemoteGate.ENABLED) return true
        val base = BuildConfig.API_BASE_URL.trimEnd('/')
        val url = URL("$base$path")
        var conn: HttpURLConnection? = null
        return try {
            conn = (url.openConnection() as HttpURLConnection).apply {
                requestMethod = "POST"
                connectTimeout = 8000
                readTimeout = 10000
                doOutput = true
                setRequestProperty("Content-Type", "application/json; charset=utf-8")
                LetteringPrefs.getAccessToken(context)?.let {
                    setRequestProperty("Authorization", "Bearer $it")
                }
                LetteringPrefs.getUserId(context)?.let {
                    setRequestProperty("X-VLUE-User-Id", it)
                }
                val deviceId = body.optString("deviceId").ifBlank {
                    body.optJSONObject("session")?.optString("deviceId").orEmpty()
                }
                if (deviceId.isNotBlank()) {
                    setRequestProperty("X-VLUE-Device-Id", deviceId)
                }
            }
            conn!!.outputStream.use { os ->
                os.write(body.toString().toByteArray(Charsets.UTF_8))
            }
            val code = conn.responseCode
            code in 200..299
        } catch (e: Exception) {
            Log.w(TAG, "post $path failed: ${e.message}")
            false
        } finally {
            conn?.disconnect()
        }
    }
}
