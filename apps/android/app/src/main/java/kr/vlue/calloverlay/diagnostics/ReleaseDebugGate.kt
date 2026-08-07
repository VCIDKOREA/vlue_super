package kr.vlue.calloverlay.diagnostics

import android.util.Log
import kr.vlue.calloverlay.BuildConfig

/**
 * Release Freeze — Debug/Probe/민감 로그 게이트.
 * Diagnostics 구조는 유지하고, Release에서만 출력·훅을 제한한다.
 */
object ReleaseDebugGate {
    val isDebugBuild: Boolean
        get() = BuildConfig.DEBUG

    /** NORMAL_OVERLAY_PROBE 등 QA 훅 — Release 제외 */
    fun allowDiagProbe(): Boolean = isDebugBuild

    fun d(tag: String, message: String) {
        if (isDebugBuild) Log.d(tag, message)
    }

    fun i(tag: String, message: String) {
        if (isDebugBuild) Log.i(tag, message)
    }

    /** Trace/Log용 전화번호 마스킹 (Release·Debug 공통) */
    fun maskPhoneForLog(raw: String?): String =
        DiagnosticsSessionStore.maskPhone(raw) ?: if (raw.isNullOrBlank()) "—" else "****"
}
