package kr.vlue.calloverlay

import android.annotation.SuppressLint
import android.os.Bundle
import android.util.Log
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity

/**
 * VLUE 메인 WebView + 레터링 통합 (android-call-overlay = 메인 셸)
 * @see MERGE.md 외부 MainActivity 병합 가이드
 */
class MainActivity : AppCompatActivity() {
    private lateinit var webView: WebView

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)
        webView = findViewById(R.id.main_webview)
        webView.settings.javaScriptEnabled = true
        webView.settings.domStorageEnabled = true
        webView.addJavascriptInterface(MainJsBridge(this), LetteringJavascriptBridge.INTERFACE_NAME)
        webView.webViewClient = WebViewClient()
        webView.loadUrl("${VlueLetteringConfig.webBaseUrl}/")

        try {
            LetteringIntegration.onMainActivityReady(this)
        } catch (e: Exception) {
            Log.e(TAG, "lettering init failed", e)
        }

        if (intent.getBooleanExtra(EXTRA_REQUEST_PERMISSIONS, false)) {
            promptLetteringPermissions()
        }
        if (intent.hasExtra(EXTRA_OPEN_CERT)) {
            val json = intent.getStringExtra(EXTRA_OPEN_CERT).orEmpty()
            webView.loadUrl("${VlueLetteringConfig.webBaseUrl}/#mypage?letteringCert=${java.net.URLEncoder.encode(json, "UTF-8")}")
        }
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
                "통화 중 명함을 표시하려면\n" +
                    "· 다른 앱 위에 표시\n" +
                    "· 전화 상태 읽기\n권한이 필요합니다."
            )
            .setPositiveButton("권한 설정") { _, _ ->
                if (!LetteringPermissionHelper.hasPhonePermissions(this)) {
                    LetteringPermissionHelper.requestPhonePermissions(this, REQ_PHONE)
                }
                if (!LetteringPermissionHelper.canDrawOverlays(this)) {
                    LetteringPermissionHelper.openOverlaySettings(this)
                }
            }
            .setNegativeButton("취소", null)
            .show()
    }

    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<out String>,
        grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == REQ_PHONE && LetteringPermissionHelper.allGranted(this)) {
            LetteringPrefs.setLetteringEnabled(this, true)
            Toast.makeText(this, "레터링을 사용할 수 있습니다.", Toast.LENGTH_SHORT).show()
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
            activity.runOnUiThread { activity.promptLetteringPermissions() }
        }
    }

    companion object {
        const val EXTRA_REQUEST_PERMISSIONS = "request_permissions"
        const val EXTRA_OPEN_CERT = "open_cert"
        private const val REQ_PHONE = 4102
        private const val TAG = "VlueMainActivity"
    }
}
