package kr.vlue.calloverlay.family

import android.content.Context
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.os.Build
import org.json.JSONArray
import org.json.JSONObject

/**
 * DCC 위치·보안 인증용 — Wi‑Fi/셀룰러/VPN + 원격제어 앱 설치 여부를 동기 JSON으로 반환.
 */
object DccSecuritySnapshot {
    fun collect(context: Context): String {
        val cm = context.getSystemService(Context.CONNECTIVITY_SERVICE) as? ConnectivityManager
        var wifi = false
        var cellular = false
        var vpn = false
        var ethernet = false

        if (cm != null) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                val networks = cm.allNetworks
                for (network in networks) {
                    val caps = cm.getNetworkCapabilities(network) ?: continue
                    if (caps.hasTransport(NetworkCapabilities.TRANSPORT_VPN)) vpn = true
                    if (caps.hasTransport(NetworkCapabilities.TRANSPORT_WIFI)) wifi = true
                    if (caps.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR)) cellular = true
                    if (caps.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET)) ethernet = true
                }
                val active = cm.activeNetwork
                val activeCaps = active?.let { cm.getNetworkCapabilities(it) }
                if (activeCaps != null) {
                    if (activeCaps.hasTransport(NetworkCapabilities.TRANSPORT_VPN)) vpn = true
                    // 활성 회선 기준으로 networkType 판정 (VPN 터널만 있으면 아래 분기)
                    when {
                        activeCaps.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) -> wifi = true
                        activeCaps.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR) -> cellular = true
                        activeCaps.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET) -> ethernet = true
                    }
                }
            } else {
                @Suppress("DEPRECATION")
                when (cm.activeNetworkInfo?.type) {
                    ConnectivityManager.TYPE_WIFI -> wifi = true
                    ConnectivityManager.TYPE_MOBILE -> cellular = true
                    ConnectivityManager.TYPE_ETHERNET -> ethernet = true
                    ConnectivityManager.TYPE_VPN -> vpn = true
                }
            }
        }

        val networkType = when {
            wifi -> "wifi"
            ethernet -> "ethernet"
            cellular -> "cellular"
            else -> "unknown"
        }

        val remotePkgs = try {
            FamilyRemoteAppScanner.scanInstalled(context)
        } catch (_: Exception) {
            emptyList()
        }

        return JSONObject()
            .put("networkType", networkType)
            .put("vpnActive", vpn)
            .put("wifi", wifi)
            .put("cellular", cellular)
            .put("remotePackages", JSONArray(remotePkgs))
            .put("source", "android_native")
            .toString()
    }
}
