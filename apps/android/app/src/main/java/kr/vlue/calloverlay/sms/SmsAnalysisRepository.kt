package kr.vlue.calloverlay.sms

import android.content.Context
import android.provider.Telephony
import com.google.gson.Gson
import com.google.gson.annotations.SerializedName
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kr.vlue.calloverlay.BuildConfig
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

data class SmsAnalysisResult(
    val status: String,
    val dangerScore: Int,
    val unshortenedUrl: String?,
    val summary: String,
    val actionGuide: String
)

data class SmsInboxMessage(
    val id: Long,
    val address: String,
    val body: String,
    val dateMs: Long,
    val incoming: Boolean
)

/** Edge Function `analyze-sms` invoke. 키는 local.properties `vlue.supabase.url` / `vlue.supabase.anon.key`. */
class SupabaseFunctions(
    private val baseUrl: String,
    private val anonKey: String
) {
    fun invoke(name: String, payload: JSONObject): String {
        val root = baseUrl.trim().trimEnd('/')
        if (!root.startsWith("https://") || anonKey.isBlank()) {
            throw IllegalStateException("Supabase URL과 anon 키가 없습니다. local.properties에 vlue.supabase.url, vlue.supabase.anon.key를 넣어 주세요.")
        }
        val connection = (URL("$root/functions/v1/$name").openConnection() as HttpURLConnection).apply {
            requestMethod = "POST"
            connectTimeout = 20_000
            readTimeout = 40_000
            doOutput = true
            setRequestProperty("Content-Type", "application/json")
            setRequestProperty("apikey", anonKey)
            setRequestProperty("Authorization", "Bearer $anonKey")
        }
        connection.outputStream.use { it.write(payload.toString().toByteArray(Charsets.UTF_8)) }
        val code = connection.responseCode
        val stream = if (code in 200..299) connection.inputStream else connection.errorStream
        val body = stream?.bufferedReader()?.use { it.readText() }.orEmpty()
        if (code !in 200..299) {
            throw IllegalStateException(body.ifBlank { "analyze-sms HTTP $code" })
        }
        return body
    }
}

class SmsAnalysisRepository(private val context: Context) {
    private val gson = Gson()
    private val functions = SupabaseFunctions(BuildConfig.SUPABASE_URL, BuildConfig.SUPABASE_ANON_KEY)

    fun loadInbox(limit: Int = 80): List<SmsInboxMessage> {
        val out = ArrayList<SmsInboxMessage>()
        val cursor = context.contentResolver.query(
            Telephony.Sms.CONTENT_URI,
            arrayOf(
                Telephony.Sms._ID,
                Telephony.Sms.ADDRESS,
                Telephony.Sms.BODY,
                Telephony.Sms.DATE,
                Telephony.Sms.TYPE
            ),
            null,
            null,
            "${Telephony.Sms.DATE} DESC LIMIT $limit"
        ) ?: return out
        cursor.use {
            val idCol = it.getColumnIndex(Telephony.Sms._ID)
            val addressCol = it.getColumnIndex(Telephony.Sms.ADDRESS)
            val bodyCol = it.getColumnIndex(Telephony.Sms.BODY)
            val dateCol = it.getColumnIndex(Telephony.Sms.DATE)
            val typeCol = it.getColumnIndex(Telephony.Sms.TYPE)
            while (it.moveToNext()) {
                val type = if (typeCol >= 0) it.getInt(typeCol) else Telephony.Sms.MESSAGE_TYPE_INBOX
                out.add(
                    SmsInboxMessage(
                        id = if (idCol >= 0) it.getLong(idCol) else out.size.toLong(),
                        address = if (addressCol >= 0) it.getString(addressCol).orEmpty() else "",
                        body = if (bodyCol >= 0) it.getString(bodyCol).orEmpty() else "",
                        dateMs = if (dateCol >= 0) it.getLong(dateCol) else 0L,
                        incoming = type != Telephony.Sms.MESSAGE_TYPE_SENT
                    )
                )
            }
        }
        return out
    }

    suspend fun analyze(message: SmsInboxMessage): SmsAnalysisResult = withContext(Dispatchers.IO) {
        val payload = JSONObject()
            .put("sender", message.address)
            .put("messageText", message.body)
        val raw = functions.invoke("analyze-sms", payload)
        val parsed = gson.fromJson(raw, SmsAnalysisDto::class.java)
            ?: throw IllegalStateException("분석 응답이 비어 있습니다.")
        if (!parsed.error.isNullOrBlank()) throw IllegalStateException(parsed.error)
        val status = parsed.status?.uppercase().orEmpty()
        if (status != "SAFE" && status != "SUSPICIOUS" && status != "DANGER") {
            throw IllegalStateException("알 수 없는 분석 상태입니다.")
        }
        SmsAnalysisResult(
            status = status,
            dangerScore = parsed.dangerScore.coerceIn(0, 100),
            unshortenedUrl = parsed.unshortenedUrl?.trim()?.ifBlank { null },
            summary = parsed.summary?.trim().orEmpty().take(40),
            actionGuide = parsed.actionGuide?.trim().orEmpty()
        )
    }
}

private data class SmsAnalysisDto(
    val status: String? = null,
    val dangerScore: Int = 0,
    val unshortenedUrl: String? = null,
    val summary: String? = null,
    val actionGuide: String? = null,
    @SerializedName("error") val error: String? = null
)
