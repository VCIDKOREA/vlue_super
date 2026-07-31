package kr.vlue.calloverlay

import android.app.Activity
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.graphics.Color
import android.graphics.Typeface
import android.os.Build
import android.os.Bundle
import android.util.Log
import android.util.TypedValue
import android.view.Gravity
import android.view.WindowManager
import android.widget.LinearLayout
import android.widget.TextView

/**
 * 수신/발신 시 네이티브 빅푸시 폴백 UI.
 * SYSTEM_ALERT_WINDOW 가 전화앱 아래에 깔려도 액티비티·풀스크린 인텐트로 보이게 한다.
 */
class LetteringRingingActivity : Activity() {
    private val finishReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            if (intent?.action == ACTION_FINISH) finish()
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
                setShowWhenLocked(true)
                setTurnScreenOn(true)
            }
            @Suppress("DEPRECATION")
            window.addFlags(
                WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON or
                    WindowManager.LayoutParams.FLAG_ALLOW_LOCK_WHILE_SCREEN_ON or
                    WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
                    WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
            )
        } catch (e: Exception) {
            Log.w(TAG, "lockscreen flags failed", e)
        }

        val phone = intent?.getStringExtra(EXTRA_PHONE).orEmpty().ifBlank { "unknown" }
        val outgoing = intent?.getBooleanExtra(EXTRA_OUTGOING, false) ?: false

        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundColor(Color.parseColor("#F00B101B"))
            setPadding(dp(24), dp(48), dp(24), dp(24))
            gravity = Gravity.TOP
        }
        root.addView(
            TextView(this).apply {
                text = if (outgoing) "VLUE 발신 레터링" else "VLUE 수신 빅푸시"
                setTextColor(Color.WHITE)
                setTextSize(TypedValue.COMPLEX_UNIT_SP, 14f)
                typeface = Typeface.DEFAULT_BOLD
            }
        )
        root.addView(
            TextView(this).apply {
                text = if (phone == "unknown") "번호 확인 중…" else phone
                setTextColor(Color.parseColor("#E2E8F0"))
                setTextSize(TypedValue.COMPLEX_UNIT_SP, 28f)
                typeface = Typeface.DEFAULT_BOLD
                setPadding(0, dp(10), 0, 0)
            }
        )
        root.addView(
            TextView(this).apply {
                text = "쇼케이스 불러오는 중… 뒤로가기로 전화 화면으로 돌아갈 수 있습니다."
                setTextColor(Color.parseColor("#94A3B8"))
                setTextSize(TypedValue.COMPLEX_UNIT_SP, 13f)
                setPadding(0, dp(12), 0, 0)
            }
        )
        setContentView(root)

        try {
            val filter = IntentFilter(ACTION_FINISH)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                registerReceiver(finishReceiver, filter, RECEIVER_NOT_EXPORTED)
            } else {
                @Suppress("UnspecifiedRegisterReceiverFlag")
                registerReceiver(finishReceiver, filter)
            }
        } catch (e: Exception) {
            Log.w(TAG, "register finish receiver failed", e)
        }

        LetteringCallCoordinator.ensureOverlayOnly(this, phone, outgoing)
        LetteringPrefs.setLastCallEvent(this, "ringing_activity:$phone")
    }

    override fun onDestroy() {
        try {
            unregisterReceiver(finishReceiver)
        } catch (_: Exception) {
        }
        super.onDestroy()
    }

    private fun dp(v: Int): Int =
        TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, v.toFloat(), resources.displayMetrics).toInt()

    companion object {
        private const val TAG = "LetteringRingingAct"
        const val EXTRA_PHONE = "phone"
        const val EXTRA_OUTGOING = "outgoing"
        const val ACTION_FINISH = "kr.vlue.calloverlay.RINGING_FINISH"

        fun intent(context: Context, phone: String, outgoing: Boolean): Intent =
            Intent(context, LetteringRingingActivity::class.java).apply {
                addFlags(
                    Intent.FLAG_ACTIVITY_NEW_TASK or
                        Intent.FLAG_ACTIVITY_SINGLE_TOP or
                        Intent.FLAG_ACTIVITY_CLEAR_TOP
                )
                putExtra(EXTRA_PHONE, phone)
                putExtra(EXTRA_OUTGOING, outgoing)
            }

        fun launch(context: Context, phone: String, outgoing: Boolean) {
            try {
                context.applicationContext.startActivity(intent(context, phone, outgoing))
            } catch (e: Exception) {
                Log.e(TAG, "launch failed", e)
                LetteringPrefs.setLastOverlayError(context, "activity:${e.message}")
            }
        }

        fun requestFinish(context: Context) {
            try {
                context.applicationContext.sendBroadcast(
                    Intent(ACTION_FINISH).setPackage(context.packageName)
                )
            } catch (_: Exception) {
            }
        }
    }
}
