package kr.vlue.calloverlay

import android.util.Log

/**
 * Big Push / Showcase 표시 파이프라인 추적 전용.
 * Logcat 필터: `VlueBigPushTrace`
 * 수정 금지 단계 — 어디서 끊기는지 확인용.
 */
object VlueBigPushTrace {
    const val TAG = "VlueBigPushTrace"

    fun step(step: String, detail: String = "") {
        val msg = if (detail.isBlank()) step else "$step | $detail"
        Log.i(TAG, msg)
    }

    fun skip(step: String, reason: String) {
        Log.w(TAG, "SKIP after [$step] | $reason")
    }
}
