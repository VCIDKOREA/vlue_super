package kr.vlue.calloverlay

import android.content.Intent
import android.webkit.JavascriptInterface
import android.webkit.WebView
import org.json.JSONObject

/** window.Android — 웹 LetteringIncomingNotification ↔ 네이티브 */
class LetteringJavascriptBridge(
    private val service: CallOverlayService
) {
    @JavascriptInterface
    fun dismissOverlay() {
        service.dismissOverlay()
    }

    @JavascriptInterface
    fun blockPhoneNumber(phone: String) {
        val e164 = CardLookupBridge.normalizeKr(phone) ?: return
        BlockedPhoneCache.add(service, e164)
        service.dismissOverlay()
    }

    @JavascriptInterface
    fun setLetteringEnabled(value: String) {
        LetteringPrefs.setLetteringEnabled(service, value == "1" || value == "true")
    }

    @JavascriptInterface
    fun requestLetteringPermissions() {
        val intent = Intent(service, MainActivity::class.java).apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            putExtra(MainActivity.EXTRA_REQUEST_PERMISSIONS, true)
        }
        service.startActivity(intent)
    }

    @JavascriptInterface
    fun openVlueCertInfo(json: String) {
        val intent = Intent(service, MainActivity::class.java).apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            putExtra(MainActivity.EXTRA_OPEN_CERT, json)
        }
        service.startActivity(intent)
    }

    companion object {
        const val INTERFACE_NAME = "Android"

        fun attach(webView: WebView, service: CallOverlayService) {
            webView.addJavascriptInterface(LetteringJavascriptBridge(service), INTERFACE_NAME)
            val bridgeJs = """
                window.VlueLettering = window.VlueLettering || {};
                window.VlueLettering.dismissOverlay = function(){ Android.dismissOverlay(); };
                window.VlueLettering.blockPhoneNumber = function(p){ Android.blockPhoneNumber(p); };
                window.VlueLettering.setLetteringEnabled = function(v){ Android.setLetteringEnabled(v ? '1' : '0'); };
                window.VlueLettering.requestLetteringPermissions = function(){ Android.requestLetteringPermissions(); };
                window.VlueLettering.openCertInfo = function(msg){ Android.openVlueCertInfo(JSON.stringify(msg||{})); };
            """.trimIndent()
            webView.evaluateJavascript(bridgeJs, null)
        }
    }
}
