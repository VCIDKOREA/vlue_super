package kr.vlue.calloverlay.runtime

import android.content.Context
import android.util.Log
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import java.util.concurrent.TimeUnit

/** 주기 작업은 앱 종료·업데이트 후에도 기존 예약을 유지한다. */
object VlueBackgroundWork {
    private const val TAG = "VlueBackgroundWork"
    const val UNIQUE_KEEPALIVE = "vlue_background_keepalive"

    fun ensureScheduled(context: Context?) {
        val app = context?.applicationContext ?: return
        try {
            val request = PeriodicWorkRequestBuilder<VlueKeepAliveWorker>(12, TimeUnit.HOURS)
                .build()
            WorkManager.getInstance(app).enqueueUniquePeriodicWork(
                UNIQUE_KEEPALIVE,
                ExistingPeriodicWorkPolicy.KEEP,
                request
            )
        } catch (t: Throwable) {
            Log.w(TAG, "schedule skipped", t)
        }
    }
}
