package kr.vlue.calloverlay

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import kr.vlue.calloverlay.push.VlueFcmRegistrar

/** 재부팅·앱 업데이트 후 레터링 자동 복구 */
class LetteringBootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent?) {
        val action = intent?.action ?: return
        if (action != Intent.ACTION_BOOT_COMPLETED &&
            action != Intent.ACTION_MY_PACKAGE_REPLACED &&
            action != Intent.ACTION_PACKAGE_REPLACED
        ) {
            return
        }
        LetteringIntegration.ensureLetteringArmedIfReady(context)
        LetteringCallMonitorService.syncWithPrefs(context)
        VlueFcmRegistrar.syncTokenAsync(context, action)
    }
}
