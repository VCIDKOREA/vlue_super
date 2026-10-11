package kr.vlue.calloverlay.companion

import android.util.Log

/**
 * 한 통화의 오버레이 문서 수명.
 *
 * 앱 안 미리보기(LetteringIncomingNotification)는 안정된 뷰포트에서 그린다.
 * 통화 WebView 는 그 컴포넌트를 바꾸지 않고, 이 세션이 다음만 결정한다.
 *
 * - 최초 문서 로드와 같은 문서 안의 데이터 갱신
 * - 새 통화에 따른 문서 초기화
 * - 풀 쇼케이스에 컴팩트 높이를 싣지 않음
 * - 렌더러 종료 시 원인 기록과 1회 재생성
 */
class CompanionOverlaySession {
    var documentKey: String? = null
        private set
    var documentLoads: Int = 0
        private set
    var rendererRecoveries: Int = 0
        private set

    fun reset(reason: String) {
        Log.i(TAG, "RESET reason=$reason key=$documentKey loads=$documentLoads renderer=$rendererRecoveries")
        documentKey = null
        documentLoads = 0
        rendererRecoveries = 0
    }

    /** 렌더러 복구 횟수는 유지한다. 재생성 직후 reset 이 복구 한도를 다시 열지 않게. */
    fun resetDocument(reason: String) {
        Log.i(TAG, "RESET_DOCUMENT reason=$reason key=$documentKey loads=$documentLoads")
        documentKey = null
        documentLoads = 0
    }

    /**
     * @return true 면 loadUrl 이 필요하다. false 면 같은 문서에 데이터만 넣는다.
     */
    fun shouldLoadDocument(key: String, url: String, forceNewDocument: Boolean): Boolean {
        val live = !forceNewDocument &&
            documentKey == key &&
            (url.isEmpty() || url.contains("lettering-overlay") || url.contains("vlue-overlay"))
        if (live) {
            Log.i(TAG, "KEEP_DOCUMENT key=$key url=$url")
            return false
        }
        val reason = when {
            forceNewDocument -> "force_new_document"
            documentKey == null -> "first_load"
            documentKey != key -> "new_call_or_direction"
            else -> "document_not_live"
        }
        documentLoads += 1
        documentKey = key
        Log.i(
            TAG,
            "NAVIGATE reason=$reason load#$documentLoads key=$key prevUrl=$url"
        )
        return true
    }

    /**
     * 풀 쇼케이스 CSS 높이는 화면 픽셀만 허용한다.
     * 측정값이 로고·미니·0이면 그 값을 싣지 않는다. 미리보기와 같이 본문이 잘리지 않게 한다.
     *
     * @return 발행할 px. null 이면 이번 측정은 무시.
     */
    fun fullscreenCssHeightPx(screenPx: Int, measuredPx: Int): Int? {
        if (screenPx <= 0) return null
        if (measuredPx in 1 until (screenPx * 0.8f).toInt()) {
            Log.i(
                TAG,
                "SKIP_COMPACT_HEIGHT measured=$measuredPx screen=$screenPx — keep fullscreen css"
            )
            return screenPx
        }
        return screenPx
    }

    /**
     * 렌더러가 죽으면 원인을 남기고, 통화당 한 번만 WebView 재생성을 허용한다.
     */
    fun allowRendererRecovery(detail: String): Boolean {
        rendererRecoveries += 1
        Log.e(TAG, "RENDERER_GONE #$rendererRecoveries $detail")
        return rendererRecoveries == 1
    }

    companion object {
        private const val TAG = "CompanionOverlaySession"
    }
}
