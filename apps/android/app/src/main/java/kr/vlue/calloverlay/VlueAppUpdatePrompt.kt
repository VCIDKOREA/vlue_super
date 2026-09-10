package kr.vlue.calloverlay

import android.app.Activity
import android.app.AlertDialog
import android.content.ActivityNotFoundException
import android.content.Intent
import android.net.Uri
import android.os.Handler
import android.os.Looper
import android.util.Log
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicBoolean

/**
 * 앱 실행 시 서버 최신 versionCode 와 비교 → 구버전이면 업데이트 팝업 → 스토어.
 * (푸시 알림과 무관)
 */
object VlueAppUpdatePrompt {
    private const val TAG = "VlueAppUpdate"
    private val io = Executors.newSingleThreadExecutor()
    private val dialogShowing = AtomicBoolean(false)
    private val checkInFlight = AtomicBoolean(false)

    const val EXTRA_FORCE_UPDATE = "vlue_force_update"
    const val EXTRA_UPDATE_TITLE = "vlue_update_title"
    const val EXTRA_UPDATE_BODY = "vlue_update_body"
    const val EXTRA_MIN_VERSION_CODE = "vlue_min_version_code"

    /** 푸시 extras 호환 — 무시해도 됨. 실제 안내는 [checkServerAndMaybeShow] */
    fun applyIntentExtras(intent: Intent?, activity: Activity) {
        /* no-op: 버전 안내는 서버 조회로만 */
    }

    fun markPending(context: android.content.Context, title: String, body: String, minVersionCode: Int = 0) {
        /* no-op — 레거시 푸시 경로 호환 */
    }

    fun markPendingFromData(
        context: android.content.Context,
        data: Map<String, String>,
        title: String,
        body: String
    ) {
        /* no-op */
    }

    fun isForceUpdatePayload(data: Map<String, String>): Boolean = false

    fun clear(context: android.content.Context) {
        /* no-op */
    }

    fun maybeShow(activity: Activity) {
        checkServerAndMaybeShow(activity)
    }

    fun checkServerAndMaybeShow(activity: Activity) {
        if (dialogShowing.get() || !checkInFlight.compareAndSet(false, true)) return
        io.execute {
            try {
                val base = BuildConfig.API_BASE_URL.trimEnd('/')
                val url = URL("$base/api/app/android-version")
                val conn =
                    (url.openConnection() as HttpURLConnection).apply {
                        connectTimeout = 8_000
                        readTimeout = 8_000
                        requestMethod = "GET"
                        setRequestProperty("Accept", "application/json")
                    }
                val code = conn.responseCode
                val stream = if (code in 200..299) conn.inputStream else conn.errorStream
                val text = stream?.bufferedReader()?.use { it.readText() }.orEmpty()
                conn.disconnect()
                if (code !in 200..299 || text.isBlank()) return@execute

                val json = JSONObject(text)
                val latest = json.optInt("latestVersionCode", 0)
                if (latest <= 0 || BuildConfig.VERSION_CODE >= latest) return@execute

                val message =
                    json.optString("message").trim().ifBlank {
                        "새로운 버전이 있습니다. 업데이트 하시겠습니까?"
                    }
                val versionName = json.optString("latestVersionName").trim()

                Handler(Looper.getMainLooper()).post {
                    showUpdateDialog(activity, message, versionName)
                }
            } catch (e: Exception) {
                Log.w(TAG, "android-version check failed", e)
            } finally {
                checkInFlight.set(false)
            }
        }
    }

    private fun showUpdateDialog(activity: Activity, message: String, latestVersionName: String) {
        if (activity.isFinishing) return
        if (!dialogShowing.compareAndSet(false, true)) return
        try {
            val title =
                if (latestVersionName.isNotBlank()) {
                    "VLUE 업데이트 ($latestVersionName)"
                } else {
                    "VLUE 업데이트"
                }
            AlertDialog.Builder(activity)
                .setTitle(title)
                .setMessage(message)
                .setCancelable(true)
                .setNegativeButton("닫기") { d, _ ->
                    d.dismiss()
                    dialogShowing.set(false)
                }
                .setPositiveButton("확인") { _, _ ->
                    openVlueStore(activity)
                    dialogShowing.set(false)
                }
                .setOnCancelListener {
                    dialogShowing.set(false)
                }
                .show()
        } catch (e: Exception) {
            dialogShowing.set(false)
            Log.w(TAG, "show update dialog failed", e)
        }
    }

    fun openVlueStore(activity: Activity) {
        val pkg = activity.packageName
        val candidates =
            listOf(
                Intent(Intent.ACTION_VIEW, Uri.parse("market://details?id=$pkg")),
                Intent(Intent.ACTION_VIEW, Uri.parse("samsungapps://ProductDetail/$pkg")),
                Intent(
                    Intent.ACTION_VIEW,
                    Uri.parse("https://apps.samsung.com/appquery/appDetail.as?appId=$pkg")
                ),
                Intent(
                    Intent.ACTION_VIEW,
                    Uri.parse("https://play.google.com/store/apps/details?id=$pkg")
                )
            )
        for (intent in candidates) {
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            try {
                activity.startActivity(intent)
                return
            } catch (_: ActivityNotFoundException) {
                /* try next */
            } catch (e: Exception) {
                Log.w(TAG, "open store candidate failed", e)
            }
        }
        Log.w(TAG, "no store activity for $pkg")
    }
}
