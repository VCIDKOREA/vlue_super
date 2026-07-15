package kr.vlue.calloverlay

/**
 * 빌드 타임 URL — gradle.properties / local.properties
 * 슈퍼앱 셸은 마케팅 루트(/)가 아니라 /app 이다.
 */
object VlueLetteringConfig {
    /** 웹 User-Agent 토큰 — siteMode / vlueClientAccess 가 네이티브 셸로 인식 */
    const val ANDROID_APP_UA_TOKEN = "VLUE-Android-App"

    val apiBaseUrl: String
        get() = BuildConfig.API_BASE_URL.trimEnd('/')

    val webBaseUrl: String
        get() = BuildConfig.WEB_BASE_URL.trimEnd('/')

    /** 메인 WebView 시작 URL — VLUE 슈퍼앱 셸 */
    val appShellUrl: String
        get() = "$webBaseUrl/app"

    /**
     * @param hash 예: "mypage?x=1" 또는 "#lettering-overlay?…"
     */
    fun appUrl(hash: String = ""): String {
        val raw = hash.trim()
        if (raw.isEmpty()) return appShellUrl
        val withHash = if (raw.startsWith("#")) raw else "#$raw"
        return "$appShellUrl$withHash"
    }

    fun overlayUrl(phone: String, verified: Boolean, outgoing: Boolean): String {
        val enc = java.net.URLEncoder.encode(phone, "UTF-8")
        val dir = if (outgoing) "outgoing" else "incoming"
        val ver = if (verified) "1" else "0"
        return appUrl("lettering-overlay?incoming=$enc&platform=android&direction=$dir&verified=$ver&native=1")
    }
}
