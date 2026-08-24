package kr.vlue.calloverlay.push

import android.util.Log
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import kr.vlue.calloverlay.VlueSystemNotifier
import kr.vlue.calloverlay.family.FamilyProtectionNotificationHelper

/**
 * 백그라운드/종료 상태 FCM → OS 상태바.
 * 포그라운드는 웹 SSE + showSystemNotification 과 병행.
 */
class VlueFirebaseMessagingService : FirebaseMessagingService() {
    override fun onNewToken(token: String) {
        Log.i(TAG, "onNewToken len=${token.length}")
        VlueFcmTokenStore.save(applicationContext, token)
        VlueFcmTokenStore.notifyWebToken(applicationContext, token)
    }

    override fun onMessageReceived(message: RemoteMessage) {
        val data = message.data
        val type = data["type"] ?: ""
        val title =
            message.notification?.title
                ?: data["title"]
                ?: "VLUE"
        val body =
            message.notification?.body
                ?: data["body"]
                ?: data["message"]
                ?: title
        val tag = type.ifBlank { data["linkId"] ?: "fcm" }

        if (type == "vlue-family-protection-invite") {
            val linkId = data["linkId"] ?: ""
            FamilyProtectionNotificationHelper.showInvite(applicationContext, title, body, linkId)
            return
        }

        if (type.startsWith("vlue-family-protection") || data["channel"] == "family_protection") {
            FamilyProtectionNotificationHelper.showAlert(applicationContext, title, body, tag)
            return
        }

        VlueSystemNotifier.show(applicationContext, title, body, tag)
    }

    companion object {
        private const val TAG = "VlueFcm"
    }
}
