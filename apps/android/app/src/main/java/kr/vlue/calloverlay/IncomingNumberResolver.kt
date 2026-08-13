package kr.vlue.calloverlay

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.provider.CallLog
import android.util.Log
import androidx.core.content.ContextCompat

/** TelephonyCallback 이 번호를 안 줄 때 CallLog 로 보완 */
object IncomingNumberResolver {
    private const val TAG = "IncomingNumberResolver"

    fun hasCallLogPermission(context: Context): Boolean =
        ContextCompat.checkSelfPermission(context, Manifest.permission.READ_CALL_LOG) ==
            PackageManager.PERMISSION_GRANTED

    /**
     * 최근 [windowMs] 내 가장 최신 통화 번호.
     * RINGING 직후엔 duration=0 인입 기록이 잡히는 경우가 많음.
     */
    fun resolveRecentNumber(context: Context, outgoing: Boolean, windowMs: Long = 45_000L): String? {
        if (!hasCallLogPermission(context)) {
            Log.w(TAG, "READ_CALL_LOG missing")
            return null
        }
        val since = System.currentTimeMillis() - windowMs
        val preferredType =
            if (outgoing) CallLog.Calls.OUTGOING_TYPE else CallLog.Calls.INCOMING_TYPE
        return try {
            context.contentResolver.query(
                CallLog.Calls.CONTENT_URI,
                arrayOf(
                    CallLog.Calls.NUMBER,
                    CallLog.Calls.TYPE,
                    CallLog.Calls.DATE,
                    CallLog.Calls.CACHED_FORMATTED_NUMBER
                ),
                "${CallLog.Calls.DATE} >= ?",
                arrayOf(since.toString()),
                "${CallLog.Calls.DATE} DESC"
            )?.use { c ->
                var fallback: String? = null
                while (c.moveToNext()) {
                    val raw = pickUsableNumber(c.getString(0), c.getString(3))
                    if (raw == null) continue
                    val type = c.getInt(1)
                    if (fallback == null) fallback = raw
                    val preferred =
                        type == preferredType ||
                            (!outgoing && type == CallLog.Calls.MISSED_TYPE)
                    if (preferred) {
                        Log.i(TAG, "resolved from CallLog type=$type")
                        return@use raw
                    }
                }
                if (fallback != null) {
                    Log.i(TAG, "resolved fallback latest CallLog")
                }
                fallback
            }
        } catch (e: SecurityException) {
            Log.e(TAG, "permission denied", e)
            null
        } catch (e: Exception) {
            Log.e(TAG, "query failed", e)
            null
        }
    }

    private fun pickUsableNumber(number: String?, formatted: String?): String? {
        val a = number?.trim().orEmpty()
        if (!isUnknown(a)) return a
        val b = formatted?.trim().orEmpty()
        if (!isUnknown(b)) return b
        return null
    }

    fun isUnknown(number: String?): Boolean {
        val n = number?.trim().orEmpty()
        if (n.isEmpty()) return true
        if (n == "-" || n == "—" || n == "-1") return true
        val lower = n.lowercase().replace("\\s".toRegex(), "")
        if (lower == "unknown" || lower == "null" || lower == "anonymous" ||
            lower == "private" || lower == "restricted" || lower == "withheld" ||
            lower == "알수없음" || lower == "알수없음."
        ) {
            return true
        }
        return n.none { it.isDigit() }
    }

    /**
     * 010-8014-4666 / 01080144666 / +821080144666 를 동일 번호로 취급.
     * Debounce·lookup 타이밍 레이스에서 서로 다른 문자열로 오인하지 않게 한다.
     */
    fun canonicalDigits(number: String?): String {
        val d = number?.filter { it.isDigit() }.orEmpty()
        if (d.isEmpty()) return ""
        return when {
            d.startsWith("82") -> d
            d.startsWith("0") -> "82${d.drop(1)}"
            else -> d
        }
    }

    fun sameCanonicalNumber(a: String?, b: String?): Boolean {
        val ca = canonicalDigits(a)
        val cb = canonicalDigits(b)
        return ca.isNotEmpty() && ca == cb
    }
}
