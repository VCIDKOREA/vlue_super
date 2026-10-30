package kr.vlue.calloverlay.push

import android.content.Context
import android.util.Log
import java.net.HttpURLConnection
import java.net.URL
import kr.vlue.calloverlay.BuildConfig
import kr.vlue.calloverlay.LetteringPrefs
import org.json.JSONObject

/**
 * WebView 없이도 FCM 토큰을 서버에 등록 — 앱 종료 상태 푸시(카톡형)용.
 */
object VlueFcmRegistrar {
    private const val TAG = "VlueFcm"
    private const val PREFS = "vlue_fcm_prefs"
    private const val KEY_LAST_UPLOAD = "last_upload_sig"

    fun syncTokenAsync(context: Context, reason: String = "unknown") {
        Thread { syncTokenBlocking(context, reason) }.start()
    }

    fun syncTokenBlocking(context: Context, reason: String = "unknown"): Boolean {
        val app = context.applicationContext
        return try {
            val fcmToken =
                VlueFcmTokenStore.read(app).trim().ifBlank {
                    VlueFcmTokenStore.fetchTokenBlocking(app)
                }
            if (fcmToken.length < 20) {
                Log.w(TAG, "sync skip: empty fcm ($reason)")
                return false
            }

            val userId = LetteringPrefs.getUserId(app)?.trim().orEmpty()
            val accessToken = LetteringPrefs.getAccessToken(app)?.trim().orEmpty()
            val deviceToken = LetteringPrefs.getDeviceToken(app)?.trim().orEmpty()
            if (userId.isEmpty() || accessToken.isEmpty() || deviceToken.isEmpty()) {
                Log.i(TAG, "sync skip: session incomplete ($reason)")
                return false
            }

            val sig = "$userId|$deviceToken|$fcmToken"
            val prev =
                app.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                    .getString(KEY_LAST_UPLOAD, "")
                    .orEmpty()
            if (prev == sig) {
                Log.d(TAG, "sync skip: unchanged ($reason)")
                return true
            }

            val api = BuildConfig.API_BASE_URL.trimEnd('/')
            val url = URL("$api/api/auth/devices/fcm-token")
            val body =
                JSONObject()
                    .put("deviceToken", deviceToken)
                    .put("fcmToken", fcmToken)
                    .toString()
            val conn =
                (url.openConnection() as HttpURLConnection).apply {
                    requestMethod = "POST"
                    connectTimeout = 15_000
                    readTimeout = 15_000
                    doOutput = true
                    setRequestProperty("Content-Type", "application/json")
                    setRequestProperty("Accept", "application/json")
                    setRequestProperty("Authorization", "Bearer $accessToken")
                    setRequestProperty("X-VLUE-User-Id", userId)
                    setRequestProperty("X-VLUE-Platform", "app")
                    setRequestProperty("X-VLUE-Client", "mobile")
                    setRequestProperty("User-Agent", "VLUE-Android-App FcmRegistrar")
                }
            conn.outputStream.use { it.write(body.toByteArray(Charsets.UTF_8)) }
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

            if (code in 200..299) {
                app.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                    .edit()
                    .putString(KEY_LAST_UPLOAD, sig)
                    .apply()
                Log.i(TAG, "sync ok ($reason)")
                true
            } else {
                Log.w(TAG, "sync failed http=$code reason=$reason body=${errBody.take(180)}")
                false
            }
        } catch (e: Exception) {
            Log.w(TAG, "sync error ($reason): ${e.message}")
            false
        }
    }

    fun clearUploadCache(context: Context) {
        context.applicationContext
            .getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .edit()
            .remove(KEY_LAST_UPLOAD)
            .apply()
    }

    /**
     * 로그아웃 시 서버에서 FCM 토큰 해제 — 계정 전환 후 이전 사용자 알림 수신 방지.
     * 비동기로 실행하여 로그아웃 플로우를 차단하지 않음.
     */
    fun clearTokenOnLogoutAsync(context: Context) {
        Thread { clearTokenOnLogoutBlocking(context) }.start()
    }

    private fun clearTokenOnLogoutBlocking(context: Context): Boolean {
        val app = context.applicationContext
        return try {
            val userId = LetteringPrefs.getUserId(app)?.trim().orEmpty()
            val accessToken = LetteringPrefs.getAccessToken(app)?.trim().orEmpty()
            val deviceToken = LetteringPrefs.getDeviceToken(app)?.trim().orEmpty()
            if (userId.isEmpty() || accessToken.isEmpty()) {
                Log.i(TAG, "logout clear skip: no session")
                clearUploadCache(app)
                return true
            }

            val api = BuildConfig.API_BASE_URL.trimEnd('/')
            val url = URL("$api/api/auth/devices/fcm-token")
            val body = JSONObject()
            if (deviceToken.isNotEmpty()) {
                body.put("deviceToken", deviceToken)
            }
            val conn = (url.openConnection() as HttpURLConnection).apply {
                requestMethod = "DELETE"
                connectTimeout = 10_000
                readTimeout = 10_000
                doOutput = body.length() > 2
                setRequestProperty("Content-Type", "application/json")
                setRequestProperty("Accept", "application/json")
                setRequestProperty("Authorization", "Bearer $accessToken")
                setRequestProperty("X-VLUE-User-Id", userId)
                setRequestProperty("X-VLUE-Platform", "app")
                setRequestProperty("User-Agent", "VLUE-Android-App FcmRegistrar")
            }
            if (body.length() > 2) {
                conn.outputStream.use { it.write(body.toString().toByteArray(Charsets.UTF_8)) }
            }
            val code = conn.responseCode
            conn.disconnect()

            clearUploadCache(app)

            if (code in 200..299) {
                Log.i(TAG, "logout clear ok")
                true
            } else {
                Log.w(TAG, "logout clear failed http=$code")
                false
            }
        } catch (e: Exception) {
            Log.w(TAG, "logout clear error: ${e.message}")
            clearUploadCache(app)
            false
        }
    }
}
