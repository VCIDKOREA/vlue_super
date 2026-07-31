package kr.vlue.calloverlay

import android.app.Notification
import android.app.Service
import android.content.pm.ServiceInfo
import android.os.Build
import android.util.Log
import androidx.core.app.ServiceCompat

/**
 * targetSdk 34+ FGS 기동.
 * phoneCall 타입은 기본 전화앱/자체 ConnectionService 가 아니면 OEM 에서 SecurityException 이 난다.
 * specialUse|dataSync 로 레터링 오버레이·통화 모니터를 기동한다.
 */
object VlueForegroundHelper {
    private const val TAG = "VlueForeground"

    fun start(
        service: Service,
        notificationId: Int,
        notification: Notification
    ) {
        val type = preferredType()
        try {
            ServiceCompat.startForeground(service, notificationId, notification, type)
            return
        } catch (e: Exception) {
            Log.e(TAG, "startForeground type=$type failed, fallback dataSync", e)
        }
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                ServiceCompat.startForeground(
                    service,
                    notificationId,
                    notification,
                    ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC
                )
                return
            }
        } catch (e: Exception) {
            Log.e(TAG, "startForeground dataSync failed, legacy", e)
        }
        @Suppress("DEPRECATION")
        service.startForeground(notificationId, notification)
    }

    fun preferredType(): Int {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) return 0
        var type = ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            type = type or ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE
        }
        return type
    }
}
