import type { VluerGrade } from "./vluerGradeTypes.js";

/**
 * VLUER 등급 — 홍보 추천 채널 전용 (SNS 인증·승인 후 활동)
 * 지인 추천(전화번호)과 분리된 2단계 정책의 홍보 측면
 */
const SPECS = {
  general: {
    ratePct: 0,
    payoutMode: "cash_commission" as const,
    settlementExcluded: true,
    promoActive: false
  },
  certified: {
    ratePct: 15,
    payoutMode: "cash_commission" as const,
    settlementExcluded: false,
    promoActive: true
  },
  partner: {
    ratePct: 15,
    payoutMode: "cash_commission" as const,
    settlementExcluded: false,
    promoActive: true
  },
  official: {
    ratePct: 0,
    payoutMode: "cash_commission" as const,
    settlementExcluded: true,
    promoActive: false
  }
} as const;

export function gradeSpec(grade: VluerGrade) {
  return SPECS[grade] ?? SPECS.general;
}

/** 홍보 추천(캐시 정산) 활성 — 인증·파트너 VLUER */
export function isVluerPromoActive(grade: VluerGrade): boolean {
  return gradeSpec(grade).promoActive;
}
