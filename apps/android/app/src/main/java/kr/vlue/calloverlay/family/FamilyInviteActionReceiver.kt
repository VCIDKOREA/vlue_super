package kr.vlue.calloverlay.family

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import kr.vlue.calloverlay.BuildConfig
import kr.vlue.calloverlay.LetteringPrefs
import java.net.HttpURLConnection
import java.net.URL

/** 알림 액션 버튼 — 가족 보호 초대 수락/거절 */
class FamilyInviteActionReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent?) {
        val linkId = intent?.getStringExtra(FamilyProtectionNotificationHelper.EXTRA_LINK_ID)?.trim().orEmpty()
        if (linkId.isEmpty()) return
        val accept = intent?.action == FamilyProtectionNotificationHelper.ACTION_ACCEPT
        val path = if (accept) "accept" else "reject"
        val token = LetteringPrefs.getAccessToken(context)?.trim().orEmpty()
        if (token.isEmpty()) {
            openApp(context, linkId)
            return
        }
        Thread {
            try {
                val api = BuildConfig.API_BASE_URL.trimEnd('/')
                val url = URL("$api/api/family-protection/links/$linkId/$path")
                val conn = (url.openConnection() as HttpURLConnection).apply {
                    requestMethod = "POST"
                    connectTimeout = 12_000
                    readTimeout = 12_000
                    setRequestProperty("Authorization", "Bearer $token")
                    setRequestProperty("Content-Type", "application/json")
                    doOutput = true
                    outputStream.use { it.write("{}".toByteArray()) }
                }
                val code = conn.responseCode
                conn.disconnect()
                val title = if (accept) "가족 보호 수락" else "가족 보호 거절"
                val body =
                    if (code in 200..299) {
                        if (accept) "가족 보호 초대를 수락했습니다." else "가족 보호 초대를 거절했습니다."
                    } else {
                        "처리에 실패했습니다. 앱에서 다시 시도해 주세요."
                    }
                FamilyProtectionNotificationHelper.showAlert(context, title, body, "family-invite-result-$linkId")
                if (code !in 200..299) openApp(context, linkId)
            } catch (e: Exception) {
                Log.w(TAG, "family invite action failed", e)
                openApp(context, linkId)
            }
        }.start()
    }

    private fun openApp(context: Context, linkId: String) {
        val launch =
            Intent(context, kr.vlue.calloverlay.MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP
                putExtra("vlue_open_from_notification", true)
                putExtra("vlue_family_link_id", linkId)
            }
        context.startActivity(launch)
    }

    companion object {
        private const val TAG = "FamilyInviteAction"
    }
}
