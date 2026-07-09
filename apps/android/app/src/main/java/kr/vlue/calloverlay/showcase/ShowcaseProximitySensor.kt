package kr.vlue.calloverlay.showcase

import android.content.Context
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.util.Log
import android.webkit.WebView
import java.lang.ref.WeakReference

/**
 * 통화 중 근접 센서 — 귀에 대면 쇼케이스 sleep, 떼면 복구
 * Web: window.VlueShowcaseBridge.onProximityNear / onProximityFar
 */
object ShowcaseProximitySensor : SensorEventListener {
    private const val TAG = "ShowcaseProximity"
    private var sensorManager: SensorManager? = null
    private var proximity: Sensor? = null
    private var webViewRef: WeakReference<WebView>? = null
    private var lastNear = false

    fun attach(context: Context, webView: WebView) {
        webViewRef = WeakReference(webView)
        sensorManager = context.getSystemService(Context.SENSOR_SERVICE) as? SensorManager
        proximity = sensorManager?.getDefaultSensor(Sensor.TYPE_PROXIMITY)
        proximity?.let {
            sensorManager?.registerListener(this, it, SensorManager.SENSOR_DELAY_NORMAL)
            Log.d(TAG, "proximity sensor registered")
        } ?: Log.w(TAG, "no proximity sensor")
    }

    fun detach() {
        sensorManager?.unregisterListener(this)
        sensorManager = null
        proximity = null
        webViewRef = null
        lastNear = false
    }

    override fun onSensorChanged(event: SensorEvent?) {
        if (event?.sensor?.type != Sensor.TYPE_PROXIMITY) return
        val near = event.values[0] < (event.sensor.maximumRange.coerceAtMost(5f))
        if (near == lastNear) return
        lastNear = near
        val wv = webViewRef?.get() ?: return
        val js = if (near) {
            "window.VlueShowcaseBridge&&window.VlueShowcaseBridge.onProximityNear&&window.VlueShowcaseBridge.onProximityNear();"
        } else {
            "window.VlueShowcaseBridge&&window.VlueShowcaseBridge.onProximityFar&&window.VlueShowcaseBridge.onProximityFar();"
        }
        wv.post { wv.evaluateJavascript(js, null) }
    }

    override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) = Unit
}
