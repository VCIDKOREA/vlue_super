package kr.vlue.calloverlay

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/** 재부팅 후 레터링 설정 유지 (리시버는 manifest 등록 상태) */
class LetteringBootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent?) {
        if (intent?.action != Intent.ACTION_BOOT_COMPLETED) return
        LetteringCallMonitorService.syncWithPrefs(context)
    }
}
