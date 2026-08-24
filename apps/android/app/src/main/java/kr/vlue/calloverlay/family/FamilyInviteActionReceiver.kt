package kr.vlue.calloverlay.family

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.widget.Toast
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
        val app = context.applicationContext
        val token = LetteringPrefs.getAccessToken(app)?.trim().orEmpty()
        val userId = LetteringPrefs.getUserId(app)?.trim().orEmpty()

        if (token.isEmpty()) {
            toast(app, "로그인이 필요합니다. 앱에서 수락해 주세요.")
            openApp(app, linkId, if (accept) "accept" else "reject")
            return
        }

        val pending = goAsync()
        Thread {
            try {
                val api = BuildConfig.API_BASE_URL.trimEnd('/')
                val url = URL("$api/api/family-protection/links/$linkId/$path")
                val conn =
                    (url.openConnection() as HttpURLConnection).apply {
                        requestMethod = "POST"
                        connectTimeout = 15_000
                        readTimeout = 15_000
                        setRequestProperty("Authorization", "Bearer $token")
                        if (userId.isNotEmpty()) {
                            setRequestProperty("X-VLUE-User-Id", userId)
                        }
                        setRequestProperty("Content-Type", "application/json")
                        setRequestProperty("Accept", "application/json")
                        doOutput = true
                        outputStream.use { it.write("{}".toByteArray(Charsets.UTF_8)) }
                    }
                val code = conn.responseCode
                val errBody =
                    try {
                        (if (code in 200..299) conn.inputStream else conn.errorStream)
                            ?.bufferedReader()
                            ?.readText()
                            .orEmpty()
                    } catch (_: Exception) {
                        ""
                    }
                conn.disconnect()

                FamilyProtectionNotificationHelper.cancelInvite(app, linkId)

                if (code in 200..299) {
                    val title = if (accept) "가족 보호 수락" else "가족 보호 거절"
                    val body =
                        if (accept) {
                            "가족 보호 초대를 수락했습니다."
                        } else {
                            "가족 보호 초대를 거절했습니다."
                        }
                    toast(app, body)
                    FamilyProtectionNotificationHelper.showAlert(
                        app,
                        title,
                        body,
                        "family-invite-result-$linkId"
                    )
                    openApp(app, linkId, if (accept) "accepted" else "rejected")
                } else {
                    Log.w(TAG, "family invite action HTTP $code $errBody")
                    toast(app, "처리에 실패했습니다. 앱에서 다시 시도해 주세요.")
                    openApp(app, linkId, if (accept) "accept" else "reject")
                }
            } catch (e: Exception) {
                Log.w(TAG, "family invite action failed", e)
                toast(app, "네트워크 오류 — 앱에서 다시 시도해 주세요.")
                openApp(app, linkId, if (accept) "accept" else "reject")
            } finally {
                pending.finish()
            }
        }.start()
    }

    private fun toast(context: Context, message: String) {
        Handler(Looper.getMainLooper()).post {
            Toast.makeText(context, message, Toast.LENGTH_LONG).show()
        }
    }

    private fun openApp(context: Context, linkId: String, action: String) {
        val launch =
            Intent(context, kr.vlue.calloverlay.MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
                putExtra("vlue_open_from_notification", true)
                putExtra("vlue_family_link_id", linkId)
                putExtra("vlue_family_invite_action", action)
            }
        try {
            context.startActivity(launch)
        } catch (e: Exception) {
            Log.w(TAG, "openApp failed", e)
        }
    }

    companion object {
        private const val TAG = "FamilyInviteAction"
    }
}
