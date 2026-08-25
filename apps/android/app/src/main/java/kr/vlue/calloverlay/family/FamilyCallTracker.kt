package kr.vlue.calloverlay.family

import android.content.Context
import android.provider.CallLog
import android.telephony.TelephonyManager
import android.util.Log
import kr.vlue.calloverlay.DeviceContactsReader
import kr.vlue.calloverlay.KrPhoneKindClassifier

/**
 * PHONE_STATE → 가족보호 브릿지 이벤트 (레터링과 독립 동작)
 */
object FamilyCallTracker {
    private const val TAG = "FamilyCallTracker"

    private var lastState: String? = null
    private var ringingNumber: String? = null
    private var wasOffhook = false
    private var offhookSinceMs = 0L

    fun onPhoneStateChanged(context: Context, state: String?, number: String?) {
        val app = context.applicationContext
        when (state) {
            TelephonyManager.EXTRA_STATE_RINGING -> {
                ringingNumber = number?.trim().orEmpty().ifEmpty { null }
                wasOffhook = false
            }
            TelephonyManager.EXTRA_STATE_OFFHOOK -> {
                wasOffhook = true
                offhookSinceMs = System.currentTimeMillis()
                if (!number.isNullOrBlank()) ringingNumber = number.trim()
            }
            TelephonyManager.EXTRA_STATE_IDLE -> {
                handleIdle(app)
                ringingNumber = null
                wasOffhook = false
            }
        }
        lastState = state
    }

    private fun handleIdle(context: Context) {
        if (!FamilyPermissionHelper.hasCallLogPermission(context)) {
            Log.w(TAG, "READ_CALL_LOG not granted")
            return
        }
        val since = if (offhookSinceMs > 0) offhookSinceMs - 5000 else System.currentTimeMillis() - 120_000
        val snap = FamilyCallLogHelper.readLatestCall(context, since) ?: return

        if (snap.callType == CallLog.Calls.MISSED_TYPE || (!wasOffhook && ringingNumber != null)) {
            VlueFamilyBridge.dispatchMissedCall()
            return
        }

        if (snap.durationSec > 0 || wasOffhook) {
            val phone = snap.phone.ifEmpty { ringingNumber.orEmpty() }
            if (phone.isNotEmpty()) {
                dispatchEnded(context, phone, snap.durationSec.coerceAtLeast(0), snap.direction)
            }
        }
    }

    fun reportLastCallFromLog(context: Context) {
        val snap = FamilyCallLogHelper.readLatestCall(context) ?: return
        if (snap.callType == CallLog.Calls.MISSED_TYPE) {
            VlueFamilyBridge.dispatchMissedCall()
            return
        }
        dispatchEnded(context, snap.phone, snap.durationSec, snap.direction)
    }

    private fun dispatchEnded(context: Context, phone: String, durationSec: Int, direction: String) {
        val inContacts = DeviceContactsReader.isInContacts(context, phone)
        val kind = KrPhoneKindClassifier.classify(phone)
        VlueFamilyBridge.dispatchCallEnded(
            phone = phone,
            durationSec = durationSec,
            direction = direction,
            peerIsVlueMember = false,
            peerInContacts = inContacts,
            phoneKind = kind.wire
        )
    }
}
