package kr.vlue.calloverlay.family

import android.content.Context
import android.database.Cursor
import android.provider.CallLog
import android.util.Log

data class LastCallSnapshot(
    val phone: String,
    val durationSec: Int,
    val direction: String,
    val callType: Int
)

object FamilyCallLogHelper {
    private const val TAG = "FamilyCallLog"

    fun readLatestCall(context: Context, sinceMs: Long = 0L): LastCallSnapshot? {
        if (!FamilyPermissionHelper.hasCallLogPermission(context)) return null
        val resolver = context.contentResolver
        val projection = arrayOf(
            CallLog.Calls.NUMBER,
            CallLog.Calls.DURATION,
            CallLog.Calls.TYPE,
            CallLog.Calls.DATE
        )
        val selection = if (sinceMs > 0L) "${CallLog.Calls.DATE} >= ?" else null
        val args = if (sinceMs > 0L) arrayOf(sinceMs.toString()) else null
        var cursor: Cursor? = null
        return try {
            cursor = resolver.query(
                CallLog.Calls.CONTENT_URI,
                projection,
                selection,
                args,
                "${CallLog.Calls.DATE} DESC"
            )
            if (cursor == null || !cursor.moveToFirst()) return null
            val number = cursor.getString(0).orEmpty()
            val duration = cursor.getLong(1).toInt()
            val type = cursor.getInt(2)
            val direction = when (type) {
                CallLog.Calls.OUTGOING_TYPE -> "out"
                CallLog.Calls.INCOMING_TYPE -> "in"
                CallLog.Calls.MISSED_TYPE -> "in"
                else -> "in"
            }
            LastCallSnapshot(number, duration, direction, type)
        } catch (e: SecurityException) {
            Log.e(TAG, "permission denied", e)
            null
        } catch (e: Exception) {
            Log.e(TAG, "query failed", e)
            null
        } finally {
            cursor?.close()
        }
    }

    fun readRecentMissedCount(context: Context, windowMs: Long = 60_000L): Int {
        val since = System.currentTimeMillis() - windowMs
        if (!FamilyPermissionHelper.hasCallLogPermission(context)) return 0
        var cursor: Cursor? = null
        return try {
            cursor = context.contentResolver.query(
                CallLog.Calls.CONTENT_URI,
                arrayOf(CallLog.Calls._ID),
                "${CallLog.Calls.TYPE} = ? AND ${CallLog.Calls.DATE} >= ?",
                arrayOf(CallLog.Calls.MISSED_TYPE.toString(), since.toString()),
                null
            )
            cursor?.count ?: 0
        } catch (e: Exception) {
            0
        } finally {
            cursor?.close()
        }
    }
}
