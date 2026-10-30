package kr.vlue.calloverlay.family

import android.app.AppOpsManager
import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Build
import android.os.PowerManager
import android.os.Process
import android.util.Log
import kr.vlue.calloverlay.BuildConfig
import kr.vlue.calloverlay.LetteringPrefs
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicLong

/**
 * 골든타임 A모드 — 화면 켜짐·UsageStats(타 앱 사용) 기반 실기기 활동 보고.
 * VLUE 앱 미오픈이어도 lastDeviceSeenAt 갱신 → 오탐(앱만 안 연 경우) 방지.
 */
object FamilyDeviceActivitySensor {
    private const val TAG = "FamilyDeviceSeen"
    private const val MIN_POST_INTERVAL_MS = 60_000L
    private const val USAGE_LOOKBACK_MS = 120_000L

    private val io = Executors.newSingleThreadExecutor()
    private val lastPostAt = AtomicLong(0L)
    @Volatile private var registered = false

    private val screenReceiver =
        object : BroadcastReceiver() {
            override fun onReceive(context: Context?, intent: Intent?) {
                val ctx = context?.applicationContext ?: return
                when (intent?.action) {
                    Intent.ACTION_SCREEN_ON,
                    Intent.ACTION_USER_PRESENT ->
                        report(ctx, source = "screen_on")
                }
            }
        }

    fun ensureStarted(context: Context) {
        val app = context.applicationContext
        if (!registered) {
            val filter =
                IntentFilter().apply {
                    addAction(Intent.ACTION_SCREEN_ON)
                    addAction(Intent.ACTION_USER_PRESENT)
                }
            try {
                if (Build.VERSION.SDK_INT >= 33) {
                    app.registerReceiver(screenReceiver, filter, Context.RECEIVER_NOT_EXPORTED)
                } else {
                    @Suppress("DEPRECATION")
                    app.registerReceiver(screenReceiver, filter)
                }
                registered = true
            } catch (e: Exception) {
                Log.w(TAG, "register screen receiver failed", e)
            }
        }
        /* 서비스 틱에서도 최근 사용 여부 점검 */
        tick(app)
    }

    fun tick(context: Context) {
        val app = context.applicationContext
        if (isInteractive(app)) {
            report(app, source = "interactive")
            return
        }
        val pkg = recentForegroundPackage(app)
        if (!pkg.isNullOrBlank()) {
            report(app, source = "usage_stats", packageName = pkg)
        }
    }

    private fun isInteractive(context: Context): Boolean {
        return try {
            val pm = context.getSystemService(Context.POWER_SERVICE) as? PowerManager ?: return false
            if (Build.VERSION.SDK_INT >= 20) pm.isInteractive else @Suppress("DEPRECATION") pm.isScreenOn
        } catch (_: Exception) {
            false
        }
    }

    private fun recentForegroundPackage(context: Context): String? {
        if (!hasUsageAccess(context)) return null
        val usm = context.getSystemService(Context.USAGE_STATS_SERVICE) as? UsageStatsManager ?: return null
        val end = System.currentTimeMillis()
        val begin = end - USAGE_LOOKBACK_MS
        val events = usm.queryEvents(begin, end) ?: return null
        val event = UsageEvents.Event()
        var lastPkg: String? = null
        while (events.hasNextEvent()) {
            events.getNextEvent(event)
            val pkg = event.packageName ?: continue
            val resumed =
                Build.VERSION.SDK_INT >= 29 &&
                    event.eventType == UsageEvents.Event.ACTIVITY_RESUMED
            if (
                event.eventType == UsageEvents.Event.MOVE_TO_FOREGROUND ||
                resumed
            ) {
                lastPkg = pkg
            }
        }
        return lastPkg
    }

    private fun hasUsageAccess(context: Context): Boolean {
        return try {
            val appOps = context.getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
            val mode =
                if (Build.VERSION.SDK_INT >= 29) {
                    appOps.unsafeCheckOpNoThrow(
                        AppOpsManager.OPSTR_GET_USAGE_STATS,
                        Process.myUid(),
                        context.packageName
                    )
                } else {
                    @Suppress("DEPRECATION")
                    appOps.checkOpNoThrow(
                        AppOpsManager.OPSTR_GET_USAGE_STATS,
                        Process.myUid(),
                        context.packageName
                    )
                }
            mode == AppOpsManager.MODE_ALLOWED
        } catch (_: Exception) {
            false
        }
    }

    fun report(context: Context, source: String, packageName: String? = null) {
        val now = System.currentTimeMillis()
        val prev = lastPostAt.get()
        if (now - prev < MIN_POST_INTERVAL_MS) return
        if (!lastPostAt.compareAndSet(prev, now)) return

        val base = BuildConfig.API_BASE_URL.trimEnd('/')
        val token = LetteringPrefs.getAccessToken(context)?.trim().orEmpty()
        val userId = LetteringPrefs.getUserId(context)?.trim().orEmpty()
        if (base.isBlank() || token.isBlank()) {
            Log.w(TAG, "skip device-seen — missing api/token")
            return
        }
        val body =
            JSONObject()
                .put("source", source)
                .put("packageName", packageName ?: JSONObject.NULL)
        io.execute {
            var conn: HttpURLConnection? = null
            try {
                conn =
                    (URL("$base/api/family-protection/presence/device-seen").openConnection() as HttpURLConnection)
                        .apply {
                            requestMethod = "POST"
                            connectTimeout = 10_000
                            readTimeout = 10_000
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
                if (code !in 200..299) {
                    Log.w(TAG, "device-seen HTTP $code")
                }
            } catch (e: Exception) {
                Log.w(TAG, "device-seen failed", e)
            } finally {
                conn?.disconnect()
            }
        }
    }
}
