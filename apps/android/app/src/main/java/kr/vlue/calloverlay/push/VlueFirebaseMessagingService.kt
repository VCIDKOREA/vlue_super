package kr.vlue.calloverlay.push

import android.util.Log
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import kr.vlue.calloverlay.VlueSystemNotifier

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
        val title =
            message.notification?.title
                ?: message.data["title"]
                ?: "VLUE"
        val body =
            message.notification?.body
                ?: message.data["body"]
                ?: message.data["message"]
                ?: title
        val tag = message.data["type"] ?: message.data["linkId"] ?: "fcm"
        VlueSystemNotifier.show(applicationContext, title, body, tag)
    }

    companion object {
        private const val TAG = "VlueFcm"
    }
}
