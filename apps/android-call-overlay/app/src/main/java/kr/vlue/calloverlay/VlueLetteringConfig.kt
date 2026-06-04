package kr.vlue.calloverlay

/**
 * 빌드 타임 URL — gradle.properties / local.properties
 * @see apps/android-call-overlay/gradle.properties
 */
object VlueLetteringConfig {
    val apiBaseUrl: String
        get() = BuildConfig.API_BASE_URL.trimEnd('/')

    val webBaseUrl: String
        get() = BuildConfig.WEB_BASE_URL.trimEnd('/')

    fun overlayUrl(phone: String, verified: Boolean, outgoing: Boolean): String {
        val enc = java.net.URLEncoder.encode(phone, "UTF-8")
        val dir = if (outgoing) "outgoing" else "incoming"
        val ver = if (verified) "1" else "0"
        return "$webBaseUrl/#lettering-overlay?incoming=$enc&platform=android&direction=$dir&verified=$ver&native=1"
    }
}
