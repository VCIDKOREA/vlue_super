package kr.vlue.calloverlay

import android.app.Application
import android.util.Log

/** VLUE 메인 Application — 레터링 백그라운드 모듈 부트스트랩 */
class VlueCallOverlayApp : Application() {
    override fun onCreate() {
        super.onCreate()
        instance = this
        try {
            LetteringIntegration.onApplicationCreate(this)
        } catch (e: Exception) {
            Log.e("VlueLettering", "Application bootstrap failed", e)
        }
    }

    companion object {
        @Volatile
        var instance: Application? = null
            private set
    }
}
