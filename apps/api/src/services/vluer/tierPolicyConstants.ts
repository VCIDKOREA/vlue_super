import type { VluerGrade } from "./vluerGradeTypes.js";

/** VLUER 등급별 정산 스펙 */
export const VLUE_GRADE_SPEC = {
  general: {
    grade: "general" as VluerGrade,
    displayCode: "VLUER",
    label: "일반 VLUER",
    ratePct: 5,
    payoutMode: "reward_only" as const,
    canWithdraw: false,
    benefitLabel: "5% 포인트 리워드 적립",
    commerceSharePct: 0,
    commerceBenefitLabel: "쇼핑 커머스 쉐어 없음",
    settlementExcluded: false
  },
  certified: {
    grade: "certified" as VluerGrade,
    displayCode: "CV",
    label: "인증 VLUER",
    ratePct: 10,
    payoutMode: "cash_commission" as const,
    canWithdraw: true,
    benefitLabel: "10% 캐시 적립 (구독)",
    /** 결제액(VAT포함) 대비 — 판매수수료 3.3% 풀 중 0.3% 쉐어 */
    commerceSharePct: 0.3,
    commerceBenefitLabel: "쇼핑 커머스 0.3% 쉐어 (PG 3.5%·판매수수료 3.3% 별도)",
    settlementExcluded: false
  },
  partner: {
    grade: "partner" as VluerGrade,
    displayCode: "PV",
    label: "파트너 VLUER",
    ratePct: 15,
    payoutMode: "cash_commission" as const,
    canWithdraw: true,
    benefitLabel: "15% 캐시 적립 (구독)",
    commerceSharePct: 0.8,
    commerceBenefitLabel: "쇼핑 커머스 0.8% 쉐어 (PG 3.5%·판매수수료 3.3% 별도)",
    settlementExcluded: false
  },
  official: {
    grade: "official" as VluerGrade,
    displayCode: "OV",
    label: "공식 VLUER",
    ratePct: 0,
    payoutMode: "cash_commission" as const,
    canWithdraw: false,
    benefitLabel: "B2B 제휴 전용 · 일반 정산 제외",
    commerceSharePct: 0,
    commerceBenefitLabel: "쇼핑 커머스 제외",
    settlementExcluded: true
  }
} as const;

export function gradeSpec(grade: VluerGrade) {
  return VLUE_GRADE_SPEC[grade] ?? VLUE_GRADE_SPEC.general;
}

/** 쇼핑 커머스 VLUER 쉐어 — basis points (0.3% → 30bp) */
export function commerceVluerShareBp(grade: VluerGrade): number {
  return Math.round(gradeSpec(grade).commerceSharePct * 100);
}

/** @deprecated 자동 티어 산정 폐지 — 카운트만 참고용 */
export function totalMemberCount(downlineUsers: number, enterpriseCount: number): number {
  return Math.max(0, Math.floor(downlineUsers)) + Math.max(0, Math.floor(enterpriseCount));
}
