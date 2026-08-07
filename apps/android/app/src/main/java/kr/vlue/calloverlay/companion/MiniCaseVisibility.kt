package kr.vlue.calloverlay.companion

/**
 * MINI_CASE 가시성. Position과 분리.
 * EDGE_HIDDEN은 종료 상태가 아니며 Tap → VISIBLE.
 * 기준: docs/architecture/companion-overlay.md §5
 */
enum class MiniCaseVisibility {
    VISIBLE,
    EDGE_HIDDEN
}
