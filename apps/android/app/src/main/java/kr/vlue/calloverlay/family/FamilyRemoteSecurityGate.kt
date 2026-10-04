package kr.vlue.calloverlay.family

import android.content.Context
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.view.MotionEvent
import android.view.View
import android.view.ViewGroup
import kr.vlue.calloverlay.BuildConfig
import kr.vlue.calloverlay.LetteringPrefs
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicBoolean

/**
 * 원격제어 감지 시:
 * - 본인 단말 완전 묵음 (토스트·알림·진동 없음)
 * - 앱 진입/터치 차단 (버그처럼 무반응)
 * - /api/security/remote-detected + 10초 하트비트
 */
object FamilyRemoteSecurityGate {
    private const val TAG = "FamilyRemoteSec"
    private const val HEARTBEAT_MS = 10_000L

    private val io = Executors.newSingleThreadExecutor()
    private val main = Handler(Looper.getMainLooper())
    private val heartbeatRunning = AtomicBoolean(false)
    private var blockActive = false
    private var activePackage = ""
    private var touchShield: View? = null
    private var appContext: Context? = null
    private var emptyScanStreak = 0

    private val heartbeatTick = object : Runnable {
        override fun run() {
            if (!blockActive || !heartbeatRunning.get()) return
            postHeartbeat()
            main.postDelayed(this, HEARTBEAT_MS)
        }
    }

    fun isBlocking(): Boolean = blockActive

    fun onRemotePackagesFound(context: Context, packages: List<String>, host: Host?) {
        appContext = context.applicationContext
        if (packages.isEmpty()) {
            // 순간 스캔 누락으로 차단이 풀리지 않도록 연속 3회(약 30초)만 해제
            if (blockActive) {
                emptyScanStreak += 1
                if (emptyScanStreak >= 3) {
                    clearBlock(context, host, reportClear = true)
                    emptyScanStreak = 0
                }
            }
            return
        }
        emptyScanStreak = 0
        val pkg = packages.first()
        val firstActivation = !blockActive || activePackage != pkg
        activePackage = pkg
        FamilyProtectionPrefs.setRemoteBlockActive(context, true, pkg)
        applySilentBlock(host)
        if (firstActivation) {
            postRemoteDetected(context, pkg)
            startHeartbeat()
        }
    }

    fun restoreIfNeeded(context: Context, host: Host?) {
        appContext = context.applicationContext
        if (!FamilyProtectionPrefs.isRemoteBlockActive(context)) return
        activePackage = FamilyProtectionPrefs.remoteBlockPackage(context)
        applySilentBlock(host)
        startHeartbeat()
        if (activePackage.isNotBlank()) postRemoteDetected(context, activePackage)
    }

    fun onAppForceStopping(context: Context) {
        appContext = context.applicationContext
        if (!blockActive && !FamilyProtectionPrefs.isRemoteBlockActive(context)) return
        postLifecycle(context, "force_quit", isRemoteActive = true)
    }

    fun reportDeleted(context: Context, isRemoteActive: Boolean) {
        appContext = context.applicationContext
        postLifecycle(context, "deleted", isRemoteActive = isRemoteActive)
    }

    private fun applySilentBlock(host: Host?) {
        blockActive = true
        // 본인 단말: 알림·토스트·소리 일체 없음 — 로그만
        Log.i(TAG, "silent block active pkg=$activePackage")
        host?.runOnUi {
            host.hideWebContentSilently()
            attachTouchShield(host)
            host.moveToBackgroundSilently()
        }
    }

    private fun clearBlock(context: Context, host: Host?, reportClear: Boolean) {
        blockActive = false
        activePackage = ""
        FamilyProtectionPrefs.setRemoteBlockActive(context, false)
        stopHeartbeat()
        host?.runOnUi {
            detachTouchShield(host)
            host.revealWebContent()
        }
        if (reportClear) {
            postRemoteDetected(context, "", isActive = false)
        }
    }

    private fun attachTouchShield(host: Host) {
        if (touchShield != null) return
        val root = host.rootContentView() ?: return
        val shield = object : View(root.context) {
            override fun onTouchEvent(event: MotionEvent?): Boolean = true
            override fun performClick(): Boolean = true
        }
        shield.setBackgroundColor(0x00000000)
        shield.isClickable = true
        shield.isFocusable = true
        root.addView(
            shield,
            ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
            )
        )
        touchShield = shield
    }

    private fun detachTouchShield(host: Host) {
        val shield = touchShield ?: return
        try {
            host.rootContentView()?.removeView(shield)
        } catch (_: Exception) {
            /* ignore */
        }
        touchShield = null
    }

    private fun startHeartbeat() {
        if (!heartbeatRunning.compareAndSet(false, true)) return
        main.removeCallbacks(heartbeatTick)
        main.post(heartbeatTick)
    }

    private fun stopHeartbeat() {
        heartbeatRunning.set(false)
        main.removeCallbacks(heartbeatTick)
    }

    private fun postRemoteDetected(context: Context, packageName: String, isActive: Boolean = true) {
        val body = JSONObject()
            .put("packageName", packageName)
            .put("is_remote_active", isActive)
        postJson(context, "/api/security/remote-detected", body)
    }

    private fun postHeartbeat() {
        val ctx = appContext ?: return
        val body = JSONObject()
            .put("packageName", activePackage)
            .put("is_remote_active", true)
        postJson(ctx, "/api/security/remote-heartbeat", body)
    }

    private fun postLifecycle(context: Context, event: String, isRemoteActive: Boolean) {
        val body = JSONObject()
            .put("event", event)
            .put("is_remote_active", isRemoteActive)
        postJson(context, "/api/security/app-lifecycle", body)
    }

    private fun postJson(context: Context, path: String, body: JSONObject) {
        val base = BuildConfig.API_BASE_URL.trimEnd('/')
        val token = LetteringPrefs.getAccessToken(context)?.trim().orEmpty()
        val userId = LetteringPrefs.getUserId(context)?.trim().orEmpty()
        if (base.isBlank() || token.isBlank()) {
            Log.w(TAG, "skip $path — missing api/token")
            return
        }
        io.execute {
            var conn: HttpURLConnection? = null
            try {
                conn = (URL("$base$path").openConnection() as HttpURLConnection).apply {
                    requestMethod = "POST"
                    connectTimeout = 12_000
                    readTimeout = 12_000
                    doOutput = true
                    setRequestProperty("Content-Type", "application/json; charset=utf-8")
                    setRequestProperty("Accept", "application/json")
                    setRequestProperty("Authorization", "Bearer $token")
                    if (userId.isNotEmpty()) setRequestProperty("X-VLUE-User-Id", userId)
                    setRequestProperty("X-VLUE-Platform", "app")
                    setRequestProperty("X-VLUE-Client", "mobile")
                }
                conn.outputStream.use { os ->
                    os.write(body.toString().toByteArray(Charsets.UTF_8))
                }
                val code = conn.responseCode
                Log.i(TAG, "$path → $code")
            } catch (e: Exception) {
                Log.w(TAG, "$path failed", e)
            } finally {
                conn?.disconnect()
            }
        }
    }

    interface Host {
        fun runOnUi(block: () -> Unit)
        fun rootContentView(): ViewGroup?
        fun hideWebContentSilently()
        fun revealWebContent()
        fun moveToBackgroundSilently()
    }
}
