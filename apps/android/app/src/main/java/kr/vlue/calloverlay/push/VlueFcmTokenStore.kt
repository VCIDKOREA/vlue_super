package kr.vlue.calloverlay.push

import android.content.Context
import android.util.Log
import android.webkit.WebView
import com.google.android.gms.tasks.Tasks
import com.google.firebase.messaging.FirebaseMessaging
import java.util.concurrent.TimeUnit
import org.json.JSONObject

object VlueFcmTokenStore {
    private const val PREFS = "vlue_fcm_prefs"
    private const val KEY_TOKEN = "fcm_token"
    private const val TAG = "VlueFcm"

    @Volatile
    private var webViewRef: WebView? = null

    fun attachWebView(webView: WebView?) {
        webViewRef = webView
    }

    fun save(context: Context, token: String) {
        val t = token.trim()
        if (t.length < 20) return
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .edit()
            .putString(KEY_TOKEN, t)
            .apply()
    }

    fun read(context: Context): String =
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .getString(KEY_TOKEN, "")
            .orEmpty()

    fun fetchTokenBlocking(context: Context, timeoutSec: Long = 15): String {
        return try {
            val token = Tasks.await(
                FirebaseMessaging.getInstance().token,
                timeoutSec,
                TimeUnit.SECONDS
            )
            if (!token.isNullOrBlank()) {
                save(context, token)
                token
            } else {
                read(context)
            }
        } catch (e: Exception) {
            Log.w(TAG, "fetchToken failed: ${e.message}")
            read(context)
        }
    }

    fun notifyWebToken(context: Context, token: String) {
        val wv = webViewRef ?: return
        val safe = JSONObject.quote(token)
        wv.post {
            wv.evaluateJavascript(
                "(function(){try{window.dispatchEvent(new CustomEvent('vlue-native-fcm-token',{detail:{token:$safe}}));" +
                    "if(window.VlueFcm&&window.VlueFcm.onNativeToken)window.VlueFcm.onNativeToken($safe);}catch(e){}})();",
                null
            )
        }
    }
}
