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

    fun overlayUrl(
        phone: String,
        verified: Boolean,
        outgoing: Boolean,
        dcpRoute: String = "",
        navigationNonce: Long = 0L,
        /** 인증 팝업 확인 후 MiniCase — 웹이 BigPush 바로 부팅되지 않게 */
        miniCase: Boolean = false
    ): String {
        val enc = java.net.URLEncoder.encode(phone, "UTF-8")
        val dir = if (outgoing) "outgoing" else "incoming"
        val ver = if (verified) "1" else "0"
        /* 웹 배포 해시가 바뀌어도 WebView 가 옛 번들을 붙잡지 않게 */
        val bust = BuildConfig.VERSION_CODE
        val route = dcpRoute.trim().lowercase()
        val dcp = if (route == "normal" || route == "abnormal") "&dcp_route=$route" else ""
        /* 번호가 바뀌면 해시만 바꿔 loadUrl 해도 hashchange 가 안 나 이전 번호가 남는다 */
        val nav = if (navigationNonce > 0L) "&_n=$navigationNonce" else ""
        val mini =
            if (miniCase) "&mini=1&phase=connected" else ""
        return appUrl(
            "lettering-overlay?incoming=$enc&platform=android&direction=$dir&verified=$ver&native=1&forceLettering=1&_ov=$bust$dcp$nav$mini"
        )
    }
}
