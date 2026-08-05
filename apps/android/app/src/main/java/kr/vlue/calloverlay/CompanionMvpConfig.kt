package kr.vlue.calloverlay

/**
 * Companion MVP — 웹 `companionMvpFlags.js` 의 COMPANION_MVP_DELEGATE_CALL_UI 와 동기.
 *
 * true: 삼성 전화앱에 통화 제어 위임. 통화 종료 시 오버레이(Showcase/Mini Case)만 제거하고
 *       MainActivity·LetteringCallMonitorService 는 유지(카톡형 상시 대기).
 * false: Advanced — endCallKeepOverlay 등 기존 InCall 경로 허용.
 */
object CompanionMvpConfig {
    const val DELEGATE_CALL_UI: Boolean = true
}
