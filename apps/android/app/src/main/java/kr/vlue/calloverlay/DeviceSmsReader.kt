package kr.vlue.calloverlay

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.provider.ContactsContract
import android.provider.Telephony
import androidx.core.content.ContextCompat
import org.json.JSONArray
import org.json.JSONObject

/** 앱 문자함 — content://sms 를 최신순으로 읽고 발신자별 대화방으로 묶는다. */
object DeviceSmsReader {
    private const val SCAN_LIMIT = 400
    private const val THREAD_LIMIT = 80
    private const val MESSAGE_LIMIT = 200
    private const val PREFS = "vlue_sms_read_marks"

    fun hasPermission(context: Context): Boolean =
        ContextCompat.checkSelfPermission(context, Manifest.permission.READ_SMS) ==
            PackageManager.PERMISSION_GRANTED

    fun readThreadsJson(context: Context): String {
        if (!hasPermission(context)) {
            return JSONObject()
                .put("ok", false)
                .put("permission", false)
                .put("threads", JSONArray())
                .toString()
        }
        val names = contactNames(context)
        val readMarks = readMarks(context)
        val threads = LinkedHashMap<String, JSONObject>()
        val resolver = context.contentResolver
        resolver.query(
            Telephony.Sms.CONTENT_URI,
            arrayOf(
                Telephony.Sms._ID,
                Telephony.Sms.THREAD_ID,
                Telephony.Sms.ADDRESS,
                Telephony.Sms.BODY,
                Telephony.Sms.DATE,
                Telephony.Sms.READ,
                Telephony.Sms.TYPE
            ),
            null,
            null,
            "${Telephony.Sms.DATE} DESC"
        )?.use { cursor ->
            val threadCol = cursor.getColumnIndex(Telephony.Sms.THREAD_ID)
            val addressCol = cursor.getColumnIndex(Telephony.Sms.ADDRESS)
            val bodyCol = cursor.getColumnIndex(Telephony.Sms.BODY)
            val dateCol = cursor.getColumnIndex(Telephony.Sms.DATE)
            val readCol = cursor.getColumnIndex(Telephony.Sms.READ)
            val typeCol = cursor.getColumnIndex(Telephony.Sms.TYPE)
            var scanned = 0
            while (cursor.moveToNext() && scanned < SCAN_LIMIT) {
                scanned += 1
                val address = if (addressCol >= 0) cursor.getString(addressCol).orEmpty() else ""
                val threadId = if (threadCol >= 0) cursor.getLong(threadCol) else -1L
                val key = if (threadId > 0L) "t:$threadId" else "a:${phoneKey(address)}"
                val existing = threads[key]
                val dateMs = if (dateCol >= 0) cursor.getLong(dateCol) else 0L
                val markedUntil = readMarks[key] ?: 0L
                val unread = dateMs > markedUntil &&
                    readCol >= 0 && cursor.getInt(readCol) == 0 &&
                    (typeCol < 0 || cursor.getInt(typeCol) != Telephony.Sms.MESSAGE_TYPE_SENT)
                if (existing == null) {
                    if (threads.size >= THREAD_LIMIT) continue
                    val display = names[phoneKey(address)].orEmpty()
                    threads[key] = JSONObject()
                        .put("id", key)
                        .put("threadId", threadId)
                        .put("address", address)
                        .put("name", display)
                        .put("snippet", if (bodyCol >= 0) cursor.getString(bodyCol).orEmpty() else "")
                        .put("dateMs", if (dateCol >= 0) cursor.getLong(dateCol) else 0L)
                        .put("unread", if (unread) 1 else 0)
                } else if (unread) {
                    existing.put("unread", existing.optInt("unread") + 1)
                }
            }
        }
        val arr = JSONArray()
        threads.values.forEach { arr.put(it) }
        return JSONObject().put("ok", true).put("permission", true).put("threads", arr).toString()
    }

    fun readMessagesJson(context: Context, threadKey: String, address: String): String {
        if (!hasPermission(context)) {
            return JSONObject().put("ok", false).put("permission", false).put("messages", JSONArray()).toString()
        }
        val messages = JSONArray()
        val threadId = threadKey.removePrefix("t:").toLongOrNull()?.takeIf { threadKey.startsWith("t:") }
        val selection: String?
        val args: Array<String>?
        if (threadId != null && threadId > 0L) {
            selection = "${Telephony.Sms.THREAD_ID}=?"
            args = arrayOf(threadId.toString())
        } else {
            selection = null
            args = null
        }
        val rows = ArrayList<JSONObject>()
        context.contentResolver.query(
            Telephony.Sms.CONTENT_URI,
            arrayOf(
                Telephony.Sms._ID,
                Telephony.Sms.ADDRESS,
                Telephony.Sms.BODY,
                Telephony.Sms.DATE,
                Telephony.Sms.TYPE,
                Telephony.Sms.THREAD_ID
            ),
            selection,
            args,
            "${Telephony.Sms.DATE} DESC"
        )?.use { cursor ->
            val idCol = cursor.getColumnIndex(Telephony.Sms._ID)
            val addressCol = cursor.getColumnIndex(Telephony.Sms.ADDRESS)
            val bodyCol = cursor.getColumnIndex(Telephony.Sms.BODY)
            val dateCol = cursor.getColumnIndex(Telephony.Sms.DATE)
            val typeCol = cursor.getColumnIndex(Telephony.Sms.TYPE)
            val wantKey = phoneKey(address)
            var count = 0
            while (cursor.moveToNext() && count < MESSAGE_LIMIT) {
                val rowAddress = if (addressCol >= 0) cursor.getString(addressCol).orEmpty() else ""
                if (threadId == null && phoneKey(rowAddress) != wantKey) continue
                count += 1
                val type = if (typeCol >= 0) cursor.getInt(typeCol) else Telephony.Sms.MESSAGE_TYPE_INBOX
                rows.add(
                    JSONObject()
                        .put("id", if (idCol >= 0) cursor.getLong(idCol) else count)
                        .put("address", rowAddress)
                        .put("body", if (bodyCol >= 0) cursor.getString(bodyCol).orEmpty() else "")
                        .put("dateMs", if (dateCol >= 0) cursor.getLong(dateCol) else 0L)
                        .put("incoming", type != Telephony.Sms.MESSAGE_TYPE_SENT)
                )
            }
        }
        for (i in rows.size - 1 downTo 0) messages.put(rows[i])
        return JSONObject().put("ok", true).put("permission", true).put("messages", messages).toString()
    }

    /** 대화방 진입 시 읽음. 기본 문자 앱이 아니면 DB 쓰기가 거절되므로 앱 표시 시각도 같이 남긴다. */
    fun markThreadRead(context: Context, threadKey: String, address: String, seenUntilMs: Long): String {
        if (!hasPermission(context)) {
            return JSONObject().put("ok", false).put("permission", false).toString()
        }
        val threadId = threadKey.removePrefix("t:").toLongOrNull()?.takeIf { threadKey.startsWith("t:") }
        var updated = 0
        try {
            val values = android.content.ContentValues().apply { put(Telephony.Sms.READ, 1) }
            updated = if (threadId != null && threadId > 0L) {
                context.contentResolver.update(
                    Telephony.Sms.CONTENT_URI,
                    values,
                    "${Telephony.Sms.THREAD_ID}=? AND ${Telephony.Sms.READ}=0",
                    arrayOf(threadId.toString())
                )
            } else {
                0
            }
        } catch (_: SecurityException) {
            updated = 0
        }
        val until = seenUntilMs.coerceAtLeast(System.currentTimeMillis())
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .edit()
            .putLong(threadKey.ifBlank { "a:${phoneKey(address)}" }, until)
            .apply()
        return JSONObject().put("ok", true).put("updated", updated).put("seenUntilMs", until).toString()
    }

    private fun readMarks(context: Context): Map<String, Long> {
        val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        val out = HashMap<String, Long>()
        for ((key, value) in prefs.all) {
            val millis = (value as? Long) ?: (value as? Int)?.toLong() ?: continue
            out[key] = millis
        }
        return out
    }

    private fun phoneKey(raw: String): String {
        val digits = raw.filter { it.isDigit() }
        return when {
            digits.startsWith("82") && digits.length > 9 -> "0" + digits.drop(2)
            else -> digits.ifBlank { raw.trim() }
        }
    }

    private fun contactNames(context: Context): Map<String, String> {
        if (ContextCompat.checkSelfPermission(context, Manifest.permission.READ_CONTACTS)
            != PackageManager.PERMISSION_GRANTED
        ) {
            return emptyMap()
        }
        val out = HashMap<String, String>()
        context.contentResolver.query(
            ContactsContract.CommonDataKinds.Phone.CONTENT_URI,
            arrayOf(
                ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME,
                ContactsContract.CommonDataKinds.Phone.NUMBER
            ),
            null,
            null,
            null
        )?.use { cursor ->
            val nameCol = cursor.getColumnIndex(ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME)
            val numberCol = cursor.getColumnIndex(ContactsContract.CommonDataKinds.Phone.NUMBER)
            while (cursor.moveToNext()) {
                val number = if (numberCol >= 0) cursor.getString(numberCol).orEmpty() else ""
                val name = if (nameCol >= 0) cursor.getString(nameCol).orEmpty().trim() else ""
                val key = phoneKey(number)
                if (key.isNotBlank() && name.isNotBlank()) out.putIfAbsent(key, name)
            }
        }
        return out
    }
}
