package kr.vlue.calloverlay.applock

import android.app.Activity
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.FrameLayout
import android.widget.TextView
import androidx.core.content.ContextCompat
import kr.vlue.calloverlay.R
import org.json.JSONObject

/**
 * 메인 WebView 위 PIN 오버레이.
 * V1: 앱 잠금 ON → 진입마다 / 잠금 OFF → 중요기능 requestAuth
 * V2 예약: 24h 강제 · BiometricPrompt
 */
class PinLockController(
    private val activity: Activity,
    private val root: FrameLayout,
    private val onUnlockedForLaunch: () -> Unit,
    private val onNotifyWeb: (eventName: String, detailJson: String) -> Unit
) {
    enum class Mode {
        UNLOCK,
        SETUP,
        SETUP_CONFIRM,
        AUTH_REQUEST,
        LOCKED_OUT
    }

    private var overlay: View? = null
    private var mode: Mode = Mode.UNLOCK
    private var pendingSetupPin: String = ""
    private var buffer: StringBuilder = StringBuilder()
    private var authRequestId: String = ""
    private var titleView: TextView? = null
    private var subtitleView: TextView? = null
    private var errorView: TextView? = null
    private var dots: List<View> = emptyList()

    /** 프로세스·포그라운드 세션: 잠금 ON 시 이번 언락 이후 중요기능 재요구 생략 */
    @Volatile
    var sessionUnlocked: Boolean = false
        private set

    fun isShowing(): Boolean = overlay?.visibility == View.VISIBLE

    fun clearSession() {
        sessionUnlocked = false
    }

    fun shouldBlockLaunch(): Boolean {
        AppLockStore.init(activity)
        if (AppLockStore.requiresIdentityReset()) return true
        return AppLockStore.hasPin() && AppLockStore.isAppLockEnabled() && !sessionUnlocked
    }

    fun showLaunchGateIfNeeded(): Boolean {
        AppLockStore.init(activity)
        if (AppLockStore.requiresIdentityReset()) {
            show(Mode.LOCKED_OUT)
            onNotifyWeb("vlue-app-lock-requires-reset", """{"reason":"max_fails"}""")
            return true
        }
        if (shouldBlockLaunch()) {
            show(Mode.UNLOCK)
            return true
        }
        hide()
        onUnlockedForLaunch()
        return false
    }

    fun showSetup(requestId: String = "") {
        authRequestId = requestId
        pendingSetupPin = ""
        buffer.clear()
        show(Mode.SETUP)
    }

    fun showAuthRequest(requestId: String) {
        AppLockStore.init(activity)
        authRequestId = requestId
        if (!AppLockStore.hasPin()) {
            showSetup(requestId)
            return
        }
        // 앱 잠금 ON + 이미 세션 언락 → 중요기능 추가 PIN 생략
        if (AppLockStore.isAppLockEnabled() && sessionUnlocked) {
            dispatchAuthResult(true, "session")
            return
        }
        if (AppLockStore.requiresIdentityReset()) {
            show(Mode.LOCKED_OUT)
            onNotifyWeb("vlue-app-lock-requires-reset", """{"reason":"max_fails","requestId":${JSONObject.quote(requestId)}}""")
            dispatchAuthResult(false, "requires_reset")
            return
        }
        show(Mode.AUTH_REQUEST)
    }

    fun allowResetAfterIdentity() {
        AppLockStore.init(activity)
        AppLockStore.clearPinKeepLockFlag()
        AppLockStore.setRequiresIdentityReset(false)
        AppLockStore.clearFailures()
        pendingSetupPin = ""
        buffer.clear()
        show(Mode.SETUP)
    }

    fun hide() {
        overlay?.visibility = View.GONE
        buffer.clear()
        updateDots()
    }

    private fun show(m: Mode) {
        mode = m
        ensureOverlay()
        overlay?.visibility = View.VISIBLE
        overlay?.bringToFront()
        buffer.clear()
        updateDots()
        updateCopy()
        errorView?.text = ""
    }

    private fun ensureOverlay() {
        if (overlay != null) return
        val view = LayoutInflater.from(activity).inflate(R.layout.view_pin_lock, root, false)
        root.addView(
            view,
            FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
            )
        )
        overlay = view
        titleView = view.findViewById(R.id.pin_title)
        subtitleView = view.findViewById(R.id.pin_subtitle)
        errorView = view.findViewById(R.id.pin_error)
        dots = listOf(
            view.findViewById(R.id.pin_dot_0),
            view.findViewById(R.id.pin_dot_1),
            view.findViewById(R.id.pin_dot_2),
            view.findViewById(R.id.pin_dot_3),
            view.findViewById(R.id.pin_dot_4),
            view.findViewById(R.id.pin_dot_5)
        )
        val keys = listOf(
            R.id.pin_key_1 to "1", R.id.pin_key_2 to "2", R.id.pin_key_3 to "3",
            R.id.pin_key_4 to "4", R.id.pin_key_5 to "5", R.id.pin_key_6 to "6",
            R.id.pin_key_7 to "7", R.id.pin_key_8 to "8", R.id.pin_key_9 to "9",
            R.id.pin_key_0 to "0"
        )
        keys.forEach { (id, digit) ->
            view.findViewById<View>(id).setOnClickListener { onDigit(digit) }
        }
        view.findViewById<View>(R.id.pin_key_del).setOnClickListener { onDelete() }
        view.findViewById<View>(R.id.pin_reset_cta).setOnClickListener {
            onNotifyWeb("vlue-app-lock-requires-reset", """{"reason":"user_or_lockout"}""")
        }
    }

    private fun updateCopy() {
        val resetCta = overlay?.findViewById<View>(R.id.pin_reset_cta)
        when (mode) {
            Mode.SETUP -> {
                titleView?.text = "앱 PIN 등록"
                subtitleView?.text = FUTURE_BIO_HINT
                resetCta?.visibility = View.GONE
            }
            Mode.SETUP_CONFIRM -> {
                titleView?.text = "PIN 한 번 더 입력"
                subtitleView?.text = FUTURE_BIO_HINT
                resetCta?.visibility = View.GONE
            }
            Mode.UNLOCK, Mode.AUTH_REQUEST -> {
                titleView?.text = "PIN 입력"
                subtitleView?.text = FUTURE_BIO_HINT
                resetCta?.visibility = View.VISIBLE
            }
            Mode.LOCKED_OUT -> {
                titleView?.text = "PIN 잠금"
                subtitleView?.text = "5회 실패로 잠겼습니다. 본인인증 후 PIN을 다시 등록해 주세요."
                resetCta?.visibility = View.VISIBLE
                (resetCta as? TextView)?.text = "본인인증으로 PIN 재설정"
            }
        }
        if (mode != Mode.LOCKED_OUT) {
            (resetCta as? TextView)?.text = "PIN을 잊으셨나요?"
        }
    }

    private fun onDigit(d: String) {
        if (mode == Mode.LOCKED_OUT) return
        if (buffer.length >= AppLockStore.PIN_LENGTH) return
        buffer.append(d)
        updateDots()
        if (buffer.length == AppLockStore.PIN_LENGTH) {
            onPinComplete(buffer.toString())
        }
    }

    private fun onDelete() {
        if (buffer.isEmpty()) return
        buffer.deleteCharAt(buffer.length - 1)
        updateDots()
        errorView?.text = ""
    }

    private fun updateDots() {
        val filled = buffer.length
        val blue = ContextCompat.getColor(activity, R.color.pin_dot_filled)
        val empty = ContextCompat.getColor(activity, R.color.pin_dot_empty)
        dots.forEachIndexed { i, v ->
            val on = i < filled
            v.setBackgroundResource(if (on) R.drawable.pin_dot_filled else R.drawable.pin_dot_empty)
            v.animate().scaleX(if (on) 1.08f else 1f).scaleY(if (on) 1.08f else 1f).setDuration(90).start()
            // color via drawable; keep refs used
            @Suppress("UNUSED_VARIABLE")
            val _c = if (on) blue else empty
        }
    }

    private fun onPinComplete(pin: String) {
        AppLockStore.init(activity)
        when (mode) {
            Mode.SETUP -> {
                pendingSetupPin = pin
                buffer.clear()
                updateDots()
                show(Mode.SETUP_CONFIRM)
            }
            Mode.SETUP_CONFIRM -> {
                if (pin != pendingSetupPin) {
                    errorView?.text = "PIN이 일치하지 않습니다. 처음부터 다시 등록해 주세요."
                    pendingSetupPin = ""
                    buffer.clear()
                    updateDots()
                    show(Mode.SETUP)
                    return
                }
                AppLockStore.setPin(pin)
                sessionUnlocked = true
                AppLockStore.markAuthSuccessNow()
                hide()
                onNotifyWeb(
                    "vlue-app-lock-setup-result",
                    """{"ok":true,"requestId":${JSONObject.quote(authRequestId)}}"""
                )
                if (authRequestId.isNotEmpty()) {
                    dispatchAuthResult(true, "setup")
                }
                onUnlockedForLaunch()
            }
            Mode.UNLOCK, Mode.AUTH_REQUEST -> {
                if (AppLockStore.verifyPin(pin)) {
                    sessionUnlocked = true
                    AppLockStore.markAuthSuccessNow()
                    AppLockStore.clearFailures()
                    hide()
                    if (mode == Mode.AUTH_REQUEST) {
                        dispatchAuthResult(true, "pin")
                    }
                    onUnlockedForLaunch()
                } else {
                    val fails = AppLockStore.recordFailure()
                    buffer.clear()
                    updateDots()
                    if (fails >= AppLockStore.MAX_FAILS) {
                        errorView?.text = "5회 실패 — 본인인증 후 PIN을 재설정해야 합니다."
                        show(Mode.LOCKED_OUT)
                        onNotifyWeb("vlue-app-lock-requires-reset", """{"reason":"max_fails"}""")
                        if (mode == Mode.AUTH_REQUEST) {
                            dispatchAuthResult(false, "requires_reset")
                        }
                    } else {
                        errorView?.text = "PIN이 올바르지 않습니다. (${fails}/${AppLockStore.MAX_FAILS})"
                    }
                }
            }
            Mode.LOCKED_OUT -> Unit
        }
    }

    private fun dispatchAuthResult(ok: Boolean, via: String) {
        val json =
            """{"ok":$ok,"via":${JSONObject.quote(via)},"requestId":${JSONObject.quote(authRequestId)}}"""
        onNotifyWeb("vlue-app-lock-auth-result", json)
    }

    companion object {
        const val FUTURE_BIO_HINT =
            "지문/얼굴 인식은 추후 업데이트에 추가될 예정이며, 현재는 6자리 PIN으로 안전하게 보호됩니다"
    }
}
