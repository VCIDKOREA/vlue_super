package kr.vlue.calloverlay

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.telecom.TelecomManager
import android.util.Log
import android.webkit.JavascriptInterface
import android.webkit.WebView
import androidx.core.content.ContextCompat

/** window.Android — 웹 TentShowcase / LetteringIncoming ↔ 네이티브 */
class LetteringJavascriptBridge(
    private val service: CallOverlayService
) {
    @JavascriptInterface
    fun dismissOverlay() {
        service.dismissOverlay()
    }

    /** 통화 즉시 종료 (API 28+ TelecomManager.endCall) */
    @JavascriptInterface
    fun endCall() {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                val telecom = service.getSystemService(TelecomManager::class.java)
                val granted = ContextCompat.checkSelfPermission(
                    service,
                    Manifest.permission.ANSWER_PHONE_CALLS
                ) == PackageManager.PERMISSION_GRANTED
                if (granted && telecom != null) {
                    @Suppress("DEPRECATION")
                    telecom.endCall()
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "endCall failed", e)
        } finally {
            service.dismissOverlay()
        }
    }

    /** 수신 중 전화 받기 */
    @JavascriptInterface
    fun answerCall() {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val telecom = service.getSystemService(TelecomManager::class.java)
                val granted = ContextCompat.checkSelfPermission(
                    service,
                    Manifest.permission.ANSWER_PHONE_CALLS
                ) == PackageManager.PERMISSION_GRANTED
                if (granted && telecom != null) {
                    telecom.acceptRingingCall()
                }
            }
            service.setOverlayFullscreen(true)
            service.notifyWebCallState("connected")
        } catch (e: Exception) {
            Log.e(TAG, "answerCall failed", e)
        }
    }

    /** 오버레이를 디바이스 전체화면으로 확장 */
    @JavascriptInterface
    fun setOverlayFullscreen(value: String) {
        val on = value == "1" || value.equals("true", ignoreCase = true)
        service.setOverlayFullscreen(on)
    }

    /** 디바이스 주소록 JSON — [{name, phone}, ...] */
    @JavascriptInterface
    fun getDeviceContactsJson(): String {
        return try {
            DeviceContactsReader.readAsJson(service)
        } catch (e: Exception) {
            Log.e(TAG, "getDeviceContactsJson failed", e)
            "[]"
        }
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
    fun getLetteringPermissionStatusJson(): String {
        return LetteringPermissionHelper.statusJson(service)
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
        private const val TAG = "LetteringJsBridge"

        fun attach(webView: WebView, service: CallOverlayService) {
            webView.addJavascriptInterface(LetteringJavascriptBridge(service), INTERFACE_NAME)
            val bridgeJs = """
                window.VlueLettering = window.VlueLettering || {};
                window.VlueLettering.dismissOverlay = function(){ Android.dismissOverlay(); };
                window.VlueLettering.endCall = function(){ Android.endCall(); };
                window.VlueLettering.answerCall = function(){ Android.answerCall(); };
                window.VlueLettering.setOverlayFullscreen = function(v){ Android.setOverlayFullscreen(String(v)); };
                window.VlueLettering.getDeviceContactsJson = function(){ return Android.getDeviceContactsJson(); };
                window.VlueLettering.blockPhoneNumber = function(p){ Android.blockPhoneNumber(p); };
                window.VlueLettering.setLetteringEnabled = function(v){ Android.setLetteringEnabled(v ? '1' : '0'); };
                window.VlueLettering.requestLetteringPermissions = function(){ Android.requestLetteringPermissions(); };
                window.VlueLettering.getLetteringPermissionStatusJson = function(){ return Android.getLetteringPermissionStatusJson(); };
                window.VlueLettering.openCertInfo = function(msg){ Android.openVlueCertInfo(JSON.stringify(msg||{})); };
                window.VlueLettering.onNativeCallState = window.VlueLettering.onNativeCallState || function(){};
            """.trimIndent()
            webView.evaluateJavascript(bridgeJs, null)
        }
    }
}
