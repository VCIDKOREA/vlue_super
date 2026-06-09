package kr.vlue.calloverlay.family

import android.content.Context
import android.os.Handler
import android.os.Looper
import android.provider.Settings
import android.util.Log
import android.webkit.WebView
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import kr.vlue.calloverlay.family.ledger.VlueLocalStore
import kr.vlue.calloverlay.family.ocr.PosBillMlKitOcr
import org.json.JSONObject
import java.lang.ref.WeakReference

/**
 * 네이티브 → 웹 `window.VlueFamilyBridge` 이벤트 디스패처.
 */
object VlueFamilyBridge {
    private const val TAG = "VlueFamilyBridge"
    const val INTERFACE_NAME = "VlueFamilyBridgeNative"

    private val mainHandler = Handler(Looper.getMainLooper())
    private val ioScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private var webViewRef: WeakReference<WebView>? = null

    fun attachWebView(webView: WebView) {
        webViewRef = WeakReference(webView)
    }

    fun detachWebView() {
        webViewRef = null
    }

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

    fun dispatchMissedCall() {
        dispatchJs("onMissedCall", null)
    }

    fun dispatchRemoteAppDetected(packageName: String) {
        dispatchJs("onRemoteAppDetected", JSONObject().put("packageName", packageName))
    }

    fun dispatchBatteryState(percent: Int, isCharging: Boolean) {
        val payload = JSONObject().put("percent", percent).put("isCharging", isCharging)
        dispatchJs("onBatteryState", payload)
    }

    fun dispatchDangerousAppDetected(packageName: String, appLabel: String, threatKind: String) {
        val payload = JSONObject()
            .put("packageName", packageName)
            .put("appLabel", appLabel)
            .put("threatKind", threatKind)
        dispatchJs("onDangerousAppDetected", payload)
    }

    /** ML Kit OCR 결과 — web: onPosOcrResult(text) */
    fun dispatchPosOcrResult(text: String) {
        dispatchJs("onPosOcrResult", JSONObject().put("text", text))
    }

    /** 은행 입출금 알림 — web: onBankNotification({ direction, amountKrw, maskedSummary, bankLabel }) */
    fun dispatchBankNotification(
        direction: String,
        amountKrw: Long,
        maskedSummary: String,
        bankLabel: String
    ) {
        val payload = JSONObject()
            .put("direction", direction)
            .put("amountKrw", amountKrw)
            .put("maskedSummary", maskedSummary)
            .put("bankLabel", bankLabel)
        dispatchJs("onBankNotification", payload)
    }

    private fun dispatchJs(method: String, payload: JSONObject?) {
        val webView = webViewRef?.get() ?: run {
            Log.w(TAG, "WebView not attached; drop $method")
            return
        }
        val arg = when (method) {
            "onMissedCall" -> {
                "window.VlueFamilyBridge&&window.VlueFamilyBridge.onMissedCall&&window.VlueFamilyBridge.onMissedCall();"
            }
            "onRemoteAppDetected" -> {
                val pkg = jsQuote(payload!!.optString("packageName"))
                "window.VlueFamilyBridge&&window.VlueFamilyBridge.onRemoteAppDetected&&" +
                    "window.VlueFamilyBridge.onRemoteAppDetected($pkg);"
            }
            "onBatteryState" -> {
                val pct = payload!!.optInt("percent", 0)
                val chg = if (payload.optBoolean("isCharging")) "true" else "false"
                "window.VlueFamilyBridge&&window.VlueFamilyBridge.onBatteryState&&" +
                    "window.VlueFamilyBridge.onBatteryState({percent:$pct,isCharging:$chg});"
            }
            "onDangerousAppDetected" -> {
                val pkg = jsQuote(payload!!.optString("packageName"))
                val label = jsQuote(payload.optString("appLabel"))
                val kind = jsQuote(payload.optString("threatKind"))
                "window.VlueFamilyBridge&&window.VlueFamilyBridge.onDangerousAppDetected&&" +
                    "window.VlueFamilyBridge.onDangerousAppDetected({packageName:$pkg,appLabel:$label,threatKind:$kind});"
            }
            "onPosOcrResult" -> {
                val text = jsQuote(payload!!.optString("text"))
                "window.VlueFamilyBridge&&window.VlueFamilyBridge.onPosOcrResult&&" +
                    "window.VlueFamilyBridge.onPosOcrResult($text);"
            }
            "onBankNotification" -> {
                val dir = jsQuote(payload!!.optString("direction"))
                val amt = payload.optLong("amountKrw", 0)
                val sum = jsQuote(payload.optString("maskedSummary"))
                val bank = jsQuote(payload.optString("bankLabel"))
                "window.VlueFamilyBridge&&window.VlueFamilyBridge.onBankNotification&&" +
                    "window.VlueFamilyBridge.onBankNotification({direction:$dir,amountKrw:$amt,maskedSummary:$sum,bankLabel:$bank});"
            }
            "onCallEnded" -> {
                val phone = jsQuote(payload!!.optString("phone"))
                val dur = payload.optInt("durationSec", 0)
                val dir = jsQuote(payload.optString("direction", "in"))
                val vlue = if (payload.optBoolean("peerIsVlueMember")) "true" else "false"
                "window.VlueFamilyBridge&&window.VlueFamilyBridge.onCallEnded&&" +
                    "window.VlueFamilyBridge.onCallEnded({phone:$phone,durationSec:$dur,direction:$dir,peerIsVlueMember:$vlue});"
            }
            else -> ""
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
        "\"" + s.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n") + "\""

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

        @android.webkit.JavascriptInterface
        fun scanDangerousAppsNow() {
            host.runOnUi { host.scanDangerousApps() }
        }

        @android.webkit.JavascriptInterface
        fun requestDeletePackage(packageName: String) {
            host.runOnUi { host.requestDeletePackage(packageName) }
        }

        /** 웹 dataUrl → ML Kit OCR → onPosOcrResult */
        @android.webkit.JavascriptInterface
        fun runPosBillOcr(dataUrl: String) {
            ioScope.launch {
                val text = PosBillMlKitOcr.recognizeFromDataUrl(dataUrl)
                dispatchPosOcrResult(text)
            }
        }

        @android.webkit.JavascriptInterface
        fun openNotificationAccessSettings() {
            host.runOnUi { host.openNotificationAccessSettings() }
        }

        /** "1" = 민감 화면(스캔·문서) — 스크린 캡처 차단, "0" = 해제 */
        @android.webkit.JavascriptInterface
        fun setSensitiveScreenSecure(flag: String) {
            val on = flag == "1" || flag.equals("true", ignoreCase = true)
            host.runOnUi { host.setSensitiveScreenSecure(on) }
        }

        /** 웹 POS 장부 → Room SQLCipher 로컬 저장 */
        @android.webkit.JavascriptInterface
        fun wipePosScanCache() {
            ioScope.launch {
                try {
                    VlueLocalStore.wipePosScanCache(host.appContext())
                } catch (e: Exception) {
                    Log.e(TAG, "wipePosScanCache failed", e)
                }
            }
        }

        @android.webkit.JavascriptInterface
        fun savePosLedgerLocal(json: String) {
            ioScope.launch {
                try {
                    val o = JSONObject(json)
                    VlueLocalStore.savePosLedger(
                        context = host.appContext(),
                        saleDate = o.optString("saleDate", ""),
                        totalKrw = o.optLong("totalKrw", 0),
                        cardKrw = o.optLong("cardKrw", 0),
                        cashKrw = o.optLong("cashKrw", 0),
                        vatKrw = o.optLong("vatKrw", 0),
                        rawOcrText = o.optString("rawOcrText", "")
                    )
                } catch (e: Exception) {
                    Log.e(TAG, "savePosLedgerLocal failed", e)
                }
            }
        }
    }

    interface FamilyBridgeHost {
        fun runOnUi(block: () -> Unit)
        fun appContext(): Context
        fun scanRemoteApps()
        fun scanDangerousApps()
        fun reportLastCallFromLog()
        fun requestDeletePackage(packageName: String)
        fun openNotificationAccessSettings()
        fun setSensitiveScreenSecure(enabled: Boolean)
    }
}
