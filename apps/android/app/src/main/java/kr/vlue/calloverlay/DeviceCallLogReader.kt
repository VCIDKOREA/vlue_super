package kr.vlue.calloverlay

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.database.Cursor
import android.provider.CallLog
import android.util.Log
import androidx.core.content.ContextCompat
import org.json.JSONArray
import org.json.JSONObject

/**
 * 앱「통화 목록」용 — 시스템 CallLog 최근 건 JSON.
 * 가족보호 FamilyCallLogHelper 와 분리 (목록 SoT 전용).
 */
object DeviceCallLogReader {
    private const val TAG = "DeviceCallLogReader"
    private const val DEFAULT_LIMIT = 200
    private const val MAX_LIMIT = 500

    fun readAsJson(context: Context, limitRaw: Int = DEFAULT_LIMIT): String {
        if (ContextCompat.checkSelfPermission(context, Manifest.permission.READ_CALL_LOG)
            != PackageManager.PERMISSION_GRANTED
        ) {
            return JSONArray().toString()
        }
        val limit = limitRaw.coerceIn(1, MAX_LIMIT)
        val resolver = context.contentResolver
        val projection = arrayOf(
            CallLog.Calls._ID,
            CallLog.Calls.NUMBER,
            CallLog.Calls.DURATION,
            CallLog.Calls.TYPE,
            CallLog.Calls.DATE
        )
        var cursor: Cursor? = null
        val out = JSONArray()
        return try {
            cursor = resolver.query(
                CallLog.Calls.CONTENT_URI,
                projection,
                null,
                null,
                "${CallLog.Calls.DATE} DESC"
            )
            if (cursor == null) return out.toString()
            var n = 0
            while (cursor.moveToNext() && n < limit) {
                val id = cursor.getLong(0)
                val number = cursor.getString(1).orEmpty().trim()
                if (number.isEmpty()) continue
                val durationSec = cursor.getLong(2).toInt().coerceAtLeast(0)
                val type = cursor.getInt(3)
                val dateMs = cursor.getLong(4)
                val direction = when (type) {
                    CallLog.Calls.OUTGOING_TYPE -> "out"
                    CallLog.Calls.INCOMING_TYPE -> "in"
                    CallLog.Calls.MISSED_TYPE -> "in"
                    else -> "in"
                }
                val callState =
                    if (type == CallLog.Calls.MISSED_TYPE || durationSec <= 0) "missed" else "ended"
                out.put(
                    JSONObject()
                        .put("id", "clog-$id")
                        .put("phone", number)
                        .put("durationSec", durationSec)
                        .put("direction", direction)
                        .put("type", type)
                        .put("dateMs", dateMs)
                        .put("callState", callState)
                )
                n++
            }
            out.toString()
        } catch (e: SecurityException) {
            Log.e(TAG, "permission denied", e)
            JSONArray().toString()
        } catch (e: Exception) {
            Log.e(TAG, "query failed", e)
            JSONArray().toString()
        } finally {
            cursor?.close()
        }
    }
}
