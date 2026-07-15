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
import kr.vlue.calloverlay.incall.DialerRoleHelper
import kr.vlue.calloverlay.incall.VlueInCallController

/** window.Android — 웹 TentShowcase / LetteringIncoming ↔ 네이티브 */
class LetteringJavascriptBridge(
    private val service: CallOverlayService
) {
    @JavascriptInterface
    fun dismissOverlay() {
        service.dismissOverlay()
    }

    /** 통화만 종료 — 쇼케이스 오버레이 유지 */
    @JavascriptInterface
    fun endCallKeepOverlay() {
        try {
            LetteringCallAudioHelper.endCallOnly(service, keepOverlay = true)
            service.notifyWebCallState("ended_keep_overlay")
        } catch (e: Exception) {
            Log.e(TAG, "endCallKeepOverlay failed", e)
        }
    }

    @JavascriptInterface
    fun endCallOnly() {
        endCallKeepOverlay()
    }

    /** 통화 종료 + 오버레이 닫기 */
    @JavascriptInterface
    fun endCall() {
        try {
            if (!VlueInCallController.disconnect(keepOverlay = false)) {
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
            }
        } catch (e: Exception) {
            Log.e(TAG, "endCall failed", e)
        } finally {
            service.dismissOverlay()
        }
    }

    @JavascriptInterface
    fun answerCall() {
        try {
            if (!LetteringCallAudioHelper.answerCall()) {
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
            }
            service.setOverlayFullscreen(true)
            service.notifyWebCallState("connected")
        } catch (e: Exception) {
            Log.e(TAG, "answerCall failed", e)
        }
    }

    @JavascriptInterface
    fun setOverlayFullscreen(value: String) {
        val on = value == "1" || value.equals("true", ignoreCase = true)
        service.setOverlayFullscreen(on)
    }

    @JavascriptInterface
    fun setMicrophoneMute(value: String): Boolean {
        val muted = value == "1" || value.equals("true", ignoreCase = true)
        return LetteringCallAudioHelper.setMicrophoneMute(service, muted)
    }

    @JavascriptInterface
    fun isMicrophoneMute(): String {
        return if (LetteringCallAudioHelper.isMicrophoneMute(service)) "1" else "0"
    }

    @JavascriptInterface
    fun setSpeakerphoneOn(value: String): Boolean {
        val on = value == "1" || value.equals("true", ignoreCase = true)
        return LetteringCallAudioHelper.setSpeakerphoneOn(service, on)
    }

    @JavascriptInterface
    fun isSpeakerphoneOn(): String {
        return if (LetteringCallAudioHelper.isSpeakerphoneOn(service)) "1" else "0"
    }

    @JavascriptInterface
    fun playDtmfTone(digit: String): Boolean {
        return LetteringCallAudioHelper.playDtmfTone(service, digit)
    }

    @JavascriptInterface
    fun stopDtmfTone() {
        LetteringCallAudioHelper.stopDtmfTone()
    }

    /** InCall / 기본 전화앱 역할 상태 */
    @JavascriptInterface
    fun getInCallCapabilityJson(): String {
        return try {
            org.json.JSONObject()
                .put("defaultDialer", DialerRoleHelper.isDefaultDialer(service))
                .put("inCallBound", VlueInCallController.isDefaultDialerBound())
                .put("hasActiveCall", VlueInCallController.hasActiveCall())
                .put("realDtmf", VlueInCallController.isDefaultDialerBound() && VlueInCallController.hasActiveCall())
                .toString()
        } catch (_: Exception) {
            "{}"
        }
    }

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
    fun requestDefaultDialerRole() {
        val intent = Intent(service, MainActivity::class.java).apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            putExtra(MainActivity.EXTRA_REQUEST_DIALER_ROLE, true)
        }
        service.startActivity(intent)
    }

    @JavascriptInterface
    fun getLetteringPermissionStatusJson(): String {
        return LetteringPermissionHelper.statusJson(service)
    }

    @JavascriptInterface
    fun openAppSettings() {
        val intent = Intent(service, MainActivity::class.java).apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            putExtra(MainActivity.EXTRA_OPEN_APP_SETTINGS, true)
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
        private const val TAG = "LetteringJsBridge"

        fun attach(webView: WebView, service: CallOverlayService) {
            webView.addJavascriptInterface(LetteringJavascriptBridge(service), INTERFACE_NAME)
            val bridgeJs = """
                window.VlueLettering = window.VlueLettering || {};
                window.VlueLettering.dismissOverlay = function(){ Android.dismissOverlay(); };
                window.VlueLettering.endCall = function(){ Android.endCall(); };
                window.VlueLettering.endCallKeepOverlay = function(){ Android.endCallKeepOverlay(); };
                window.VlueLettering.endCallOnly = function(){ Android.endCallOnly(); };
                window.VlueLettering.answerCall = function(){ Android.answerCall(); };
                window.VlueLettering.setOverlayFullscreen = function(v){ Android.setOverlayFullscreen(String(v)); };
                window.VlueLettering.setMicrophoneMute = function(v){ return Android.setMicrophoneMute(String(v)); };
                window.VlueLettering.isMicrophoneMute = function(){ return Android.isMicrophoneMute(); };
                window.VlueLettering.setSpeakerphoneOn = function(v){ return Android.setSpeakerphoneOn(String(v)); };
                window.VlueLettering.isSpeakerphoneOn = function(){ return Android.isSpeakerphoneOn(); };
                window.VlueLettering.playDtmfTone = function(d){ return Android.playDtmfTone(String(d)); };
                window.VlueLettering.stopDtmfTone = function(){ Android.stopDtmfTone(); };
                window.VlueLettering.getInCallCapabilityJson = function(){ return Android.getInCallCapabilityJson(); };
                window.VlueLettering.requestDefaultDialerRole = function(){ Android.requestDefaultDialerRole(); };
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
