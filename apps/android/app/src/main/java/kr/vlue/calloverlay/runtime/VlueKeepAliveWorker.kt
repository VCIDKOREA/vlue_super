package kr.vlue.calloverlay.runtime

import android.content.Context
import android.util.Log
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import kr.vlue.calloverlay.LetteringCallMonitorService
import kr.vlue.calloverlay.LetteringIntegration
import kr.vlue.calloverlay.family.FamilyDeviceActivitySensor
import kr.vlue.calloverlay.push.VlueFcmRegistrar

/** 프로세스 종료 뒤에도 통화 모니터·화면 리시버·FCM 등록을 다시 대기시킨다. */
class VlueKeepAliveWorker(
    context: Context,
    params: WorkerParameters
) : CoroutineWorker(context, params) {
    override suspend fun doWork(): Result {
        return try {
            val app = applicationContext
            ColdProcessBootstrap.ensureReady(app)
            LetteringIntegration.ensureLetteringArmedIfReady(app)
            LetteringCallMonitorService.syncWithPrefs(app)
            FamilyDeviceActivitySensor.ensureStarted(app)
            VlueFcmRegistrar.syncTokenAsync(app, "workmanager")
            Result.success()
        } catch (t: Throwable) {
            Log.w(TAG, "keepalive failed", t)
            Result.success()
        }
    }

    companion object {
        private const val TAG = "VlueKeepAlive"
    }
}
