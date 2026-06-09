package kr.vlue.calloverlay.family.bank

import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.util.Log
import kr.vlue.calloverlay.family.VlueFamilyBridge
import kr.vlue.calloverlay.family.ledger.VlueLocalStore
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch

/**
 * NotificationListenerService — 은행 입출금 푸시 감지·마스킹 후 가족 브릿지 전달
 * 설정 → 알림 접근 → VLUE 허용 필요
 */
class FamilyBankNotificationListener : NotificationListenerService() {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private val seen = LinkedHashSet<String>()

    override fun onNotificationPosted(sbn: StatusBarNotification?) {
        if (sbn == null) return
        val pkg = sbn.packageName.orEmpty()
        if (!FamilyBankNotificationParser.isBankPackage(pkg)) return

        val extras = sbn.notification.extras
        val title = extras.getCharSequence("android.title")?.toString().orEmpty()
        val body = extras.getCharSequence("android.text")?.toString().orEmpty()
        val key = "${pkg}:${title}:${body}".hashCode().toString()
        if (!seen.add(key)) return
        if (seen.size > 200) seen.clear()

        val parsed = FamilyBankNotificationParser.parse(title, body, pkg) ?: return
        Log.i(TAG, "bank notification: ${parsed.maskedSummary}")

        VlueFamilyBridge.dispatchBankNotification(
            parsed.direction,
            parsed.amountKrw,
            parsed.maskedSummary,
            parsed.bankLabel
        )

        scope.launch {
            try {
                VlueLocalStore.upsertSecurityState(
                    context = applicationContext,
                    userId = "local",
                    batteryPercent = -1,
                    isCharging = false,
                    securityHealth = "ok",
                    openThreatCount = 0,
                    lastBankActivityMasked = parsed.maskedSummary
                )
            } catch (e: Exception) {
                Log.w(TAG, "local store failed", e)
            }
        }
    }

    companion object {
        private const val TAG = "FamilyBankNotif"
    }
}
