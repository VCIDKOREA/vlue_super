package kr.vlue.calloverlay.companion

/**
 * 통화 phase + 전면 앱 힌트로 OverlayContext 추정.
 * Android 의존을 최소화하기 위해 원시 입력만 받는다.
 */
object OverlayContextDetector {
    enum class CallPhase {
        IDLE,
        RINGING,
        OFFHOOK
    }

    /**
     * @param callPhase 현재 통화 phase
     * @param foregroundIsOurApp VLUE MainActivity 등이 전면
     * @param foregroundIsLauncher 런처/홈이 전면으로 추정
     * @param foregroundIsInCallUi 시스템 전화(InCallUI) 패키지가 전면으로 추정
     * @param foregroundIsKnownOtherApp 전면 패키지를 알 수 있고 전화/런처/자사가 아님
     * @param userMinimized 사용자/브리지가 Mini 요청
     * @param keypadOpen 키패드 열림
     */
    fun detect(
        callPhase: CallPhase,
        foregroundIsOurApp: Boolean = false,
        foregroundIsLauncher: Boolean = false,
        foregroundIsInCallUi: Boolean = false,
        foregroundIsKnownOtherApp: Boolean = false,
        userMinimized: Boolean = false,
        keypadOpen: Boolean = false
    ): OverlayContext {
        if (keypadOpen) return OverlayContext.KEYPAD
        if (userMinimized) return OverlayContext.MINIMIZED
        return when (callPhase) {
            CallPhase.IDLE -> when {
                foregroundIsLauncher || foregroundIsOurApp -> OverlayContext.HOME_SCREEN
                else -> OverlayContext.OTHER_APP
            }
            /*
             * RINGING:
             * - InCallUI(전체 전화) → TOP
             * - 다른 앱 확정 → BOTTOM
             * - 미확인: InCallUI 프로세스 여부는 Service에서 inCallUi 플래그로 보정
             */
            CallPhase.RINGING -> when {
                foregroundIsInCallUi -> OverlayContext.INCOMING_CALL_UI
                foregroundIsKnownOtherApp -> OverlayContext.OTHER_APP
                foregroundIsLauncher || foregroundIsOurApp -> OverlayContext.HOME_SCREEN
                else -> OverlayContext.INCOMING_CALL_UI
            }
            CallPhase.OFFHOOK -> when {
                foregroundIsInCallUi && !userMinimized -> OverlayContext.IN_CALL
                foregroundIsLauncher -> OverlayContext.HOME_SCREEN
                foregroundIsOurApp -> OverlayContext.IN_CALL
                /* 확정된 타 앱만 OTHER → MINI. 미확인은 InCallUI 유지(오판으로 쇼케이스 축소 방지) */
                foregroundIsKnownOtherApp -> OverlayContext.OTHER_APP
                else -> OverlayContext.IN_CALL
            }
        }
    }

    fun isLikelyLauncherPackage(pkg: String?): Boolean {
        if (pkg.isNullOrBlank()) return false
        val p = pkg.lowercase()
        return p.contains("launcher") ||
            p.contains("house") ||
            p == "com.sec.android.app.launcher" ||
            p == "com.google.android.apps.nexuslauncher" ||
            p == "com.android.launcher3"
    }

    fun isLikelyInCallUiPackage(pkg: String?): Boolean {
        if (pkg.isNullOrBlank()) return false
        val p = pkg.lowercase()
        return p.contains("incallui") ||
            p.contains("incall") ||
            p.contains("dialer") ||
            p.contains("telecom") ||
            p.contains("telephonyui") ||
            p == "com.samsung.android.incallui" ||
            p == "com.samsung.android.dialer" ||
            p == "com.google.android.dialer" ||
            p == "com.android.phone" ||
            p == "com.android.server.telecom"
    }
}
