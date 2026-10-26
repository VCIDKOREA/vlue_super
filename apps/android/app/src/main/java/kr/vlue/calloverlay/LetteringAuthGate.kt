package kr.vlue.calloverlay

import android.content.Context
import android.util.Log

/**
 * 통화 오버레이(BigPush / Showcase / MiniCase / 발신 로고) 실행 전 인증 가드.
 *
 * 미가입·PASS 본인인증 미완료·온보딩 미완료 사용자는 모든 콜 오버레이를 차단한다.
 * 권한만 허용된 최초 설치 상태에서도 오버레이를 띄우지 않는다.
 */
object LetteringAuthGate {
    private const val TAG = "LetteringAuthGate"

    /**
     * 로그인 세션(userId + accessToken) + PASS/온보딩 완료 여부.
     * false 이면 BigPush·Showcase·모니터 서비스·InCall 오버레이를 모두 막는다.
     */
    fun canRunCallOverlay(context: Context): Boolean {
        val app = context.applicationContext
        if (LetteringPrefs.isUserOptedOut(app)) {
            Log.i(TAG, "block: user opted out")
            return false
        }
        if (!LetteringPrefs.hasAuthenticatedSession(app)) {
            Log.i(TAG, "block: no authenticated session (userId/token)")
            return false
        }
        if (!LetteringPrefs.isIdentityReadyForOverlay(app)) {
            Log.i(TAG, "block: PASS/onboarding incomplete")
            return false
        }
        return true
    }

    fun denyReason(context: Context): String {
        val app = context.applicationContext
        if (LetteringPrefs.isUserOptedOut(app)) return "user_opted_out"
        if (!LetteringPrefs.hasAuthenticatedSession(app)) return "not_authenticated"
        if (!LetteringPrefs.isIdentityReadyForOverlay(app)) return "identity_or_onboarding_incomplete"
        return "ok"
    }
}
