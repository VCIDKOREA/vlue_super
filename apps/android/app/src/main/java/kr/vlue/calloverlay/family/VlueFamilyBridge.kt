package kr.vlue.calloverlay.family

import android.os.Handler
import android.os.Looper
import android.util.Log
import android.webkit.WebView
import org.json.JSONObject
import java.lang.ref.WeakReference

/**
 * 네이티브 → 웹 `window.VlueFamilyBridge` 이벤트 디스패처.
 * 웹의 registerFamilyCallBridge / registerFamilyDeviceBridge 가 API로 릴레이합니다.
 */
object VlueFamilyBridge {
    private const val TAG = "VlueFamilyBridge"
    const val INTERFACE_NAME = "VlueFamilyBridgeNative"

    private val mainHandler = Handler(Looper.getMainLooper())
    private var webViewRef: WeakReference<WebView>? = null

    fun attachWebView(webView: WebView) {
        webViewRef = WeakReference(webView)
    }

    fun detachWebView() {
        webViewRef = null
    }

    /** 통화 종료 — web: onCallEnded({ phone, durationSec, direction, peerIsVlueMember }) */
    fun dispatchCallEnded(
        phone: String,
        durationSec: Int,
        direction: String,
        peerIsVlueMember: Boolean = false
    ) {
        val payload = JSONObject()
            .put("phone", phone)
            .put("durationSec", durationSec)
            .put("direction", direction)
            .put("peerIsVlueMember", peerIsVlueMember)
        dispatchJs("onCallEnded", payload)
    }

    /** 부재중 — web: onMissedCall() */
    fun dispatchMissedCall() {
        dispatchJs("onMissedCall", null)
    }

    /** 원격제어 앱 — web: onRemoteAppDetected(packageName) */
    fun dispatchRemoteAppDetected(packageName: String) {
        dispatchJs("onRemoteAppDetected", JSONObject().put("packageName", packageName))
    }

    private fun dispatchJs(method: String, payload: JSONObject?) {
        val webView = webViewRef?.get() ?: run {
            Log.w(TAG, "WebView not attached; drop $method")
            return
        }
        val arg = when {
            payload == null -> ""
            method == "onMissedCall" -> ""
            method == "onRemoteAppDetected" -> {
                val pkg = jsQuote(payload.optString("packageName"))
                "window.VlueFamilyBridge&&window.VlueFamilyBridge.onRemoteAppDetected&&" +
                    "window.VlueFamilyBridge.onRemoteAppDetected($pkg);"
            }
            method == "onCallEnded" -> {
                val phone = jsQuote(payload.optString("phone"))
                val dur = payload.optInt("durationSec", 0)
                val dir = jsQuote(payload.optString("direction", "in"))
                val vlue = if (payload.optBoolean("peerIsVlueMember")) "true" else "false"
                "window.VlueFamilyBridge&&window.VlueFamilyBridge.onCallEnded&&" +
                    "window.VlueFamilyBridge.onCallEnded({phone:$phone,durationSec:$dur,direction:$dir,peerIsVlueMember:$vlue});"
            }
            else -> ""
        }
        if (arg.isEmpty() && method == "onMissedCall") {
            val script = "window.VlueFamilyBridge&&window.VlueFamilyBridge.onMissedCall&&window.VlueFamilyBridge.onMissedCall();"
            runOnWebView(webView, script)
            return
        }
        if (arg.isNotEmpty()) runOnWebView(webView, arg)
    }

    private fun runOnWebView(webView: WebView, script: String) {
        mainHandler.post {
            try {
                webView.evaluateJavascript(script) { Log.d(TAG, "js: $it") }
            } catch (e: Exception) {
                Log.e(TAG, "evaluateJavascript failed", e)
            }
        }
    }

    private fun jsQuote(s: String): String =
        "\"" + s.replace("\\", "\\\\").replace("\"", "\\\"") + "\""

    /**
     * 웹 → 네이티브 (권한 요청·원격앱 즉시 스캔 등)
     */
    class NativeInterface(private val host: FamilyBridgeHost) {
        @android.webkit.JavascriptInterface
        fun ping(): String = "ok"

        @android.webkit.JavascriptInterface
        fun scanRemoteControlAppsNow() {
            host.runOnUi { host.scanRemoteApps() }
        }

        @android.webkit.JavascriptInterface
        fun reportLastCallFromLog() {
            host.runOnUi { host.reportLastCallFromLog() }
        }
    }

    interface FamilyBridgeHost {
        fun runOnUi(block: () -> Unit)
        fun scanRemoteApps()
        fun reportLastCallFromLog()
    }
}
