/**
 * Companion MVP 플래그 — ROLE_DIALER 전제 없이 삼성 전화앱에 통화 제어 위임.
 * Advanced Mode에서 false로 두면 기존 InCallControlBar 경로를 다시 쓸 수 있다.
 *
 * Android `CompanionMvpConfig.DELEGATE_CALL_UI` 와 값을 맞출 것.
 */
export const COMPANION_MVP_DELEGATE_CALL_UI = true;

/**
 * MINI CASE 정의
 *
 * = 통화 중 사용자를 보조하는 Floating Controller.
 * 정보 표시 + SHOWCASE 복귀만 담당. 별도 콘텐츠 노출 없음.
 *
 * 표시: 이름 · 통화 상태 아이콘·통화시간 · 전화번호 · 인증/미인증 · SHOWCASE 열기
 * 위치: 드래그 좌표 유지 · 자동 가장자리 스냅 금지 · 완전 이탈 금지(~28px peek rail)
 * 통화 종료 시 제거 + 다음 통화는 기본 위치. Native Floating Window ↔ React 좌표 동기화.
 *
 * 통화 종료 ≠ 앱 종료. VLUE(MainActivity·CallMonitor)는 카톡처럼 상시 대기.
 * 종료되는 것은 CallOverlay(Showcase/Mini Case) 통화 UI뿐이다.
 */
export const MINI_CASE_EDGE_KEEP_PX = 28;
