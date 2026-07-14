package kr.vlue.calloverlay

import android.annotation.SuppressLint
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.provider.Settings
import org.json.JSONObject
import android.util.Log
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import kr.vlue.calloverlay.family.FamilyPermissionHelper
import kr.vlue.calloverlay.family.FamilyProtectionPrefs
import kr.vlue.calloverlay.family.FamilyCareForegroundService
import kr.vlue.calloverlay.family.FamilyDangerousPermissionScanner
import kr.vlue.calloverlay.family.FamilyDeleteIntentHelper
import kr.vlue.calloverlay.family.FamilyRemoteAppScanner
import kr.vlue.calloverlay.family.ScreenSecureHelper
import kr.vlue.calloverlay.family.VlueFamilyBridge

/**
 * VLUE 메인 WebView + 레터링 + 가족보호 네이티브 브릿지
 */
class MainActivity : AppCompatActivity(), VlueFamilyBridge.FamilyBridgeHost {
    private lateinit var webView: WebView

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)
        webView = findViewById(R.id.main_webview)
        webView.settings.javaScriptEnabled = true
        webView.settings.domStorageEnabled = true
        webView.addJavascriptInterface(MainJsBridge(this), LetteringJavascriptBridge.INTERFACE_NAME)
        webView.addJavascriptInterface(
            VlueFamilyBridge.NativeInterface(this),
            VlueFamilyBridge.INTERFACE_NAME
        )
        VlueFamilyBridge.attachWebView(webView)
        webView.webViewClient = object : WebViewClient() {
            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                injectFamilyBridgeBootstrap()
                scanRemoteApps()
                scanDangerousApps()
            }
        }
        webView.loadUrl("${VlueLetteringConfig.webBaseUrl}/")

        try {
            LetteringIntegration.onMainActivityReady(this)
        } catch (e: Exception) {
            Log.e(TAG, "lettering init failed", e)
        }

        if (!FamilyPermissionHelper.allGranted(this)) {
            requestFamilyProtectionPermissions()
        }

        if (intent.getBooleanExtra(EXTRA_REQUEST_PERMISSIONS, false)) {
            requestLetteringOsPermissionsDirect()
        }
        if (intent.getBooleanExtra(EXTRA_REQUEST_DIALER_ROLE, false)) {
            kr.vlue.calloverlay.incall.DialerRoleHelper.requestDefaultDialer(this)
        }
        if (intent.hasExtra(EXTRA_OPEN_CERT)) {
            val json = intent.getStringExtra(EXTRA_OPEN_CERT).orEmpty()
            webView.loadUrl(
                "${VlueLetteringConfig.webBaseUrl}/#mypage?letteringCert=" +
                    java.net.URLEncoder.encode(json, "UTF-8")
            )
        }
        handleMemoShareIntent(intent)
    }

    override fun onNewIntent(intent: Intent?) {
        super.onNewIntent(intent)
        if (intent != null) {
            setIntent(intent)
            handleMemoShareIntent(intent)
        }
    }

    private fun handleMemoShareIntent(inIntent: Intent) {
        if (inIntent.action != Intent.ACTION_SEND) return
        var text = inIntent.getStringExtra(Intent.EXTRA_TEXT).orEmpty()
        val subject = inIntent.getStringExtra(Intent.EXTRA_SUBJECT).orEmpty()
        val stream: Uri? = inIntent.getParcelableExtra(Intent.EXTRA_STREAM)
        if (text.isBlank() && subject.isNotBlank()) text = subject
        if (text.isBlank() && stream != null) text = stream.toString()
        if (text.isBlank()) return
        val source = inIntent.`package`?.let { pkg ->
            when {
                pkg.contains("chrome") -> "Chrome"
                pkg.contains("kakao") -> "KakaoTalk"
                pkg.contains("instagram") -> "Instagram"
                pkg.contains("youtube") -> "YouTube"
                else -> pkg
            }
        } ?: "Android"
        val payload = JSONObject()
        payload.put("text", text)
        payload.put("sourceApp", source)
        if (stream != null) payload.put("imageUrl", stream.toString())
        val quoted = JSONObject.quote(payload.toString())
        val script = "(function(){try{sessionStorage.setItem('vlue_pending_memo_share',$quoted);}catch(e){}})();"
        if (::webView.isInitialized) {
            webView.post { webView.evaluateJavascript(script, null) }
        }
    }

    override fun onResume() {
        super.onResume()
        VlueFamilyBridge.attachWebView(webView)
        if (FamilyPermissionHelper.allGranted(this)) {
            scanRemoteApps()
            scanDangerousApps()
        }
    }

    override fun onDestroy() {
        VlueFamilyBridge.detachWebView()
        super.onDestroy()
    }

    override fun runOnUi(block: () -> Unit) {
        runOnUiThread(block)
    }

    override fun appContext(): Context = applicationContext

    override fun openNotificationAccessSettings() {
        try {
            startActivity(Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS))
        } catch (e: Exception) {
            Toast.makeText(this, "설정에서 알림 접근 권한을 허용해 주세요.", Toast.LENGTH_LONG).show()
        }
    }

    override fun setSensitiveScreenSecure(enabled: Boolean) {
        ScreenSecureHelper.setEnabled(this, enabled)
    }

    override fun scanRemoteApps() {
        if (!FamilyPermissionHelper.allGranted(this)) return
        val found = FamilyRemoteAppScanner.scanInstalled(this)
        val reported = FamilyProtectionPrefs.loadReportedPackages(this).toMutableSet()
        var changed = false
        for (pkg in found) {
            if (!reported.contains(pkg)) {
                reported.add(pkg)
                changed = true
                VlueFamilyBridge.dispatchRemoteAppDetected(pkg)
            }
        }
        if (changed) FamilyProtectionPrefs.saveReportedPackages(this, reported)
    }

    override fun scanDangerousApps() {
        if (!FamilyPermissionHelper.allGranted(this)) return
        val found = FamilyDangerousPermissionScanner.scanInstalled(this)
        val reported = FamilyProtectionPrefs.loadReportedDangerousPackages(this).toMutableSet()
        var changed = false
        for (hit in found) {
            if (!reported.contains(hit.packageName)) {
                reported.add(hit.packageName)
                changed = true
                VlueFamilyBridge.dispatchDangerousAppDetected(hit.packageName, hit.appLabel, hit.threatKind)
            }
        }
        if (changed) FamilyProtectionPrefs.saveReportedDangerousPackages(this, reported)
    }

    override fun requestDeletePackage(packageName: String) {
        val ok = FamilyDeleteIntentHelper.launchDeletePackage(this, packageName)
        if (!ok) Toast.makeText(this, "앱 삭제 화면을 열 수 없습니다.", Toast.LENGTH_SHORT).show()
    }

    override fun reportLastCallFromLog() {
        if (!FamilyPermissionHelper.allGranted(this)) return
        kr.vlue.calloverlay.family.FamilyCallTracker.reportLastCallFromLog(this)
    }

    private fun injectFamilyBridgeBootstrap() {
        val script =
            """
            (function(){
              var g=window.VlueFamilyBridge||{};
              window.VlueFamilyBridge=Object.assign({},g,{
                __nativeReady:true,
                __androidShell:true,
                platform:'android',
                capabilities:{
                  callLog:true,
                  remoteAppScan:true,
                  missedCallDetection:true,
                  phoneState:true,
                  bankNotificationParsing:true,
                  dangerousAppScan:true,
                  posOcr:true,
                  familyStateShare:true
                }
              });
              console.info('[VLUE] Android VlueFamilyBridge attached');
            })();
            """.trimIndent()
        webView.evaluateJavascript(script, null)
    }

    fun requestFamilyProtectionPermissions() {
        if (FamilyPermissionHelper.allGranted(this)) return
        AlertDialog.Builder(this)
            .setTitle("가족 보호 권한")
            .setMessage(
                "부모님 기기 보호를 위해\n" +
                    "· 통화 기록\n· 전화 상태\n· 설치된 앱 조회\n권한이 필요합니다."
            )
            .setPositiveButton("허용") { _, _ ->
                FamilyPermissionHelper.request(this, REQ_FAMILY)
            }
            .setNegativeButton("나중에", null)
            .show()
    }

    fun promptLetteringPermissions() {
        if (LetteringPermissionHelper.allGranted(this)) {
            LetteringPrefs.setLetteringEnabled(this, true)
            Toast.makeText(this, "VLUE 레터링 권한이 준비되었습니다.", Toast.LENGTH_SHORT).show()
            return
        }
        AlertDialog.Builder(this)
            .setTitle("VLUE 레터링 권한")
            .setMessage(
                "VLUE 이용을 위해 다음 권한이 필요합니다.\n" +
                    "· 다른 앱 위에 표시 (통화 쇼케이스)\n" +
                    "· 전화 상태·통화 제어\n" +
                    "· 주소록 (지인 찾기·추천)\n" +
                    "· 카메라·사진 (명함·쇼케이스)\n" +
                    "· 위치 (기관·업체 검색)"
            )
            .setPositiveButton("권한 설정") { _, _ ->
                requestLetteringOsPermissionsDirect()
            }
            .setNegativeButton("취소", null)
            .show()
    }

    /** 웹「허용하고 계속」— 시스템 권한 다이얼로그를 즉시 요청 */
    fun requestLetteringOsPermissionsDirect() {
        if (!LetteringPermissionHelper.hasPhonePermissions(this)) {
            LetteringPermissionHelper.requestPhonePermissions(this, REQ_PHONE)
            return
        }
        if (!LetteringPermissionHelper.canDrawOverlays(this)) {
            LetteringPermissionHelper.openOverlaySettings(this)
            return
        }
        LetteringPrefs.setLetteringEnabled(this, true)
        /* DTMF·완벽한 종료 제어 — 기본 전화앱 역할 유도 */
        if (!kr.vlue.calloverlay.incall.DialerRoleHelper.isDefaultDialer(this)) {
            kr.vlue.calloverlay.incall.DialerRoleHelper.requestDefaultDialer(this)
        }
    }

    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<out String>,
        grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == REQ_PHONE) {
            if (LetteringPermissionHelper.hasPhonePermissions(this)) {
                LetteringPrefs.setLetteringEnabled(this, true)
                Toast.makeText(this, "필수 권한이 허용되었습니다.", Toast.LENGTH_SHORT).show()
                if (!LetteringPermissionHelper.canDrawOverlays(this)) {
                    LetteringPermissionHelper.openOverlaySettings(this)
                }
            } else {
                Toast.makeText(this, "일부 권한이 거부되었습니다. 설정에서 허용해 주세요.", Toast.LENGTH_LONG).show()
            }
            notifyWebPermissionStatus()
        }
        if (requestCode == REQ_FAMILY && FamilyPermissionHelper.allGranted(this)) {
            Toast.makeText(this, "가족 보호 권한이 준비되었습니다.", Toast.LENGTH_SHORT).show()
            scanRemoteApps()
            scanDangerousApps()
            FamilyCareForegroundService.start(this)
        }
    }

    private fun notifyWebPermissionStatus() {
        if (!::webView.isInitialized) return
        val json = LetteringPermissionHelper.statusJson(this)
        val quoted = JSONObject.quote(json)
        webView.post {
            webView.evaluateJavascript(
                "(function(){try{window.dispatchEvent(new CustomEvent('vlue-lettering-permissions-result',{detail:$quoted}));}catch(e){}})();",
                null
            )
        }
    }

    class MainJsBridge(private val activity: MainActivity) {
        @android.webkit.JavascriptInterface
        fun setLetteringEnabled(value: String) {
            activity.runOnUiThread {
                val on = value == "1" || value == "true"
                if (on && !LetteringPermissionHelper.allGranted(activity)) {
                    activity.promptLetteringPermissions()
                } else {
                    LetteringPrefs.setLetteringEnabled(activity, on)
                }
            }
        }

        @android.webkit.JavascriptInterface
        fun requestLetteringPermissions() {
            // 웹 사전 고지 후 호출 — 추가 다이얼로그 없이 OS 권한 창을 바로 띄움
            activity.runOnUiThread { activity.requestLetteringOsPermissionsDirect() }
        }

        @android.webkit.JavascriptInterface
        fun requestDefaultDialerRole() {
            activity.runOnUiThread {
                kr.vlue.calloverlay.incall.DialerRoleHelper.requestDefaultDialer(activity)
            }
        }

        @android.webkit.JavascriptInterface
        fun getLetteringPermissionStatusJson(): String {
            return LetteringPermissionHelper.statusJson(activity)
        }

        @android.webkit.JavascriptInterface
        fun requestFamilyProtectionPermissions() {
            activity.runOnUiThread { activity.requestFamilyProtectionPermissions() }
        }
    }

    companion object {
        const val EXTRA_REQUEST_PERMISSIONS = "request_permissions"
        const val EXTRA_REQUEST_DIALER_ROLE = "request_dialer_role"
        const val EXTRA_OPEN_CERT = "open_cert"
        private const val REQ_PHONE = 4102
        private const val REQ_FAMILY = 4103
        private const val TAG = "VlueMainActivity"
    }
}
