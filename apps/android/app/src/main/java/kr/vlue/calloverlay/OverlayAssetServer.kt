package kr.vlue.calloverlay

import android.content.Context
import android.util.Log
import android.webkit.MimeTypeMap
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse

/**
 * 통화 오버레이 WebView 용 로컬 번들 서버 (Zero-Fail Asset Bundling).
 *
 * `https://<web>/vlue-overlay/` 하위 요청을 네트워크 대신 APK `assets/vlue-overlay/` 하위 파일에서 즉시 내려준다.
 * - 서버(Railway)가 404/5xx/오프라인이어도 오버레이 HTML·JS·CSS 는 100% 로컬에서 로드된다.
 * - 오리진을 `https://<web>` 로 유지하므로 localStorage(토큰)·API CORS 는 메인 앱과 동일하게 동작한다.
 *   (file:// 는 `type=module` 스크립트·fetch CORS·localStorage 공유가 모두 막힘)
 * - 서버와는 카드/조회 JSON 을 백그라운드(비동기)로만 주고받는다. 실패해도 UI 는 이미 그려져 있다.
 *
 * 웹 번들 빌드: `npm run build:overlay --workspace @vlue/web` → assets/vlue-overlay 로 출력.
 */
object OverlayAssetServer {
    private const val TAG = "OverlayAssetServer"

    /** assets 하위 폴더 / URL 경로 프리픽스 (vite.overlay.config.js 의 base 와 동일) */
    private const val ASSET_DIR = "vlue-overlay"
    private const val URL_PREFIX = "/$ASSET_DIR/"
    const val ENTRY_FILE = "overlay.html"

    @Volatile
    private var entryAvailable: Boolean? = null

    /** 번들된 오버레이 엔트리가 APK 에 들어 있는가 (없으면 기존 /app 원격 경로로 폴백) */
    fun isBundled(context: Context): Boolean {
        entryAvailable?.let { return it }
        val ok = try {
            context.applicationContext.assets.open("$ASSET_DIR/$ENTRY_FILE").use { true }
        } catch (_: Exception) {
            false
        }
        entryAvailable = ok
        if (!ok) Log.w(TAG, "assets/$ASSET_DIR/$ENTRY_FILE 없음 — 원격 /app 오버레이로 폴백")
        return ok
    }

    /** 서비스 onCreate 에서 1회 호출 — 이후 [useBundle] 이 즉시 판정 가능 */
    fun init(context: Context) {
        isBundled(context)
    }

    /** 오버레이 URL 을 번들 경로로 만들지 여부 (init 전이면 false → 원격 폴백) */
    fun useBundle(): Boolean = entryAvailable == true

    /** 번들 URL (해시 포함) — 오리진은 웹 베이스와 동일 */
    fun bundledUrl(hash: String): String {
        val withHash = if (hash.startsWith("#")) hash else "#$hash"
        return "${VlueLetteringConfig.webBaseUrl}$URL_PREFIX$ENTRY_FILE$withHash"
    }

    /**
     * WebViewClient.shouldInterceptRequest 에서 호출. 번들 대상이 아니면 null (→ 정상 네트워크).
     * 번들 경로인데 파일이 없으면 404 를 즉시 돌려줘 서버 왕복/지연을 없앤다.
     */
    fun intercept(context: Context, request: WebResourceRequest?): WebResourceResponse? {
        val uri = request?.url ?: return null
        val path = uri.path ?: return null
        if (!path.startsWith(URL_PREFIX)) return null
        val webHost = try {
            android.net.Uri.parse(VlueLetteringConfig.webBaseUrl).host
        } catch (_: Exception) {
            null
        }
        if (webHost != null && !uri.host.equals(webHost, ignoreCase = true)) return null

        val rel = path.removePrefix(URL_PREFIX).ifEmpty { ENTRY_FILE }
        if (rel.contains("..")) return notFound()
        return try {
            val stream = context.applicationContext.assets.open("$ASSET_DIR/$rel")
            if (rel == ENTRY_FILE) Log.i(TAG, "overlay entry served from APK assets (server-independent)")
            val ext = MimeTypeMap.getFileExtensionFromUrl(rel).lowercase()
            WebResourceResponse(
                mimeOf(ext),
                if (isText(ext)) "utf-8" else null,
                200,
                "OK",
                mapOf(
                    "Cache-Control" to "no-store",
                    "Access-Control-Allow-Origin" to "*"
                ),
                stream
            )
        } catch (e: Exception) {
            Log.w(TAG, "asset miss: $rel (${e.message})")
            notFound()
        }
    }

    private fun notFound(): WebResourceResponse =
        WebResourceResponse(
            "text/plain",
            "utf-8",
            404,
            "Not Found",
            mapOf("Cache-Control" to "no-store"),
            java.io.ByteArrayInputStream(ByteArray(0))
        )

    private fun isText(ext: String): Boolean =
        ext in setOf("html", "js", "mjs", "css", "json", "svg", "txt", "map")

    private fun mimeOf(ext: String): String =
        when (ext) {
            "html" -> "text/html"
            "js", "mjs" -> "text/javascript"
            "css" -> "text/css"
            "json", "map" -> "application/json"
            "svg" -> "image/svg+xml"
            "woff2" -> "font/woff2"
            "woff" -> "font/woff"
            "ttf" -> "font/ttf"
            "otf" -> "font/otf"
            "webp" -> "image/webp"
            else -> MimeTypeMap.getSingleton().getMimeTypeFromExtension(ext) ?: "application/octet-stream"
        }
}
