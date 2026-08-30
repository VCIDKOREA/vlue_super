package kr.vlue.calloverlay

import android.annotation.SuppressLint
import android.Manifest
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.ContactsContract
import android.provider.Settings
import org.json.JSONObject
import android.util.Log
import android.view.View
import android.view.WindowManager
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.FrameLayout
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import kr.vlue.calloverlay.applock.AppLockStore
import kr.vlue.calloverlay.applock.PinLockController
import kr.vlue.calloverlay.family.FamilyPermissionHelper
import kr.vlue.calloverlay.family.FamilyProtectionPrefs
import kr.vlue.calloverlay.family.FamilyCareForegroundService
import kr.vlue.calloverlay.family.FamilyDangerousPermissionScanner
import kr.vlue.calloverlay.family.FamilyDeleteIntentHelper
import kr.vlue.calloverlay.family.FamilyRemoteAppScanner
import kr.vlue.calloverlay.family.ScreenSecureHelper
import kr.vlue.calloverlay.family.VlueFamilyBridge

/**
 * VLUE 메인 WebView + 레터링 + 가족보호 + 앱 PIN 잠금
 */
class MainActivity : AppCompatActivity(), VlueFamilyBridge.FamilyBridgeHost {
    private lateinit var webView: WebView
    private lateinit var mainRoot: FrameLayout
    private lateinit var pinLock: PinLockController
    private var filePathCallback: ValueCallback<Array<Uri>>? = null
    private var pendingWebPermissionRequest: android.webkit.PermissionRequest? = null
    private var pendingWebGrantResources: Array<String>? = null
    /** PASS/포트원 본인인증 window.open 팝업 */
    private var certPopupDialog: AlertDialog? = null
    private var certPopupWebView: WebView? = null

    private val fileChooserLauncher =
        registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
            val cb = filePathCallback
            filePathCallback = null
            if (cb == null) return@registerForActivityResult
            if (result.resultCode != RESULT_OK) {
                cb.onReceiveValue(null)
                return@registerForActivityResult
            }
            val data = result.data
            val uris: Array<Uri>? = when {
                data?.clipData != null -> {
                    val clip = data.clipData!!
                    Array(clip.itemCount) { i -> clip.getItemAt(i).uri }
                }
                data?.data != null -> arrayOf(data.data!!)
                else -> null
            }
            cb.onReceiveValue(uris)
        }

    private val webMediaPermissionLauncher =
        registerForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) { grants ->
            val req = pendingWebPermissionRequest
            val toGrant = pendingWebGrantResources
            pendingWebPermissionRequest = null
            pendingWebGrantResources = null
            if (req == null) return@registerForActivityResult
            val camOk =
                LetteringPermissionHelper.hasCamera(this) ||
                    grants[android.Manifest.permission.CAMERA] == true
            try {
                if (camOk && !toGrant.isNullOrEmpty()) {
                    req.grant(toGrant)
                } else {
                    req.deny()
                }
            } catch (e: Exception) {
                Log.e(TAG, "web permission grant failed", e)
                try {
                    req.deny()
                } catch (_: Exception) {
                }
            }
        }

    private val pushNotificationPermissionLauncher =
        registerForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
            Log.i(TAG, "POST_NOTIFICATIONS granted=$granted")
            if (granted) {
                kr.vlue.calloverlay.push.VlueFcmRegistrar.syncTokenAsync(this, "notif_permission")
            }
        }

    private fun ensurePushNotificationPermission() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) return
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) ==
            android.content.pm.PackageManager.PERMISSION_GRANTED
        ) {
            return
        }
        pushNotificationPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        applyNotificationWakeFlags(intent)
        VlueBigPushTrace.bind(this)
        AppLockStore.init(this)
        VlueSystemNotifier.ensureChannel(this)
        kr.vlue.calloverlay.family.FamilyProtectionNotificationHelper.ensureChannel(this)
        setContentView(R.layout.activity_main)
        mainRoot = findViewById(R.id.main_root)
        webView = findViewById(R.id.main_webview)
        webView.settings.javaScriptEnabled = true
        webView.settings.domStorageEnabled = true
        webView.settings.allowFileAccess = true
        webView.settings.allowContentAccess = true
        webView.settings.mediaPlaybackRequiresUserGesture = false
        webView.settings.setGeolocationEnabled(true)
        /* PASS·포트원 IMP.certification 이 window.open 사용 — 미설정 시 흰 화면 */
        webView.settings.javaScriptCanOpenWindowsAutomatically = true
        webView.settings.setSupportMultipleWindows(true)
        val defaultUa = webView.settings.userAgentString.orEmpty()
        if (!defaultUa.contains(VlueLetteringConfig.ANDROID_APP_UA_TOKEN)) {
            webView.settings.userAgentString = "$defaultUa ${VlueLetteringConfig.ANDROID_APP_UA_TOKEN}"
        }
        webView.addJavascriptInterface(MainJsBridge(this), LetteringJavascriptBridge.INTERFACE_NAME)
        webView.addJavascriptInterface(
            VlueFamilyBridge.NativeInterface(this),
            VlueFamilyBridge.INTERFACE_NAME
        )
        VlueFamilyBridge.attachWebView(webView)
        kr.vlue.calloverlay.push.VlueFcmTokenStore.attachWebView(webView)
        Thread {
            val token = kr.vlue.calloverlay.push.VlueFcmTokenStore.fetchTokenBlocking(this)
            if (token.isNotBlank()) {
                kr.vlue.calloverlay.push.VlueFcmRegistrar.syncTokenAsync(this, "app_start")
            }
        }.start()
        ensurePushNotificationPermission()

        pinLock = PinLockController(
            activity = this,
            root = mainRoot,
            onUnlockedForLaunch = {
                webView.visibility = View.VISIBLE
            },
            onNotifyWeb = { event, detail -> dispatchWebCustomEvent(event, detail) }
        )

        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView?, request: android.webkit.WebResourceRequest?): Boolean {
                val url = request?.url?.toString().orEmpty()
                return handleSpecialUrl(url)
            }

            @Deprecated("Deprecated in Java")
            override fun shouldOverrideUrlLoading(view: WebView?, url: String?): Boolean {
                return handleSpecialUrl(url.orEmpty())
            }

            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                injectFamilyBridgeBootstrap()
                injectAppLockBridgeBootstrap()
                scanRemoteApps()
                scanDangerousApps()
                handleFamilyInviteIntent(intent)
            }
        }

        webView.webChromeClient = object : WebChromeClient() {
            override fun onCreateWindow(
                view: WebView?,
                isDialog: Boolean,
                isUserGesture: Boolean,
                resultMsg: android.os.Message?
            ): Boolean {
                return openCertPopupWindow(resultMsg)
            }

            override fun onCloseWindow(window: WebView?) {
                dismissCertPopup()
            }

            override fun onGeolocationPermissionsShowPrompt(
                origin: String?,
                callback: android.webkit.GeolocationPermissions.Callback?
            ) {
                val allow = LetteringPermissionHelper.hasLocation(this@MainActivity)
                callback?.invoke(origin, allow, false)
                if (!allow) {
                    Toast.makeText(
                        this@MainActivity,
                        "위치 권한이 필요합니다. 설정에서 허용해 주세요.",
                        Toast.LENGTH_SHORT
                    ).show()
                }
            }

            override fun onPermissionRequest(request: android.webkit.PermissionRequest?) {
                if (request == null) return
                runOnUiThread {
                    val grantable = mutableListOf<String>()
                    val need = mutableListOf<String>()
                    for (r in request.resources ?: emptyArray()) {
                        when (r) {
                            android.webkit.PermissionRequest.RESOURCE_VIDEO_CAPTURE -> {
                                grantable.add(r)
                                if (!LetteringPermissionHelper.hasCamera(this@MainActivity)) {
                                    need.add(android.Manifest.permission.CAMERA)
                                }
                            }
                            // AUDIO: 매니페스트에 RECORD_AUDIO 없음 → 스캐너용으로 생략
                            else -> {
                                if (r != android.webkit.PermissionRequest.RESOURCE_AUDIO_CAPTURE) {
                                    grantable.add(r)
                                }
                            }
                        }
                    }
                    if (grantable.isEmpty()) {
                        request.deny()
                        return@runOnUiThread
                    }
                    if (need.isEmpty()) {
                        try {
                            request.grant(grantable.toTypedArray())
                        } catch (e: Exception) {
                            Log.e(TAG, "permission grant failed", e)
                            request.deny()
                        }
                        return@runOnUiThread
                    }
                    try {
                        pendingWebPermissionRequest?.deny()
                    } catch (_: Exception) {
                    }
                    pendingWebPermissionRequest = request
                    pendingWebGrantResources = grantable.toTypedArray()
                    webMediaPermissionLauncher.launch(need.distinct().toTypedArray())
                }
            }

            override fun onShowFileChooser(
                webView: WebView?,
                filePathCallback: ValueCallback<Array<Uri>>?,
                fileChooserParams: FileChooserParams?
            ): Boolean {
                this@MainActivity.filePathCallback?.onReceiveValue(null)
                this@MainActivity.filePathCallback = filePathCallback
                return try {
                    val intent = fileChooserParams?.createIntent()
                        ?: Intent(Intent.ACTION_GET_CONTENT).apply {
                            addCategory(Intent.CATEGORY_OPENABLE)
                            type = "image/*"
                            putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true)
                        }
                    fileChooserLauncher.launch(intent)
                    true
                } catch (e: Exception) {
                    Log.e(TAG, "file chooser failed", e)
                    this@MainActivity.filePathCallback?.onReceiveValue(null)
                    this@MainActivity.filePathCallback = null
                    Toast.makeText(this@MainActivity, "사진 선택 창을 열 수 없습니다.", Toast.LENGTH_SHORT).show()
                    false
                }
            }
        }

        onBackPressedDispatcher.addCallback(
            this,
            object : androidx.activity.OnBackPressedCallback(true) {
                override fun handleOnBackPressed() {
                    if (!::webView.isInitialized) {
                        moveTaskToBack(true)
                        return
                    }
                    // 1) SPA 내부 뒤로가기 우선 (시트·페이지 스택)
                    webView.evaluateJavascript(
                        """
                        (function(){
                          try{
                            if(window.VlueAndroidBack&&typeof window.VlueAndroidBack==='function'){
                              return window.VlueAndroidBack()?'1':'0';
                            }
                          }catch(e){}
                          return '0';
                        })();
                        """.trimIndent()
                    ) { result ->
                        val handled = result?.trim('"', ' ') == "1"
                        if (handled) return@evaluateJavascript
                        // 2) intent:// 실패 등 WebView 히스토리(에러 페이지)만 되돌림
                        if (webView.canGoBack()) {
                            webView.goBack()
                            return@evaluateJavascript
                        }
                        // 3) 홈에서는 앱 종료가 아니라 백그라운드
                        moveTaskToBack(true)
                    }
                }
            }
        )

        // PIN 게이트가 필요하면 WebView는 아래에서 로드하되 오버레이로 가림
        if (pinLock.shouldBlockLaunch() || AppLockStore.requiresIdentityReset()) {
            webView.visibility = View.INVISIBLE
            pinLock.showLaunchGateIfNeeded()
        } else {
            webView.visibility = View.VISIBLE
        }

        webView.loadUrl(VlueLetteringConfig.appShellUrl)

        try {
            LetteringIntegration.onMainActivityReady(this)
        } catch (e: Exception) {
            Log.e(TAG, "lettering init failed", e)
        }

        if (!LetteringPermissionHelper.hasPhonePermissions(this)) {
            requestLetteringOsPermissionsDirect()
        } else if (!FamilyPermissionHelper.allGranted(this)) {
            requestFamilyProtectionPermissions()
        }

        if (intent.getBooleanExtra(EXTRA_REQUEST_PERMISSIONS, false)) {
            requestLetteringOsPermissionsDirect()
        }
        if (intent.getBooleanExtra(EXTRA_OPEN_APP_SETTINGS, false)) {
            LetteringPermissionHelper.openAppSettings(this)
        }
        if (intent.getBooleanExtra(EXTRA_REQUEST_DIALER_ROLE, false)) {
            promptDefaultDialerIfNeeded()
        }
        if (intent.hasExtra(EXTRA_OPEN_CERT)) {
            val json = intent.getStringExtra(EXTRA_OPEN_CERT).orEmpty()
            webView.loadUrl(
                VlueLetteringConfig.appUrl(
                    "mypage?letteringCert=" + java.net.URLEncoder.encode(json, "UTF-8")
                )
            )
        }
        handleMemoShareIntent(intent)
    }

    override fun onNewIntent(intent: Intent?) {
        super.onNewIntent(intent)
        if (intent != null) {
            setIntent(intent)
            applyNotificationWakeFlags(intent)
            handleMemoShareIntent(intent)
            handleFamilyInviteIntent(intent)
        }
    }

    private fun applyNotificationWakeFlags(intent: Intent?) {
        if (intent?.getBooleanExtra("vlue_open_from_notification", false) != true) return
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true)
            setTurnScreenOn(true)
        }
        window?.addFlags(
            WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
                WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON or
                WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON
        )
    }

    private fun handleFamilyInviteIntent(intent: Intent?) {
        if (intent == null) return
        val linkId = intent.getStringExtra("vlue_family_link_id")?.trim().orEmpty()
        if (linkId.isEmpty()) return
        val action = intent.getStringExtra("vlue_family_invite_action")?.trim().orEmpty().ifBlank { "open" }
        if (!::webView.isInitialized) return
        val safeLink = org.json.JSONObject.quote(linkId)
        val safeAction = org.json.JSONObject.quote(action)
        webView.post {
            webView.evaluateJavascript(
                """
                (function(){
                  try{
                    window.dispatchEvent(new CustomEvent('vlue-family-invite-deep-link',{
                      detail:{ linkId:$safeLink, action:$safeAction }
                    }));
                  }catch(e){}
                })();
                """.trimIndent(),
                null
            )
        }
    }

    override fun onStart() {
        super.onStart()
        if (::pinLock.isInitialized) {
            if (pinLock.shouldBlockLaunch() || AppLockStore.requiresIdentityReset()) {
                webView.visibility = View.INVISIBLE
                pinLock.showLaunchGateIfNeeded()
            }
        }
    }

    override fun onStop() {
        // 앱 잠금 ON: 백그라운드 후 재진입 시 다시 PIN
        if (::pinLock.isInitialized && AppLockStore.isAppLockEnabled()) {
            pinLock.clearSession()
        }
        super.onStop()
    }

    /**
     * 포트원/이니시스/PASS 본인인증용 window.open → 다이얼로그 WebView.
     * 미구현이면 about:blank 흰 화면만 남음.
     */
    @SuppressLint("SetJavaScriptEnabled")
    private fun openCertPopupWindow(resultMsg: android.os.Message?): Boolean {
        if (resultMsg == null) return false
        dismissCertPopup()
        val popup = WebView(this).apply {
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.javaScriptCanOpenWindowsAutomatically = true
            settings.setSupportMultipleWindows(true)
            settings.userAgentString = webView.settings.userAgentString
            webViewClient = object : WebViewClient() {
                override fun shouldOverrideUrlLoading(
                    view: WebView?,
                    request: android.webkit.WebResourceRequest?
                ): Boolean {
                    val url = request?.url?.toString().orEmpty()
                    if (isAppShellReturnUrl(url)) {
                        webView.loadUrl(url)
                        dismissCertPopup()
                        return true
                    }
                    return handleSpecialUrl(url)
                }

                @Deprecated("Deprecated in Java")
                override fun shouldOverrideUrlLoading(view: WebView?, url: String?): Boolean {
                    val u = url.orEmpty()
                    if (isAppShellReturnUrl(u)) {
                        webView.loadUrl(u)
                        dismissCertPopup()
                        return true
                    }
                    return handleSpecialUrl(u)
                }
            }
            webChromeClient = object : WebChromeClient() {
                override fun onCloseWindow(window: WebView?) {
                    dismissCertPopup()
                }
            }
        }
        certPopupWebView = popup
        val container = FrameLayout(this).apply {
            addView(
                popup,
                FrameLayout.LayoutParams(
                    FrameLayout.LayoutParams.MATCH_PARENT,
                    FrameLayout.LayoutParams.MATCH_PARENT
                )
            )
        }
        certPopupDialog = AlertDialog.Builder(this)
            .setView(container)
            .setNegativeButton("닫기") { _, _ -> dismissCertPopup() }
            .setOnDismissListener { cleanupCertPopupViews() }
            .create()
            .also { dialog ->
                dialog.setCanceledOnTouchOutside(false)
                dialog.show()
                dialog.window?.setLayout(
                    (resources.displayMetrics.widthPixels * 0.96f).toInt(),
                    (resources.displayMetrics.heightPixels * 0.88f).toInt()
                )
            }
        val transport = resultMsg.obj as? WebView.WebViewTransport ?: return false
        transport.webView = popup
        resultMsg.sendToTarget()
        return true
    }

    private fun isAppShellReturnUrl(url: String): Boolean {
        if (url.isBlank()) return false
        return try {
            val uri = Uri.parse(url)
            val host = uri.host?.lowercase().orEmpty()
            val path = uri.path.orEmpty()
            val isVlue =
                host == "www.vlue.kr" || host == "vlue.kr" || host.endsWith(".vlue.kr") ||
                    host == "localhost" || host == "127.0.0.1"
            isVlue && (path == "/app" || path.startsWith("/app/"))
        } catch (_: Exception) {
            false
        }
    }

    private fun dismissCertPopup() {
        try {
            certPopupDialog?.dismiss()
        } catch (_: Exception) {
        }
        cleanupCertPopupViews()
    }

    private fun cleanupCertPopupViews() {
        try {
            certPopupWebView?.destroy()
        } catch (_: Exception) {
        }
        certPopupWebView = null
        certPopupDialog = null
    }

    /** intent:// · PASS · kakaolink · tel 등 커스텀 스킴 → 외부 앱 */
    private fun handleSpecialUrl(url: String): Boolean {
        if (url.isBlank()) return false
        val lower = url.lowercase()
        if (lower.startsWith("http://") || lower.startsWith("https://") || lower.startsWith("about:") ||
            lower.startsWith("data:") || lower.startsWith("blob:")
        ) {
            return false
        }
        return try {
            when {
                lower.startsWith("intent:") -> {
                    val intent = Intent.parseUri(url, Intent.URI_INTENT_SCHEME)
                    try {
                        startActivity(intent)
                    } catch (_: Exception) {
                        val fallback = intent.getStringExtra("browser_fallback_url")
                        val pkg = intent.`package`
                        when {
                            !fallback.isNullOrBlank() -> {
                                (certPopupWebView ?: webView).loadUrl(fallback)
                            }
                            !pkg.isNullOrBlank() -> {
                                startActivity(
                                    Intent(
                                        Intent.ACTION_VIEW,
                                        Uri.parse("market://details?id=$pkg")
                                    )
                                )
                            }
                            else -> Toast.makeText(this, "연결할 앱을 찾을 수 없습니다.", Toast.LENGTH_SHORT).show()
                        }
                    }
                    true
                }
                lower.startsWith("kakaolink:") || lower.startsWith("kakao") ||
                    lower.startsWith("tel:") || lower.startsWith("sms:") ||
                    lower.startsWith("mailto:") || lower.startsWith("market:") ||
                    lower.startsWith("ispmobile:") || lower.startsWith("tauthlink:") ||
                    lower.startsWith("kftc-bankpay:") || lower.startsWith("supertoss:") ||
                    lower.startsWith("cloudpay:") || lower.startsWith("nhappocardcert:") ||
                    lower.startsWith("lid:") || lower.startsWith("niceiphonecert:") ||
                    lower.startsWith("samsungpass:") || lower.startsWith("mbmobilebank:") -> {
                    startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)))
                    true
                }
                else -> {
                    try {
                        startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)))
                        true
                    } catch (_: Exception) {
                        false
                    }
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "special url failed: $url", e)
            false
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
        /* 통화 중 아닌 상태에서 TYPE_APPLICATION_OVERLAY addView 실험 — UI 변경 없음 */
        window.decorView.postDelayed({
            if (!isFinishing) {
                kr.vlue.calloverlay.diagnostics.NormalOverlayProbe.scheduleIfEligible(this)
            }
        }, 2500L)
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

    private fun injectAppLockBridgeBootstrap() {
        val script =
            """
            (function(){
              function send(msg){
                try{
                  if(window.Android&&window.Android.onWebMessage){
                    window.Android.onWebMessage(typeof msg==='string'?msg:JSON.stringify(msg));
                  }
                }catch(e){}
              }
              window.ReactNativeWebView=window.ReactNativeWebView||{postMessage:send};
              window.VlueAppLock=Object.assign({},window.VlueAppLock||{},{
                __native:true,
                requestAuth:function(id){send({type:'requestAuth',requestId:String(id||'')});},
                requestPinSetup:function(id){send({type:'requestAppPinSetup',requestId:String(id||'')});},
                getStatus:function(){
                  try{return JSON.parse(window.Android.getAppLockStatusJson());}catch(e){return null;}
                }
              });
              window.VlueLettering=Object.assign({},window.VlueLettering||{},{
                getDeviceContactsJson:function(){
                  try{return window.Android&&window.Android.getDeviceContactsJson?window.Android.getDeviceContactsJson():'[]';}
                  catch(e){return '[]';}
                },
                syncMemberPhone:function(p){
                  try{if(window.Android&&window.Android.syncMemberPhone)window.Android.syncMemberPhone(String(p||''));}catch(e){}
                },
                openShowcaseSms:function(p){
                  try{if(window.Android&&window.Android.openShowcaseSms)window.Android.openShowcaseSms(String(p||''));}catch(e){}
                },
                getDeviceCallLogJson:function(limit){
                  try{
                    if(window.Android&&window.Android.getDeviceCallLogJson){
                      return window.Android.getDeviceCallLogJson(String(limit==null?200:limit));
                    }
                    return '[]';
                  }catch(e){return '[]';}
                },
                getLetteringPermissionStatusJson:function(){
                  try{return window.Android&&window.Android.getLetteringPermissionStatusJson?window.Android.getLetteringPermissionStatusJson():null;}
                  catch(e){return null;}
                },
                requestLetteringPermissions:function(){
                  try{if(window.Android&&window.Android.requestLetteringPermissions)window.Android.requestLetteringPermissions();}catch(e){}
                },
                openUrl:function(url){
                  try{if(window.Android&&window.Android.openExternalUrl)window.Android.openExternalUrl(String(url||''));}catch(e){}
                },
                openAppSettings:function(){
                  try{if(window.Android&&window.Android.openAppSettings)window.Android.openAppSettings();}catch(e){}
                }
              });
            })();
            """.trimIndent()
        webView.evaluateJavascript(script, null)
    }

    fun dispatchWebCustomEvent(eventName: String, detailJson: String) {
        if (!::webView.isInitialized) return
        val nameQ = JSONObject.quote(eventName)
        // detailJson is already a JSON object string
        val script =
            "(function(){try{var d=$detailJson;window.dispatchEvent(new CustomEvent($nameQ,{detail:d}));}catch(e){}})();"
        webView.post { webView.evaluateJavascript(script, null) }
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
        if (LetteringPermissionHelper.hasCallOverlayReady(this)) {
            LetteringPrefs.setLetteringEnabled(this, true)
            Toast.makeText(this, "통화·오버레이 권한이 준비되었습니다.", Toast.LENGTH_SHORT).show()
            return
        }
        AlertDialog.Builder(this)
            .setTitle("VLUE 레터링 권한")
            .setMessage(
                "통화 중 쇼케이스를 위해 다음이 필요합니다.\n" +
                    "· 다른 앱 위에 표시 (필수)\n" +
                    "· 전화 상태·통화 기록·연락처 (필수)\n" +
                    "카메라·위치는 나중에 허용해도 통화 쇼케이스는 동작합니다."
            )
            .setPositiveButton("권한 설정") { _, _ ->
                requestLetteringOsPermissionsDirect()
            }
            .setNegativeButton("취소", null)
            .show()
    }

    /** 웹「허용하고 계속」— 시스템 권한 다이얼로그를 즉시 요청 */
    fun requestLetteringOsPermissionsDirect() {
        if (!LetteringPermissionHelper.hasCallDetectPermissions(this)) {
            LetteringPermissionHelper.requestPhonePermissions(this, REQ_PHONE)
            return
        }
        if (!LetteringPermissionHelper.canDrawOverlays(this)) {
            LetteringPermissionHelper.openOverlaySettings(this)
            return
        }
        if (!kr.vlue.calloverlay.companion.UsageAccessHelper.hasAccess(this)) {
            Toast.makeText(
                this,
                "전체 수신 UI 상단 배치를 위해「사용 정보 접근」허용이 필요합니다.",
                Toast.LENGTH_LONG
            ).show()
            LetteringPermissionHelper.openUsageAccessSettings(this)
            return
        }
        LetteringPrefs.setLetteringEnabled(this, true)
    }

    /**
     * 기본 전화 앱(ROLE_DIALER) 안내는 사용하지 않음.
     * Companion MVP: VLUE는 전화 앱이 아니며 삼성 전화 앱 위 오버레이로 쇼케이스만 표시.
     */
    fun promptDefaultDialerIfNeeded() {
        /* no-op */
    }

    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<out String>,
        grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == REQ_PHONE) {
            if (LetteringPermissionHelper.hasCallDetectPermissions(this)) {
                LetteringPrefs.setLetteringEnabled(this, true)
                Toast.makeText(this, "통화 권한이 허용되었습니다. 레터링이 켜집니다.", Toast.LENGTH_SHORT).show()
                if (!LetteringPermissionHelper.canDrawOverlays(this)) {
                    LetteringPermissionHelper.openOverlaySettings(this)
                } else if (!kr.vlue.calloverlay.companion.UsageAccessHelper.hasAccess(this)) {
                    Toast.makeText(
                        this,
                        "전체 수신 UI 상단 배치를 위해「사용 정보 접근」허용이 필요합니다.",
                        Toast.LENGTH_LONG
                    ).show()
                    LetteringPermissionHelper.openUsageAccessSettings(this)
                }
            } else {
                Toast.makeText(this, "전화·통화기록 권한이 필요합니다. 설정에서 허용해 주세요.", Toast.LENGTH_LONG).show()
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
        fun isCompanionOverlayActive(): String {
            if (CallOverlayService.isCompanionSurfaceVisible()) return "1"
            if (LetteringCallCoordinator.isIncomingRingingActive()) return "1"
            return "0"
        }

        /** 웹 로그인 세션 → 네이티브 (알림 수락/거절 API용) */
        @android.webkit.JavascriptInterface
        fun bindUserSession(userId: String?, accessToken: String?) {
            LetteringPrefs.setSession(
                activity,
                userId?.trim()?.ifEmpty { null },
                accessToken?.trim()?.ifEmpty { null }
            )
            activity.ensurePushNotificationPermission()
            kr.vlue.calloverlay.push.VlueFcmRegistrar.syncTokenAsync(activity, "bindUserSession")
        }

        @android.webkit.JavascriptInterface
        fun bindDeviceToken(deviceToken: String?) {
            LetteringPrefs.setDeviceToken(activity, deviceToken)
            kr.vlue.calloverlay.push.VlueFcmRegistrar.clearUploadCache(activity)
            kr.vlue.calloverlay.push.VlueFcmRegistrar.syncTokenAsync(activity, "bindDeviceToken")
        }

        @android.webkit.JavascriptInterface
        fun clearUserSession() {
            LetteringPrefs.setSession(activity, null, null)
            LetteringPrefs.setDeviceToken(activity, null)
            kr.vlue.calloverlay.push.VlueFcmRegistrar.clearUploadCache(activity)
        }

        /** 웹 SSE·알림함 → OS 상태바 푸시 (FCM 미등록 기기 보완) */
        @android.webkit.JavascriptInterface
        fun showSystemNotification(title: String?, body: String?, tag: String?) {
            activity.runOnUiThread {
                VlueSystemNotifier.show(
                    activity,
                    title.orEmpty(),
                    body.orEmpty(),
                    tag
                )
            }
        }

        /** 가족 보호 초대 — 수락/거절 OS 알림 액션 */
        @android.webkit.JavascriptInterface
        fun showFamilyInviteNotification(title: String?, body: String?, linkId: String?) {
            activity.runOnUiThread {
                kr.vlue.calloverlay.family.FamilyProtectionNotificationHelper.showInvite(
                    activity,
                    title.orEmpty(),
                    body.orEmpty(),
                    linkId.orEmpty()
                )
            }
        }

        /** 네이티브 FCM 등록 토큰 — 웹이 /api/auth/devices/fcm-token 에 전달 */
        @android.webkit.JavascriptInterface
        fun getFcmToken(): String {
            return try {
                kr.vlue.calloverlay.push.VlueFcmTokenStore.read(activity)
            } catch (_: Exception) {
                ""
            }
        }

        @android.webkit.JavascriptInterface
        fun refreshFcmToken() {
            Thread {
                val token =
                    kr.vlue.calloverlay.push.VlueFcmTokenStore.fetchTokenBlocking(activity)
                if (token.isNotBlank()) {
                    kr.vlue.calloverlay.push.VlueFcmRegistrar.clearUploadCache(activity)
                    kr.vlue.calloverlay.push.VlueFcmTokenStore.notifyWebToken(activity, token)
                    kr.vlue.calloverlay.push.VlueFcmRegistrar.syncTokenAsync(activity, "refreshFcmToken")
                }
            }.start()
        }

        @android.webkit.JavascriptInterface
        fun setLetteringEnabled(value: String) {
            activity.runOnUiThread {
                val on = value == "1" || value == "true"
                if (on) {
                    /* 웹 토글 ON → 네이티브도 먼저 켠다. 권한 부족 시 안내만 추가 */
                    LetteringPrefs.setLetteringEnabled(activity, true)
                    if (!LetteringPermissionHelper.hasCallOverlayReady(activity)) {
                        activity.promptLetteringPermissions()
                    }
                } else {
                    LetteringPrefs.setLetteringEnabled(activity, false)
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
            activity.runOnUiThread { activity.promptDefaultDialerIfNeeded() }
        }

        @android.webkit.JavascriptInterface
        fun getLetteringPermissionStatusJson(): String {
            return LetteringPermissionHelper.statusJson(activity)
        }

        /** QA — 수신 없이 빅푸시 경로 강제 기동 */
        @android.webkit.JavascriptInterface
        fun testLetteringBigPush(phone: String?) {
            activity.runOnUiThread {
                val number = phone?.trim().orEmpty().ifBlank { "01000000000" }
                LetteringPrefs.setLetteringEnabled(activity, true)
                LetteringCallCoordinator.onRinging(activity, number, outgoing = false)
                android.widget.Toast.makeText(
                    activity,
                    "빅푸시 테스트 기동 ($number)",
                    android.widget.Toast.LENGTH_SHORT
                ).show()
            }
        }

        /** QA — 국가기관 DCP 정상 경로 오버레이 */
        @android.webkit.JavascriptInterface
        fun testDcpPathNormal() {
            activity.runOnUiThread {
                LetteringCallCoordinator.onDcpPathTest(activity, abnormal = false)
                android.widget.Toast.makeText(
                    activity,
                    "DCP 정상 경로 테스트 (112)",
                    android.widget.Toast.LENGTH_SHORT
                ).show()
            }
        }

        /** QA — 경로 검증 비정상 경고 오버레이 */
        @android.webkit.JavascriptInterface
        fun testDcpPathAbnormal() {
            activity.runOnUiThread {
                LetteringCallCoordinator.onDcpPathTest(activity, abnormal = true)
                android.widget.Toast.makeText(
                    activity,
                    "DCP 비정상 경로 테스트",
                    android.widget.Toast.LENGTH_SHORT
                ).show()
            }
        }

        @android.webkit.JavascriptInterface
        fun getDeviceContactsJson(): String {
            return DeviceContactsReader.readAsJson(activity)
        }

        @android.webkit.JavascriptInterface
        fun syncMemberPhone(phone: String?) {
            LetteringPrefs.setMemberPhone(activity, phone)
        }

        @android.webkit.JavascriptInterface
        fun openShowcaseSms(toPhone: String?) {
            val to = toPhone?.trim().orEmpty()
            if (to.isEmpty()) return
            activity.runOnUiThread {
                ShowcaseSmsComposer.openPrefill(
                    activity,
                    toPhone = to,
                    ownerPhone = LetteringPrefs.getMemberPhone(activity)
                )
            }
        }

        /** 앱「통화 목록」— 시스템 CallLog 최근 건 */
        @android.webkit.JavascriptInterface
        fun getDeviceCallLogJson(limit: String?): String {
            val n = limit?.toIntOrNull() ?: 200
            return DeviceCallLogReader.readAsJson(activity, n)
        }

        /** 종이 명함 스캔 → 시스템 연락처 추가 화면 (Insert Intent) */
        @android.webkit.JavascriptInterface
        fun saveContactProfile(json: String?) {
            activity.runOnUiThread {
                try {
                    val obj = JSONObject(json ?: "{}")
                    val name = obj.optString("name").trim()
                    val org = obj.optString("organization").trim()
                    val title = obj.optString("title").trim()
                    val phone = obj.optString("phone").trim()
                    val fax = obj.optString("fax").trim()
                    val email = obj.optString("email").trim()
                    val website = obj.optString("website").trim()
                    val address = obj.optString("address").trim()
                    if (name.isEmpty() && phone.isEmpty() && email.isEmpty() && org.isEmpty()) {
                        Toast.makeText(activity, "저장할 연락처 정보가 없습니다.", Toast.LENGTH_SHORT).show()
                        return@runOnUiThread
                    }
                    val intent = Intent(ContactsContract.Intents.Insert.ACTION).apply {
                        type = ContactsContract.RawContacts.CONTENT_TYPE
                        if (name.isNotEmpty()) putExtra(ContactsContract.Intents.Insert.NAME, name)
                        if (org.isNotEmpty()) putExtra(ContactsContract.Intents.Insert.COMPANY, org)
                        if (title.isNotEmpty()) putExtra(ContactsContract.Intents.Insert.JOB_TITLE, title)
                        if (phone.isNotEmpty()) {
                            putExtra(ContactsContract.Intents.Insert.PHONE, phone)
                            putExtra(
                                ContactsContract.Intents.Insert.PHONE_TYPE,
                                ContactsContract.CommonDataKinds.Phone.TYPE_MOBILE
                            )
                        }
                        if (fax.isNotEmpty()) {
                            putExtra(ContactsContract.Intents.Insert.SECONDARY_PHONE, fax)
                            putExtra(
                                ContactsContract.Intents.Insert.SECONDARY_PHONE_TYPE,
                                ContactsContract.CommonDataKinds.Phone.TYPE_FAX_WORK
                            )
                        }
                        if (email.isNotEmpty()) {
                            putExtra(ContactsContract.Intents.Insert.EMAIL, email)
                            putExtra(
                                ContactsContract.Intents.Insert.EMAIL_TYPE,
                                ContactsContract.CommonDataKinds.Email.TYPE_WORK
                            )
                        }
                        if (address.isNotEmpty()) {
                            putExtra(ContactsContract.Intents.Insert.POSTAL, address)
                            putExtra(
                                ContactsContract.Intents.Insert.POSTAL_TYPE,
                                ContactsContract.CommonDataKinds.StructuredPostal.TYPE_WORK
                            )
                        }
                        if (website.isNotEmpty()) {
                            putExtra(ContactsContract.Intents.Insert.NOTES, website)
                        }
                    }
                    activity.startActivity(intent)
                } catch (e: Exception) {
                    Log.e(TAG, "saveContactProfile failed", e)
                    Toast.makeText(activity, "연락처 앱을 열 수 없습니다.", Toast.LENGTH_SHORT).show()
                }
            }
        }

        /** VCF 폴백 — 공유/뷰어로 열기 */
        @android.webkit.JavascriptInterface
        fun saveContact(vcf: String?, filename: String?) {
            activity.runOnUiThread {
                try {
                    val body = vcf?.trim().orEmpty()
                    if (body.isEmpty()) {
                        Toast.makeText(activity, "연락처 데이터가 비어 있습니다.", Toast.LENGTH_SHORT).show()
                        return@runOnUiThread
                    }
                    val share = Intent(Intent.ACTION_SEND).apply {
                        type = "text/x-vcard"
                        putExtra(Intent.EXTRA_TEXT, body)
                        putExtra(Intent.EXTRA_SUBJECT, filename ?: "VLUE-contact.vcf")
                    }
                    activity.startActivity(Intent.createChooser(share, "연락처 저장"))
                } catch (e: Exception) {
                    Log.e(TAG, "saveContact failed", e)
                    Toast.makeText(activity, "연락처를 저장할 수 없습니다.", Toast.LENGTH_SHORT).show()
                }
            }
        }

        @android.webkit.JavascriptInterface
        fun openAppSettings() {
            activity.runOnUiThread { LetteringPermissionHelper.openAppSettings(activity) }
        }

        /** https 명함/인증 페이지 — WebView 내 로드 대신 외부 브라우저/카톡 등으로 열어 /app 셸 유지 */
        @android.webkit.JavascriptInterface
        fun openExternalUrl(url: String?) {
            val u = url?.trim().orEmpty()
            if (u.isEmpty()) return
            activity.runOnUiThread {
                try {
                    activity.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(u)))
                } catch (e: Exception) {
                    Log.e(TAG, "openExternalUrl failed: $u", e)
                    Toast.makeText(activity, "페이지를 열 수 없습니다.", Toast.LENGTH_SHORT).show()
                }
            }
        }

        @android.webkit.JavascriptInterface
        fun getAppLockStatusJson(): String {
            AppLockStore.init(activity)
            return AppLockStore.statusJson()
        }

        @android.webkit.JavascriptInterface
        fun setAppLockEnabled(value: String) {
            activity.runOnUiThread {
                AppLockStore.init(activity)
                val on = value == "1" || value.equals("true", ignoreCase = true)
                if (on && !AppLockStore.hasPin()) {
                    activity.pinLock.showSetup()
                    return@runOnUiThread
                }
                AppLockStore.setAppLockEnabled(on)
                activity.dispatchWebCustomEvent(
                    "vlue-app-lock-status",
                    AppLockStore.statusJson()
                )
            }
        }

        @android.webkit.JavascriptInterface
        fun requestAppPinSetup(requestId: String?) {
            activity.runOnUiThread {
                activity.pinLock.showSetup(requestId.orEmpty())
            }
        }

        @android.webkit.JavascriptInterface
        fun requestAuth(requestId: String?) {
            activity.runOnUiThread {
                activity.webView.visibility = View.VISIBLE
                activity.pinLock.showAuthRequest(requestId.orEmpty())
            }
        }

        /** ReactNativeWebView.postMessage / VlueAppLock 공통 진입 */
        @android.webkit.JavascriptInterface
        fun onWebMessage(raw: String?) {
            val msg = raw.orEmpty().trim()
            if (msg.isEmpty()) return
            activity.runOnUiThread {
                try {
                    if (msg == "requestAuth") {
                        activity.pinLock.showAuthRequest("")
                        return@runOnUiThread
                    }
                    val o = JSONObject(msg)
                    when (o.optString("type", o.optString("action", ""))) {
                        "requestAuth" -> activity.pinLock.showAuthRequest(o.optString("requestId", ""))
                        "requestAppPinSetup", "setupPin" ->
                            activity.pinLock.showSetup(o.optString("requestId", ""))
                        "confirmPinResetIdentity" -> {
                            if (o.optBoolean("ok", true)) activity.pinLock.allowResetAfterIdentity()
                        }
                    }
                } catch (_: Exception) {
                    if (msg.contains("requestAuth", ignoreCase = true)) {
                        activity.pinLock.showAuthRequest("")
                    }
                }
            }
        }

        @android.webkit.JavascriptInterface
        fun confirmPinResetIdentity(ok: String?) {
            activity.runOnUiThread {
                if (ok == "1" || ok.equals("true", ignoreCase = true)) {
                    activity.pinLock.allowResetAfterIdentity()
                }
            }
        }

        @android.webkit.JavascriptInterface
        fun requestFamilyProtectionPermissions() {
            activity.runOnUiThread { activity.requestFamilyProtectionPermissions() }
        }
    }

    companion object {
        const val EXTRA_REQUEST_PERMISSIONS = "request_permissions"
        const val EXTRA_REQUEST_DIALER_ROLE = "request_dialer_role"
        const val EXTRA_OPEN_APP_SETTINGS = "open_app_settings"
        const val EXTRA_OPEN_CERT = "open_cert"
        private const val REQ_PHONE = 4102
        private const val REQ_FAMILY = 4103
        private const val TAG = "VlueMainActivity"
    }
}
