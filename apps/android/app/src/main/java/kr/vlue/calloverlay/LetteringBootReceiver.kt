package kr.vlue.calloverlay

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import kr.vlue.calloverlay.family.FamilyDeviceActivitySensor
import kr.vlue.calloverlay.push.VlueFcmRegistrar
import kr.vlue.calloverlay.runtime.ColdProcessBootstrap
import kr.vlue.calloverlay.runtime.VlueBackgroundWork

/** 재부팅·앱 업데이트 후 레터링·주기 작업·동적 리시버를 다시 대기시킨다. */
class LetteringBootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent?) {
        val action = intent?.action ?: return
        if (action != Intent.ACTION_BOOT_COMPLETED &&
            action != Intent.ACTION_MY_PACKAGE_REPLACED &&
            action != QUICKBOOT_POWERON
        ) {
            return
        }
        val app = context.applicationContext
        ColdProcessBootstrap.ensureReady(app)
        LetteringIntegration.ensureLetteringArmedIfReady(app)
        LetteringCallMonitorService.syncWithPrefs(app)
        FamilyDeviceActivitySensor.ensureStarted(app)
        VlueBackgroundWork.ensureScheduled(app)
        VlueFcmRegistrar.syncTokenAsync(app, action)
    }

    companion object {
        private const val QUICKBOOT_POWERON = "android.intent.action.QUICKBOOT_POWERON"
    }
}
