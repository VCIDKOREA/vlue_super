/** 수익 시뮬레이터 UI 상수 — 백엔드 revenueSimulatorEngine 과 동기 */

export const SIMULATOR_MAX = 100_000;

export const REFERRAL_CHANNEL_OPTIONS = [
  {
    id: "friend",
    label: "지인 추천 · 10% 포인트",
    detail: "추천인 전화번호 · 2번째 유료 추천부터 1~12개월 포인트 적립"
  },
  {
    id: "promo",
    label: "홍보 추천 · 15% 캐시",
    detail: "VLUER 고유 코드 · SNS 인증·승인 후 출금 가능 캐시"
  },
  {
    id: "promo_sliding",
    label: "홍보 추천 · 5% 캐시 (13개월~)",
    detail: "VLUER 승인 후 13개월째부터 영구 5% 캐시"
  }
];
