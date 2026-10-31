package kr.vlue.calloverlay.update

import android.app.Activity
import android.content.ActivityNotFoundException
import android.content.Intent
import android.net.Uri
import android.util.Log

/**
 * Android → Play/Galaxy, iOS(향후) → App Store 상세 페이지로 이동.
 * 패키지(부모/키즈)는 현재 앱의 applicationId 를 우선한다.
 */
object AppUpdateStoreLinks {
    private const val TAG = "VlueAppUpdate"

    fun openStore(activity: Activity, remote: AppVersionInfo? = null) {
        val pkg = activity.packageName
        val candidates = mutableListOf<Intent>()

        /* 현재 패키지 기준 스토어 링크를 최우선 */
        candidates +=
            listOf(
                viewIntent("market://details?id=$pkg"),
                viewIntent("samsungapps://ProductDetail/$pkg"),
                viewIntent("https://apps.samsung.com/appquery/appDetail.as?appId=$pkg"),
                viewIntent("https://play.google.com/store/apps/details?id=$pkg")
            )

        /* 서버 URL은 현재 패키지를 가리킬 때만 보조로 사용 */
        fun addIfMatchesPackage(url: String?) {
            val u = url?.trim().orEmpty()
            if (u.isBlank()) return
            if (!u.contains(pkg)) return
            candidates += viewIntent(u)
        }
        addIfMatchesPackage(remote?.marketUrl)
        addIfMatchesPackage(remote?.playStoreUrl)
        remote?.appStoreUrl?.trim()?.takeIf { it.isNotBlank() }?.let { candidates += viewIntent(it) }

        val tried = linkedSetOf<String>()
        for (intent in candidates) {
            val key = intent.dataString ?: continue
            if (!tried.add(key)) continue
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

    private fun viewIntent(uri: String): Intent =
        Intent(Intent.ACTION_VIEW, Uri.parse(uri))
}
