package kr.vlue.calloverlay.companion

/**
 * Single Companion Window 내부 배치 결과.
 * BigPush: TOP | BOTTOM | HIDDEN
 * Showcase: FULLSCREEN (TOP/BOTTOM 아님)
 * Mini: MINI_CASE
 * 기준: docs/architecture/companion-overlay.md
 */
enum class OverlayPosition {
    TOP,
    /** 삼성 미니 수신 팝업 바로 아래 (화면 최하단 아님) */
    BELOW_COMPACT_INCOMING,
    BOTTOM,
    FULLSCREEN,
    MINI_CASE,
    HIDDEN
}

/**
 * SM-A175N One UI 미니 수신 카드(HD Voice + 응답/종료 + 메시지) 높이.
 * 상태바 아래부터 카드 하단까지. 빅푸시는 이 값 + GAP 만큼 내려 붙인다.
 */
object CompactIncomingMetrics {
    /** One UI HD Voice 미니 카드 — 짧으면 빅푸시가 팝업 뒤에 겹침 */
    const val CARD_HEIGHT_DP = 280
    const val GAP_DP = 24
}
