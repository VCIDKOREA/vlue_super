package kr.vlue.calloverlay.family

/**
 * Play 정책: QUERY_ALL_PACKAGES 없이 조회 가능한 원격제어 앱 packageId 목록.
 * `<queries>` 선언과 동기화한다.
 */
object FamilyRemoteAppPackages {
    /** Manifest `<queries>` / 스캐너 공통 */
    val KNOWN_PACKAGES: List<String> = listOf(
        "com.teamviewer.teamviewer.market.mobile",
        "com.teamviewer.quicksupport.market",
        "com.teamviewer.host.market",
        "com.anydesk.anydeskandroid",
        "com.anydesk.adcontrol.ad1",
        "com.carriez.flutter_hbb",
        "com.google.chromeremotedesktop",
        "com.splashtop.remote.pad.v2",
        "com.splashtop.streamer.csrs",
        "com.ultraviewer",
        "eu.sisik.hackendx.supremo",
        "com.LogMeIn.Ignition",
        "com.parsec.app",
        "com.sand.airdroid",
        "com.microsoft.rdc.androidx",
        "com.microsoft.rdc.android"
    )

    private val PACKAGE_PATTERNS = listOf(
        "teamviewer",
        "anydesk",
        "rustdesk",
        "chromeremotedesktop",
        "splashtop",
        "ultraviewer",
        "supremo",
        "ammyy",
        "logmein",
        "parsec",
        "airdroid",
        "microsoft.remote",
        "msrdc",
        "rdc.android"
    )

    fun matchesRemotePattern(packageName: String): Boolean {
        val name = packageName.lowercase()
        return PACKAGE_PATTERNS.any { name.contains(it) }
    }
}
