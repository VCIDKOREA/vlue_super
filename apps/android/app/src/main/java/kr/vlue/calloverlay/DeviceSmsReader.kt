package kr.vlue.calloverlay

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.net.Uri
import android.provider.ContactsContract
import android.provider.Telephony
import androidx.core.content.ContextCompat
import org.json.JSONArray
import org.json.JSONObject

/** 앱 문자함 — 삼성 메시지와 같이 대화방 전체를 읽는다. SMS와 MMS를 함께 포함한다. */
object DeviceSmsReader {
    private const val THREAD_LIMIT = 400
    private const val MESSAGE_LIMIT = 1000
    private const val FALLBACK_SCAN_LIMIT = 5000
    private val CONVERSATIONS_URI: Uri = Uri.parse("content://mms-sms/conversations?simple=true")
    private val CANONICAL_URI: Uri = Uri.parse("content://mms-sms/canonical-addresses")
    private val MMS_URI: Uri = Uri.parse("content://mms")
    private val MMS_PART_URI: Uri = Uri.parse("content://mms/part")
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
        val canonical = canonicalAddresses(context)
        val threads = LinkedHashMap<String, JSONObject>()
        readConversationThreads(context, names, readMarks, canonical, threads)
        if (threads.isEmpty()) {
            readSmsScanThreads(context, names, readMarks, threads)
        }
        fillSnippetsFromSmsBodies(context, threads)
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
        appendSmsRows(context, selection, args, address, rows)
        if (threadId != null && threadId > 0L) appendMmsRows(context, threadId, rows)
        rows.sortByDescending { it.optLong("dateMs") }
        if (rows.size > MESSAGE_LIMIT) {
            val kept = rows.take(MESSAGE_LIMIT)
            rows.clear()
            rows.addAll(kept)
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

    private fun readConversationThreads(
        context: Context,
        names: Map<String, String>,
        readMarks: Map<String, Long>,
        canonical: Map<Long, String>,
        threads: LinkedHashMap<String, JSONObject>
    ) {
        val cursor = try {
            context.contentResolver.query(CONVERSATIONS_URI, null, null, null, "date DESC")
        } catch (_: Exception) {
            null
        } ?: return
        cursor.use {
            val idCol = firstColumn(it, "_id", "thread_id")
            val dateCol = it.getColumnIndex("date")
            val snippetCol = firstColumn(it, "snippet", "body")
            val readCol = it.getColumnIndex("read")
            val unreadCountCol = firstColumn(it, "unread_count", "unread")
            val recipientCol = firstColumn(it, "recipient_ids", "address")
            while (it.moveToNext() && threads.size < THREAD_LIMIT) {
                val threadId = if (idCol >= 0) it.getLong(idCol) else -1L
                if (threadId <= 0L) continue
                val address = addressForRecipients(
                    if (recipientCol >= 0) it.getString(recipientCol).orEmpty() else "",
                    canonical
                )
                val key = "t:$threadId"
                val dateMs = normalizeEpoch(if (dateCol >= 0) it.getLong(dateCol) else 0L)
                val markedUntil = readMarks[key] ?: 0L
                val unread = when {
                    dateMs <= markedUntil -> 0
                    unreadCountCol >= 0 -> it.getInt(unreadCountCol).coerceAtLeast(0)
                    readCol >= 0 && it.getInt(readCol) == 0 -> 1
                    else -> 0
                }
                threads[key] = JSONObject()
                    .put("id", key)
                    .put("threadId", threadId)
                    .put("address", address)
                    .put("name", names[phoneKey(address)].orEmpty())
                    .put("snippet", repairSmsText(snippetText(it, snippetCol)))
                    .put("dateMs", dateMs)
                    .put("unread", unread)
            }
        }
    }

    private fun readSmsScanThreads(
        context: Context,
        names: Map<String, String>,
        readMarks: Map<String, Long>,
        threads: LinkedHashMap<String, JSONObject>
    ) {
        context.contentResolver.query(
            Telephony.Sms.CONTENT_URI,
            arrayOf(
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
            while (cursor.moveToNext() && scanned < FALLBACK_SCAN_LIMIT && threads.size < THREAD_LIMIT) {
                scanned += 1
                val address = if (addressCol >= 0) cursor.getString(addressCol).orEmpty() else ""
                val threadId = if (threadCol >= 0) cursor.getLong(threadCol) else -1L
                val key = if (threadId > 0L) "t:$threadId" else "a:${phoneKey(address)}"
                val dateMs = if (dateCol >= 0) cursor.getLong(dateCol) else 0L
                val markedUntil = readMarks[key] ?: 0L
                val unread = dateMs > markedUntil &&
                    readCol >= 0 && cursor.getInt(readCol) == 0 &&
                    (typeCol < 0 || cursor.getInt(typeCol) != Telephony.Sms.MESSAGE_TYPE_SENT)
                val existing = threads[key]
                if (existing == null) {
                    threads[key] = JSONObject()
                        .put("id", key)
                        .put("threadId", threadId)
                        .put("address", address)
                        .put("name", names[phoneKey(address)].orEmpty())
                        .put("snippet", if (bodyCol >= 0) cursor.getString(bodyCol).orEmpty() else "")
                        .put("dateMs", dateMs)
                        .put("unread", if (unread) 1 else 0)
                } else if (unread) {
                    existing.put("unread", existing.optInt("unread") + 1)
                }
            }
        }
    }

    private fun appendSmsRows(
        context: Context,
        selection: String?,
        args: Array<String>?,
        address: String,
        rows: ArrayList<JSONObject>
    ) {
        context.contentResolver.query(
            Telephony.Sms.CONTENT_URI,
            arrayOf(
                Telephony.Sms._ID,
                Telephony.Sms.ADDRESS,
                Telephony.Sms.BODY,
                Telephony.Sms.DATE,
                Telephony.Sms.TYPE
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
                if (selection == null && phoneKey(rowAddress) != wantKey) continue
                count += 1
                val type = if (typeCol >= 0) cursor.getInt(typeCol) else Telephony.Sms.MESSAGE_TYPE_INBOX
                rows.add(
                    JSONObject()
                        .put("id", if (idCol >= 0) "s${cursor.getLong(idCol)}" else "s$count")
                        .put("address", rowAddress)
                        .put("body", repairSmsText(if (bodyCol >= 0) cursor.getString(bodyCol).orEmpty() else ""))
                        .put("dateMs", if (dateCol >= 0) cursor.getLong(dateCol) else 0L)
                        .put("incoming", type != Telephony.Sms.MESSAGE_TYPE_SENT)
                )
            }
        }
    }

    private fun appendMmsRows(context: Context, threadId: Long, rows: ArrayList<JSONObject>) {
        val cursor = try {
            context.contentResolver.query(
                MMS_URI,
                arrayOf("_id", "date", "msg_box", "sub", "thread_id"),
                "thread_id=?",
                arrayOf(threadId.toString()),
                "date DESC"
            )
        } catch (_: Exception) {
            null
        } ?: return
        cursor.use {
            val idCol = it.getColumnIndex("_id")
            val dateCol = it.getColumnIndex("date")
            val boxCol = it.getColumnIndex("msg_box")
            val subCol = it.getColumnIndex("sub")
            var count = 0
            while (it.moveToNext() && count < MESSAGE_LIMIT) {
                val id = if (idCol >= 0) it.getLong(idCol) else continue
                count += 1
                val body = mmsText(context, id).ifBlank {
                    if (subCol >= 0) it.getString(subCol).orEmpty() else ""
                }.ifBlank { "(사진/첨부 메시지)" }
                val box = if (boxCol >= 0) it.getInt(boxCol) else 1
                rows.add(
                    JSONObject()
                        .put("id", "m$id")
                        .put("address", "")
                        .put("body", body)
                        .put("dateMs", normalizeEpoch(if (dateCol >= 0) it.getLong(dateCol) else 0L))
                        .put("incoming", box != 2)
                )
            }
        }
    }

    private fun mmsText(context: Context, mmsId: Long): String {
        val cursor = try {
            context.contentResolver.query(
                MMS_PART_URI,
                arrayOf("ct", "text"),
                "mid=?",
                arrayOf(mmsId.toString()),
                null
            )
        } catch (_: Exception) {
            null
        } ?: return ""
        val lines = ArrayList<String>()
        cursor.use {
            val ctCol = it.getColumnIndex("ct")
            val textCol = it.getColumnIndex("text")
            while (it.moveToNext()) {
                val mime = if (ctCol >= 0) it.getString(ctCol).orEmpty() else ""
                if (mime.startsWith("text/") && textCol >= 0) {
                    val text = it.getString(textCol).orEmpty().trim()
                    if (text.isNotEmpty()) lines.add(text)
                }
            }
        }
        return lines.joinToString("\n")
    }

    private fun canonicalAddresses(context: Context): Map<Long, String> {
        val out = HashMap<Long, String>()
        val cursor = try {
            context.contentResolver.query(CANONICAL_URI, arrayOf("_id", "address"), null, null, null)
        } catch (_: Exception) {
            null
        } ?: return out
        cursor.use {
            val idCol = it.getColumnIndex("_id")
            val addressCol = it.getColumnIndex("address")
            while (it.moveToNext()) {
                val id = if (idCol >= 0) it.getLong(idCol) else continue
                val address = if (addressCol >= 0) it.getString(addressCol).orEmpty() else ""
                if (address.isNotBlank()) out[id] = address
            }
        }
        return out
    }

    private fun addressForRecipients(raw: String, canonical: Map<Long, String>): String {
        val ids = raw.split(' ', ',').mapNotNull { it.trim().toLongOrNull() }
        val resolved = ids.mapNotNull { canonical[it] }.filter { it.isNotBlank() }
        if (resolved.isNotEmpty()) return resolved.joinToString(", ")
        return raw.trim()
    }

    private fun firstColumn(cursor: android.database.Cursor, vararg names: String): Int {
        for (name in names) {
            val index = cursor.getColumnIndex(name)
            if (index >= 0) return index
        }
        return -1
    }

    /** 대화방 snippet 컬럼은 UTF-8이 Latin-1로 읽혀 목록만 깨진다. 최신 SMS 본문으로 다시 채운다. */
    private fun fillSnippetsFromSmsBodies(context: Context, threads: LinkedHashMap<String, JSONObject>) {
        if (threads.isEmpty()) return
        val pending = threads.keys.filter { it.startsWith("t:") }.toMutableSet()
        if (pending.isEmpty()) return
        context.contentResolver.query(
            Telephony.Sms.CONTENT_URI,
            arrayOf(Telephony.Sms.THREAD_ID, Telephony.Sms.BODY),
            null,
            null,
            "${Telephony.Sms.DATE} DESC"
        )?.use { cursor ->
            val threadCol = cursor.getColumnIndex(Telephony.Sms.THREAD_ID)
            val bodyCol = cursor.getColumnIndex(Telephony.Sms.BODY)
            var scanned = 0
            while (cursor.moveToNext() && pending.isNotEmpty() && scanned < FALLBACK_SCAN_LIMIT) {
                scanned += 1
                val threadId = if (threadCol >= 0) cursor.getLong(threadCol) else continue
                val key = "t:$threadId"
                if (key !in pending) continue
                val body = repairSmsText(if (bodyCol >= 0) cursor.getString(bodyCol).orEmpty() else "")
                    .replace(Regex("\\s+"), " ")
                    .trim()
                if (body.isEmpty()) continue
                threads[key]?.put("snippet", body.take(140))
                pending.remove(key)
            }
        }
    }

    private fun snippetText(cursor: android.database.Cursor, snippetCol: Int): String {
        if (snippetCol < 0) return ""
        return try {
            val blob = cursor.getBlob(snippetCol)
            if (blob != null && blob.isNotEmpty()) String(blob, Charsets.UTF_8) else cursor.getString(snippetCol).orEmpty()
        } catch (_: Exception) {
            cursor.getString(snippetCol).orEmpty()
        }
    }

    private fun repairSmsText(raw: String): String {
        if (raw.isBlank() || raw.any { it in '\uAC00'..'\uD7A3' }) return raw
        if (raw.none { it.code in 0x80..0xFF }) return raw
        return try {
            val fixed = String(raw.toByteArray(Charsets.ISO_8859_1), Charsets.UTF_8)
            if (fixed.contains('\uFFFD') || fixed == raw) raw else fixed
        } catch (_: Exception) {
            raw
        }
    }

    private fun normalizeEpoch(raw: Long): Long {
        if (raw <= 0L) return 0L
        return if (raw < 10_000_000_000L) raw * 1000L else raw
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
