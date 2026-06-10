import type { VluerGrade } from "./vluerGradeTypes.js";

/** VLUER 홍보 추천 채널 — 2단계 정책 (2026) */
export const VLUE_GRADE_SPEC = {
  general: {
    grade: "general" as VluerGrade,
    displayCode: "VLUER",
    label: "VLUER 신청 대기",
    ratePct: 0,
    payoutMode: "cash_commission" as const,
    canWithdraw: false,
    benefitLabel: "SNS 인증·승인 후 홍보 추천 활동 가능",
    commerceSharePct: 0,
    commerceBenefitLabel: "쇼핑 커머스 쉐어 없음",
    settlementExcluded: true
  },
  certified: {
    grade: "certified" as VluerGrade,
    displayCode: "CV",
    label: "홍보 VLUER",
    ratePct: 15,
    payoutMode: "cash_commission" as const,
    canWithdraw: true,
    benefitLabel: "홍보 추천 1~12개월 15% 캐시 · 13개월~ 5% 영구",
    commerceSharePct: 0.3,
    commerceBenefitLabel: "쇼핑 커머스 0.3% 쉐어",
    settlementExcluded: false
  },
  partner: {
    grade: "partner" as VluerGrade,
    displayCode: "PV",
    label: "홍보 VLUER 파트너",
    ratePct: 15,
    payoutMode: "cash_commission" as const,
    canWithdraw: true,
    benefitLabel: "홍보 추천 1~12개월 15% 캐시 · 13개월~ 5% 영구",
    commerceSharePct: 0.8,
    commerceBenefitLabel: "쇼핑 커머스 0.8% 쉐어",
    settlementExcluded: false
  },
  official: {
    grade: "official" as VluerGrade,
    displayCode: "OV",
    label: "공식 VLUER",
    ratePct: 0,
    payoutMode: "cash_commission" as const,
    canWithdraw: false,
    benefitLabel: "B2B 제휴 전용",
    commerceSharePct: 0,
    commerceBenefitLabel: "쇼핑 커머스 제외",
    settlementExcluded: true
  }
} as const;

export function gradeSpec(grade: VluerGrade) {
  return VLUE_GRADE_SPEC[grade] ?? VLUE_GRADE_SPEC.general;
}

export function commerceVluerShareBp(grade: VluerGrade): number {
  return Math.round(gradeSpec(grade).commerceSharePct * 100);
}

export function totalMemberCount(downlineUsers: number, enterpriseCount: number): number {
  return Math.max(0, Math.floor(downlineUsers)) + Math.max(0, Math.floor(enterpriseCount));
}
