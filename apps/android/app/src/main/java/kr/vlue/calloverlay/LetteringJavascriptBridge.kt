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

    @JavascriptInterface
    fun logBigPushTrace(step: String?, detail: String?) {
        val s = step.orEmpty()
        val d = detail.orEmpty()
        when {
            s.startsWith("SKIP after") -> {
                val after = Regex("""\[(\d+)\]""").find(s)?.groupValues?.getOrNull(1)?.toIntOrNull() ?: 0
                val reason = d.removePrefix("reason = ").ifBlank { d.ifBlank { s } }
                VlueBigPushTrace.skip(after, reason)
            }
            s.contains("[9]") -> VlueBigPushTrace.step(9, "React Root Mounted", d)
            s.contains("[10]") -> VlueBigPushTrace.step(10, "Showcase Visible", d)
            s.contains("[11]") -> VlueBigPushTrace.step(11, "Call End", d)
            s.contains("[DCC]", ignoreCase = true) ||
                s.contains("DCC_BOUND", ignoreCase = true) ||
                d.contains("DCC_BOUND", ignoreCase = true) ->
                VlueBigPushTrace.milestone("DCC_BOUND", "DCC Bound", seq = 9, detail = d.ifBlank { s })
            else -> VlueBigPushTrace.step(0, s.ifBlank { "JS" }, d)
        }
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

    /** 통화 종료 + 오버레이 닫기. MainActivity·모니터는 종료하지 않음. */
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

    /**
     * Companion MVP — Showcase를 Mini Case로 접고 삼성(시스템) 전화 UI가 보이도록 오버레이를 축소한다.
     * ROLE_DIALER 없이 SYSTEM_ALERT_WINDOW 오버레이만 조정.
     */
    @JavascriptInterface
    fun revealSystemCallUi() {
        try {
            service.setOverlayFullscreen(false)
            service.notifyWebCallState("reveal_system_call_ui")
        } catch (e: Exception) {
            Log.e(TAG, "revealSystemCallUi failed", e)
        }
    }

    /** Companion MVP — Mini Case에서 Showcase 전체화면 복귀 */
    @JavascriptInterface
    fun restoreShowcaseOverlay() {
        try {
            service.setOverlayFullscreen(true)
            service.notifyWebCallState("restore_showcase")
        } catch (e: Exception) {
            Log.e(TAG, "restoreShowcaseOverlay failed", e)
        }
    }

    /**
     * Companion Mini Case — 드래그 위치·크기를 네이티브 플로팅 윈도우에 반영.
     * React 논리 좌표(CSS px × density)와 WindowManager x/y/w/h 를 동일하게 유지.
     * 자동 가장자리 정렬 없음. 통화 중 사용자가 놓은 위치 유지.
     */
    @JavascriptInterface
    fun updateMiniOverlayFrame(x: String, y: String, w: String, h: String) {
        try {
            val xi = x.toFloatOrNull()?.toInt() ?: return
            val yi = y.toFloatOrNull()?.toInt() ?: return
            val wi = w.toFloatOrNull()?.toInt() ?: return
            val hi = h.toFloatOrNull()?.toInt() ?: return
            service.updateMiniOverlayFrame(xi, yi, wi, hi)
        } catch (e: Exception) {
            Log.e(TAG, "updateMiniOverlayFrame failed", e)
        }
    }

    @JavascriptInterface
    fun getScreenSizeJson(): String {
        return try {
            service.getScreenSizeJson()
        } catch (e: Exception) {
            Log.e(TAG, "getScreenSizeJson failed", e)
            """{"w":360,"h":640,"d":1}"""
        }
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
                window.VlueLettering.logBigPushTrace = function(s,d){ try{ Android.logBigPushTrace(String(s||''), String(d||'')); }catch(e){} };
                window.Android = window.Android || Android;
                window.Android.logBigPushTrace = window.VlueLettering.logBigPushTrace;
                window.VlueLettering.endCall = function(){ Android.endCall(); };
                window.VlueLettering.endCallKeepOverlay = function(){ Android.endCallKeepOverlay(); };
                window.VlueLettering.endCallOnly = function(){ Android.endCallOnly(); };
                window.VlueLettering.answerCall = function(){ Android.answerCall(); };
                window.VlueLettering.setOverlayFullscreen = function(v){ Android.setOverlayFullscreen(String(v)); };
                window.VlueLettering.revealSystemCallUi = function(){ Android.revealSystemCallUi(); };
                window.VlueLettering.restoreShowcaseOverlay = function(){ Android.restoreShowcaseOverlay(); };
                window.VlueLettering.updateMiniOverlayFrame = function(x,y,w,h){ Android.updateMiniOverlayFrame(String(x),String(y),String(w),String(h)); };
                window.VlueLettering.getScreenSizeJson = function(){ return Android.getScreenSizeJson(); };
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
