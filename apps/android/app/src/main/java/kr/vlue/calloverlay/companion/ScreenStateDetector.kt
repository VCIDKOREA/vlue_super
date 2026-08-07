package kr.vlue.calloverlay.companion

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Build
import android.os.PowerManager
import android.util.Log

/**
 * 화면 전원/Dream(AOD 근사) → [ScreenState].
 * OverlayState를 바꾸지 않는다 — Position Context만 제공한다.
 *
 * SCREEN_OFF 감지 ≠ 통화 종료.
 * AOD는 OEM마다 상이; Dream 시작을 AOD 근사로 쓰고 BigPush는 OFF와 동일 HIDDEN 정책.
 */
class ScreenStateDetector(
    private val context: Context,
    private val onChanged: (ScreenState) -> Unit
) {
    @Volatile
    private var dreaming: Boolean = false

    @Volatile
    private var started: Boolean = false

    private val receiver = object : BroadcastReceiver() {
        override fun onReceive(ctx: Context?, intent: Intent?) {
            when (intent?.action) {
                Intent.ACTION_SCREEN_ON -> {
                    dreaming = false
                    emit()
                }
                Intent.ACTION_SCREEN_OFF -> emit()
                Intent.ACTION_DREAMING_STARTED -> {
                    dreaming = true
                    emit()
                }
                Intent.ACTION_DREAMING_STOPPED -> {
                    dreaming = false
                    emit()
                }
            }
        }
    }

    fun current(): ScreenState = resolve(isInteractive(context), dreaming)

    fun start() {
        if (started) return
        started = true
        val filter = IntentFilter().apply {
            addAction(Intent.ACTION_SCREEN_ON)
            addAction(Intent.ACTION_SCREEN_OFF)
            addAction(Intent.ACTION_DREAMING_STARTED)
            addAction(Intent.ACTION_DREAMING_STOPPED)
        }
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                context.registerReceiver(receiver, filter, Context.RECEIVER_NOT_EXPORTED)
            } else {
                @Suppress("UnspecifiedRegisterReceiverFlag")
                context.registerReceiver(receiver, filter)
            }
        } catch (e: Exception) {
            Log.w(TAG, "registerReceiver failed: ${e.message}")
        }
        emit()
    }

    fun stop() {
        if (!started) return
        started = false
        try {
            context.unregisterReceiver(receiver)
        } catch (_: Exception) {
        }
    }

    private fun emit() {
        onChanged(current())
    }

    companion object {
        private const val TAG = "ScreenStateDetector"

        fun isInteractive(context: Context): Boolean {
            return try {
                val pm = context.getSystemService(Context.POWER_SERVICE) as? PowerManager
                pm?.isInteractive == true
            } catch (_: Exception) {
                true
            }
        }

        /** 순수 해석 — 단위 테스트용 */
        fun resolve(interactive: Boolean, dreaming: Boolean): ScreenState {
            if (interactive) return ScreenState.SCREEN_ON
            if (dreaming) return ScreenState.AOD
            return ScreenState.SCREEN_OFF
        }
    }
}
