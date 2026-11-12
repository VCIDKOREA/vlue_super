package kr.vlue.calloverlay.safetypatch

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.location.Location
import android.location.LocationManager
import android.os.BatteryManager
import android.os.Build
import androidx.core.content.ContextCompat
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority
import com.google.android.gms.tasks.CancellationTokenSource
import kotlin.coroutines.resume
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withTimeoutOrNull
import org.json.JSONObject

/**
 * 안심패치 버튼을 누른 시점의 배터리·현재 GPS·무결성.
 * 저장된 배터리 값과 getLastKnownLocation 은 쓰지 않는다.
 */
object SafetyPatchLiveProbe {
    private const val LOCATION_TIMEOUT_MS = 10_000L

    suspend fun collect(context: Context): String {
        val app = context.applicationContext
        val battery = readBattery(app)
        val location = readCurrentLocation(app)
        val integrity = DeviceIntegrityProbe.inspect(app)
        return JSONObject().apply {
            if (battery.percent == null) put("batteryPct", JSONObject.NULL) else put("batteryPct", battery.percent)
            put("isCharging", battery.charging)
            if (location.lat == null) put("lat", JSONObject.NULL) else put("lat", location.lat)
            if (location.lng == null) put("lng", JSONObject.NULL) else put("lng", location.lng)
            if (location.accuracyM == null) put("accuracyM", JSONObject.NULL) else put("accuracyM", location.accuracyM)
            put("locationStatus", location.status)
            put("integrity", integrity.toJson())
            put("collectedAt", System.currentTimeMillis())
        }.toString()
    }

    internal fun readBattery(context: Context): BatteryRead {
        val manager = context.applicationContext.getSystemService(Context.BATTERY_SERVICE) as? BatteryManager
            ?: return BatteryRead(percent = null, charging = false)
        val capacity = manager.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY)
        val percent = capacity.takeIf { it in 0..100 }
        val charging = try {
            manager.isCharging
        } catch (_: Throwable) {
            false
        }
        return BatteryRead(percent, charging)
    }

    private suspend fun readCurrentLocation(context: Context): LocationRead {
        val app = context.applicationContext
        val fine = ContextCompat.checkSelfPermission(app, Manifest.permission.ACCESS_FINE_LOCATION) ==
            PackageManager.PERMISSION_GRANTED
        if (!fine) return LocationRead(status = "permission_denied")
        val lm = app.getSystemService(Context.LOCATION_SERVICE) as? LocationManager
            ?: return LocationRead(status = "gps_disabled")
        val masterOn = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            lm.isLocationEnabled
        } else {
            @Suppress("DEPRECATION")
            lm.isProviderEnabled(LocationManager.GPS_PROVIDER) ||
                lm.isProviderEnabled(LocationManager.NETWORK_PROVIDER)
        }
        val gpsOn = try {
            lm.isProviderEnabled(LocationManager.GPS_PROVIDER)
        } catch (_: Throwable) {
            false
        }
        if (!masterOn || !gpsOn) return LocationRead(status = "gps_disabled")
        val fix = try {
            withTimeoutOrNull(LOCATION_TIMEOUT_MS) { requestCurrent(app) }
        } catch (_: SecurityException) {
            return LocationRead(status = "permission_denied")
        } catch (_: Throwable) {
            return LocationRead(status = "location_unavailable")
        } ?: return LocationRead(status = "timeout")
        val point = fix.location ?: return LocationRead(status = "location_unavailable")
        return LocationRead(
            status = "ok",
            lat = point.latitude,
            lng = point.longitude,
            accuracyM = if (point.hasAccuracy()) point.accuracy.toDouble() else null
        )
    }

    private data class CurrentFix(val location: Location?)

    @Suppress("MissingPermission")
    private suspend fun requestCurrent(context: Context): CurrentFix {
        val client = LocationServices.getFusedLocationProviderClient(context)
        val tokenSource = CancellationTokenSource()
        val direct = java.util.concurrent.Executor { command -> command.run() }
        return try {
            suspendCancellableCoroutine { cont ->
                cont.invokeOnCancellation { tokenSource.cancel() }
                client.getCurrentLocation(Priority.PRIORITY_HIGH_ACCURACY, tokenSource.token)
                    .addOnSuccessListener(direct) { loc ->
                        if (cont.isActive) cont.resume(CurrentFix(loc))
                    }
                    .addOnFailureListener(direct) {
                        if (cont.isActive) cont.resume(CurrentFix(null))
                    }
            }
        } finally {
            tokenSource.cancel()
        }
    }

    internal data class BatteryRead(val percent: Int?, val charging: Boolean)

    internal data class LocationRead(
        val status: String,
        val lat: Double? = null,
        val lng: Double? = null,
        val accuracyM: Double? = null
    )
}
