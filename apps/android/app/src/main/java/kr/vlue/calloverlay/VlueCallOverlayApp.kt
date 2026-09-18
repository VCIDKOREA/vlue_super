package kr.vlue.calloverlay

import android.app.Activity
import android.app.Application
import android.os.Bundle
import android.util.Log
import com.google.android.gms.ads.MobileAds
import com.google.android.gms.ads.initialization.InitializationStatus
import java.util.concurrent.atomic.AtomicBoolean

/** VLUÉ 메인 Application — 레터링 백그라운드 + AdMob 초기화 */
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
                CallOverlayService.notifyForegroundContextChanged("onActivityPaused")
            }

            override fun onActivityCreated(activity: Activity, savedInstanceState: Bundle?) {}
            override fun onActivityStarted(activity: Activity) {}
            override fun onActivityStopped(activity: Activity) {
                CallOverlayService.notifyForegroundContextChanged("onActivityStopped")
            }
            override fun onActivitySaveInstanceState(activity: Activity, outState: Bundle) {}
            override fun onActivityDestroyed(activity: Activity) {
                if (currentActivityName?.startsWith(activity.javaClass.name) == true) {
                    setCurrentActivity(null)
                }
                CallOverlayService.notifyForegroundContextChanged("onActivityDestroyed")
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
        initMobileAds("Application.onCreate")
    }

    companion object {
        private const val TAG = "VlueAds"

        @Volatile
        var instance: Application? = null
            private set

        @Volatile
        var currentActivityName: String? = null
            private set

        private val adsInitialized = AtomicBoolean(false)
        private val readyWaiters = mutableListOf<() -> Unit>()

        fun setCurrentActivity(name: String?) {
            currentActivityName = name
        }

        fun isMobileAdsInitialized(): Boolean = adsInitialized.get()

        fun initMobileAds(reason: String) {
            val app = instance ?: return
            Log.i(TAG, "MobileAds.initialize request reason=$reason already=${adsInitialized.get()}")
            MobileAds.initialize(app) { status: InitializationStatus ->
                val first = adsInitialized.compareAndSet(false, true)
                Log.i(
                    TAG,
                    "MobileAds.initialize done first=$first adapters=${status.adapterStatusMap.size} reason=$reason",
                )
                status.adapterStatusMap.forEach { (name, adapter) ->
                    Log.i(TAG, "  adapter=$name state=${adapter.initializationState} desc=${adapter.description}")
                }
                val waiters: List<() -> Unit>
                synchronized(readyWaiters) {
                    waiters = readyWaiters.toList()
                    readyWaiters.clear()
                }
                waiters.forEach { runCatching { it.invoke() } }
            }
        }

        /** AdMob 초기화 완료 후 실행 (이미 완료면 즉시) */
        fun whenMobileAdsReady(block: () -> Unit) {
            if (adsInitialized.get()) {
                block()
                return
            }
            synchronized(readyWaiters) {
                readyWaiters.add(block)
            }
            initMobileAds("whenMobileAdsReady")
        }
    }
}
