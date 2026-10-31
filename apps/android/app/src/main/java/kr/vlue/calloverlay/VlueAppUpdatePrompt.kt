package kr.vlue.calloverlay

import android.app.Activity
import android.content.Intent
import android.os.Handler
import android.os.Looper
import android.util.Log
import kr.vlue.calloverlay.update.AppUpdateDecision
import kr.vlue.calloverlay.update.AppUpdateDialog
import kr.vlue.calloverlay.update.AppUpdateKind
import kr.vlue.calloverlay.update.AppUpdateStoreLinks
import kr.vlue.calloverlay.update.AppVersionInfo
import kr.vlue.calloverlay.update.AppVersionPolicy
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicBoolean

/**
 * 앱 실행 시 서버 최신 버전과 비교 → 강제/선택 업데이트 팝업 → 스토어.
 *
 * 로직: [AppVersionPolicy] · UI: [AppUpdateDialog] · 스토어: [AppUpdateStoreLinks]
 */
object VlueAppUpdatePrompt {
    private const val TAG = "VlueAppUpdate"
    private val io = Executors.newSingleThreadExecutor()
    private val dialogShowing = AtomicBoolean(false)
    private val checkInFlight = AtomicBoolean(false)
    /** 자동 체크는 프로세스당 1회 (페이지 이동마다 반복 방지) */
    private val autoCheckDone = AtomicBoolean(false)
    /** 선택 업데이트 "다음에 하기" 후 같은 세션에서 재표시 안 함 */
    private val optionalSkippedThisSession = AtomicBoolean(false)
    /** 강제 업데이트 진행 중 — 스토어 복귀 시 onStart에서 재검사 */
    private val forceUpdateActive = AtomicBoolean(false)

    const val EXTRA_FORCE_UPDATE = "vlue_force_update"
    const val EXTRA_UPDATE_TITLE = "vlue_update_title"
    const val EXTRA_UPDATE_BODY = "vlue_update_body"
    const val EXTRA_MIN_VERSION_CODE = "vlue_min_version_code"

    /** 푸시 extras 호환 — 실제 안내는 서버 조회 */
    fun applyIntentExtras(intent: Intent?, activity: Activity) {
        /* no-op */
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
        optionalSkippedThisSession.set(false)
        autoCheckDone.set(false)
        forceUpdateActive.set(false)
    }

    /** 앱 시작·페이지 로드 — 프로세스당 1회. 강제 업데이트 중이면 매번 재검사 */
    fun maybeShow(activity: Activity) {
        if (forceUpdateActive.get()) {
            checkServerAndMaybeShow(activity)
            return
        }
        if (!autoCheckDone.compareAndSet(false, true)) return
        checkServerAndMaybeShow(activity)
    }

    /** JS 브릿지·수동 재검사 — 항상 서버 조회 */
    fun checkServerAndMaybeShow(activity: Activity) {
        if (dialogShowing.get() || !checkInFlight.compareAndSet(false, true)) return
        io.execute {
            try {
                val remote = fetchRemoteVersion() ?: return@execute
                val decision =
                    AppVersionPolicy.decide(
                        currentVersionCode = BuildConfig.VERSION_CODE,
                        currentVersionName = BuildConfig.VERSION_NAME,
                        remote = remote
                    )
                if (decision.kind == AppUpdateKind.NONE) {
                    forceUpdateActive.set(false)
                    return@execute
                }
                if (decision.kind == AppUpdateKind.OPTIONAL && optionalSkippedThisSession.get()) {
                    return@execute
                }
                Handler(Looper.getMainLooper()).post {
                    showDecision(activity, decision, remote)
                }
            } catch (e: Exception) {
                Log.w(TAG, "android-version check failed", e)
            } finally {
                checkInFlight.set(false)
            }
        }
    }

    private fun fetchRemoteVersion(): AppVersionInfo? {
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
        if (code !in 200..299 || text.isBlank()) return null
        return AppVersionInfo.fromJson(JSONObject(text))
    }

    private fun showDecision(
        activity: Activity,
        decision: AppUpdateDecision,
        remote: AppVersionInfo
    ) {
        if (activity.isFinishing) return
        if (!dialogShowing.compareAndSet(false, true)) return
        if (decision.kind == AppUpdateKind.FORCED) {
            forceUpdateActive.set(true)
        }
        AppUpdateDialog.show(
            activity = activity,
            decision = decision,
            remote = remote,
            onClosed = { _ ->
                dialogShowing.set(false)
                if (decision.kind == AppUpdateKind.OPTIONAL) {
                    optionalSkippedThisSession.set(true)
                }
                /* 강제는 forceUpdateActive 유지 → onStart/maybeShow 에서 재표시 */
            }
        )
    }

    fun openVlueStore(activity: Activity) {
        AppUpdateStoreLinks.openStore(activity, null)
    }
}
