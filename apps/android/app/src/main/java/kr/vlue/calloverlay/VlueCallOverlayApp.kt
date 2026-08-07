package kr.vlue.calloverlay

import android.app.Activity
import android.app.Application
import android.os.Bundle
import android.util.Log

/** VLUE 메인 Application — 레터링 백그라운드 모듈 부트스트랩 */
class VlueCallOverlayApp : Application() {
    override fun onCreate() {
        super.onCreate()
        instance = this
        registerActivityLifecycleCallbacks(object : ActivityLifecycleCallbacks {
            override fun onActivityResumed(activity: Activity) {
                setCurrentActivity(activity.javaClass.name)
            }

            override fun onActivityPaused(activity: Activity) {
                if (currentActivityName == activity.javaClass.name) {
                    setCurrentActivity("${activity.javaClass.name}(paused)")
                }
            }

            override fun onActivityCreated(activity: Activity, savedInstanceState: Bundle?) {}
            override fun onActivityStarted(activity: Activity) {}
            override fun onActivityStopped(activity: Activity) {}
            override fun onActivitySaveInstanceState(activity: Activity, outState: Bundle) {}
            override fun onActivityDestroyed(activity: Activity) {
                if (currentActivityName?.startsWith(activity.javaClass.name) == true) {
                    setCurrentActivity(null)
                }
            }
        })
        try {
            System.loadLibrary("sqlcipher")
        } catch (e: Exception) {
            Log.w("VlueApp", "sqlcipher load skipped", e)
        }
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

        @Volatile
        var currentActivityName: String? = null
            private set

        fun setCurrentActivity(name: String?) {
            currentActivityName = name
        }
    }
}
