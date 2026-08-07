package kr.vlue.calloverlay

/**
 * Companion MVP — 웹 `companionMvpFlags.js` 의 COMPANION_MVP_DELEGATE_CALL_UI 와 동기.
 *
 * true: 삼성 전화앱에 통화 제어 위임. Call End 시 Overlay 전부 즉시 제거
 *       (docs/architecture/companion-overlay.md). MainActivity·Monitor FGS 유지.
 * false: Advanced — endCallKeepOverlay 등 기존 InCall keep 경로 허용.
 *
 * Overlay State Machine: companion/CompanionOverlayController
 */
object CompanionMvpConfig {
    const val DELEGATE_CALL_UI: Boolean = true
}
