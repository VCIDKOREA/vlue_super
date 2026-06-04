package kr.vlue.calloverlay

import android.content.Context

object CardLookupBridge {
    fun normalizeKr(raw: String): String? {
        val d = raw.filter { it.isDigit() }
        if (d.isEmpty()) return null
        return when {
            d.startsWith("82") -> "+$d"
            d.startsWith("0") && d.length >= 9 -> "+82${d.drop(1)}"
            else -> "+82$d"
        }
    }

    @Deprecated("Use LetteringCallCoordinator.onRinging")
    fun onIncomingNumber(context: Context, rawNumber: String) {
        LetteringCallCoordinator.onRinging(context, rawNumber, outgoing = false)
    }
}
