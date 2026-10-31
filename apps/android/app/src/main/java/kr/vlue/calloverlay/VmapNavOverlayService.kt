package kr.vlue.calloverlay

import android.Manifest
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.content.pm.ServiceInfo
import android.location.Location
import android.location.LocationListener
import android.location.LocationManager
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.os.PowerManager
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import org.json.JSONObject
import kotlin.math.asin
import kotlin.math.cos
import kotlin.math.roundToInt
import kotlin.math.sin
import kotlin.math.sqrt

/**
 * V-MAP 길안내가 홈·다른 앱 위에서도 남도록 프로세스를 붙잡고
 * 시스템 오버레이(회전 화살표 · 남은 거리 · 안내)를 다시 붙인다.
 */
class VmapNavOverlayService : Service() {
    private val handler = Handler(Looper.getMainLooper())
    private var wakeLock: PowerManager.WakeLock? = null
    private var listening = false
    private var locationManager: LocationManager? = null
    private val locationListener = object : LocationListener {
        override fun onLocationChanged(location: Location) {
            onLocation(location)
        }

        @Deprecated("Deprecated in Java")
        override fun onStatusChanged(provider: String?, status: Int, extras: android.os.Bundle?) {
        }

        override fun onProviderEnabled(provider: String) {}

        override fun onProviderDisabled(provider: String) {}
    }
    private val watch = object : Runnable {
        override fun run() {
            if (VmapMiniOverlay.backgroundHold && !VmapMiniOverlay.isAttached()) {
                VmapMiniOverlay.show(this@VmapNavOverlayService, VmapMiniOverlay.lastPayloadJson)
            }
            if (running) handler.postDelayed(this, 2000L)
        }
    }
    override fun onCreate() {
        super.onCreate()
        running = true
        ensureChannel()
        startAsForeground()
        acquireWake()
        handler.post(watch)
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (!running) {
            running = true
            startAsForeground()
            acquireWake()
        }
        when (intent?.action) {
            ACTION_HOLD -> {
                sessionLive = true
                VmapMiniOverlay.backgroundHold = true
                val extra = intent.getStringExtra(EXTRA_JSON)
                val json = extra?.takeIf { it.isNotBlank() } ?: VmapMiniOverlay.lastPayloadJson
                VmapMiniOverlay.show(this, json)
                startLocation()
            }
            ACTION_RELEASE -> {
                VmapMiniOverlay.backgroundHold = false
                stopLocation()
            }
            ACTION_STOP -> {
                sessionLive = false
                VmapMiniOverlay.backgroundHold = false
                stopLocation()
                VmapMiniOverlay.forceHide(this)
                releaseWake()
                stopForeground(STOP_FOREGROUND_REMOVE)
                stopSelf()
            }
            else -> sessionLive = true
        }
        return START_STICKY
    }

    override fun onDestroy() {
        running = false
        handler.removeCallbacks(watch)
        stopLocation()
        releaseWake()
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    private fun onLocation(location: Location) {
        val lat = location.latitude
        val lng = location.longitude
        if (!lat.isFinite() || !lng.isFinite()) return
        val prevLat = VmapMiniOverlay.lastLat
        val prevLng = VmapMiniOverlay.lastLng
        if (location.hasSpeed() && location.speed >= 0f) {
            lastSpeedKmh = (location.speed * 3.6).roundToInt().coerceIn(0, 240)
        }
        val obj = try {
            JSONObject(VmapMiniOverlay.lastPayloadJson.ifBlank { "{}" })
        } catch (_: Exception) {
            JSONObject()
        }
        val cueRemain = obj.has("remainM") && !obj.isNull("remainM")
        var remain = if (cueRemain) VmapMiniOverlay.lastRemainM else null
        if (cueRemain && prevLat != null && prevLng != null && remain != null) {
            val moved = haversine(prevLat, prevLng, lat, lng)
            if (moved in 0.5..600.0) {
                remain = (remain - moved).coerceAtLeast(0.0)
            }
        }
        obj.put("lat", lat)
        obj.put("lng", lng)
        obj.remove("heading")
        if (obj.optString("glyph").isBlank()) obj.put("glyph", "↑")
        if (cueRemain && remain != null) {
            obj.put("remainM", remain)
            obj.put("remain", formatMeters(remain))
        }
        if (!obj.has("instruction") || obj.optString("instruction").isBlank()) {
            obj.put("instruction", "경로 안내")
        }
        VmapMiniOverlay.update(this, obj.toString())
    }

    private fun startLocation() {
        if (listening) return
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED &&
            ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_COARSE_LOCATION) != PackageManager.PERMISSION_GRANTED
        ) {
            return
        }
        val lm = getSystemService(LOCATION_SERVICE) as? LocationManager ?: return
        locationManager = lm
        try {
            if (lm.isProviderEnabled(LocationManager.GPS_PROVIDER)) {
                lm.requestLocationUpdates(LocationManager.GPS_PROVIDER, 1000L, 1f, locationListener, Looper.getMainLooper())
            }
            if (lm.isProviderEnabled(LocationManager.NETWORK_PROVIDER)) {
                lm.requestLocationUpdates(LocationManager.NETWORK_PROVIDER, 3000L, 8f, locationListener, Looper.getMainLooper())
            }
            listening = true
        } catch (_: SecurityException) {
            listening = false
        }
    }

    private fun stopLocation() {
        if (!listening) return
        try {
            locationManager?.removeUpdates(locationListener)
        } catch (_: Exception) {
        }
        listening = false
    }

    private fun acquireWake() {
        if (wakeLock?.isHeld == true) return
        val pm = getSystemService(POWER_SERVICE) as PowerManager
        wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "vlue:vmap-nav").apply {
            setReferenceCounted(false)
            acquire(3 * 60 * 60 * 1000L)
        }
    }

    private fun releaseWake() {
        try {
            if (wakeLock?.isHeld == true) wakeLock?.release()
        } catch (_: Exception) {
        }
        wakeLock = null
    }

    private fun ensureChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val nm = getSystemService(NOTIFICATION_SERVICE) as NotificationManager
        val ch = NotificationChannel(CHANNEL_ID, "V-MAP 길안내", NotificationManager.IMPORTANCE_LOW)
        nm.createNotificationChannel(ch)
    }

    private fun startAsForeground() {
        val notification = buildNotification()
        val hasLocation = ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
        try {
            if (Build.VERSION.SDK_INT >= 34) {
                var type = ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC
                if (hasLocation) type = type or ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION
                startForeground(NOTIF_ID, notification, type)
            } else if (Build.VERSION.SDK_INT >= 29) {
                val type = if (hasLocation) {
                    ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION
                } else {
                    ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC
                }
                startForeground(NOTIF_ID, notification, type)
            } else {
                startForeground(NOTIF_ID, notification)
            }
        } catch (_: Exception) {
            try {
                startForeground(NOTIF_ID, notification)
            } catch (_: Exception) {
            }
        }
    }

    private fun buildNotification(): Notification {
        val open = PendingIntent.getActivity(
            this,
            71,
            Intent(this, MainActivity::class.java).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_REORDER_TO_FRONT or Intent.FLAG_ACTIVITY_SINGLE_TOP)
                putExtra("vlue_restore_vmap", true)
            },
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle("V-MAP 길안내")
            .setContentText(VmapMiniOverlay.statusLine.ifBlank { "다른 앱 위에서도 안내를 유지합니다." })
            .setContentIntent(open)
            .setOngoing(true)
            .build()
    }

    companion object {
        private const val CHANNEL_ID = "vlue_vmap_nav_overlay"
        private const val NOTIF_ID = 4107
        private const val ACTION_HOLD = "kr.vlue.vmap.OVERLAY_HOLD"
        private const val ACTION_RELEASE = "kr.vlue.vmap.OVERLAY_RELEASE"
        private const val ACTION_STOP = "kr.vlue.vmap.OVERLAY_STOP"
        private const val EXTRA_JSON = "payload"

        @Volatile
        var sessionLive: Boolean = false

        @Volatile
        var running: Boolean = false

        /** 네이티브 GPS 속도(km/h). 없으면 -1. 웹 속도계가 m/s 공백일 때 읽는다. */
        @Volatile
        var lastSpeedKmh: Int = -1

        fun start(context: Context) {
            sessionLive = true
            val intent = Intent(context, VmapNavOverlayService::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                ContextCompat.startForegroundService(context, intent)
            } else {
                context.startService(intent)
            }
        }

        fun hold(context: Context) {
            sessionLive = true
            VmapMiniOverlay.backgroundHold = true
            val intent = Intent(context, VmapNavOverlayService::class.java).apply {
                action = ACTION_HOLD
                putExtra(EXTRA_JSON, VmapMiniOverlay.lastPayloadJson)
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                ContextCompat.startForegroundService(context, intent)
            } else {
                context.startService(intent)
            }
        }

        fun release(context: Context) {
            VmapMiniOverlay.backgroundHold = false
            if (!running) return
            context.startService(
                Intent(context, VmapNavOverlayService::class.java).apply { action = ACTION_RELEASE }
            )
        }

        fun stop(context: Context) {
            sessionLive = false
            if (!running) {
                VmapMiniOverlay.forceHide(context)
                return
            }
            context.startService(
                Intent(context, VmapNavOverlayService::class.java).apply { action = ACTION_STOP }
            )
        }
    }
}

private fun haversine(lat1: Double, lng1: Double, lat2: Double, lng2: Double): Double {
    val r = 6371000.0
    val dLat = Math.toRadians(lat2 - lat1)
    val dLng = Math.toRadians(lng2 - lng1)
    val a = sin(dLat / 2) * sin(dLat / 2) +
        cos(Math.toRadians(lat1)) * cos(Math.toRadians(lat2)) * sin(dLng / 2) * sin(dLng / 2)
    return 2 * r * asin(sqrt(a))
}

private fun formatMeters(meters: Double): String {
    if (meters >= 1000.0) return String.format("%.1fkm", meters / 1000.0)
    return "${meters.roundToInt()}m"
}
