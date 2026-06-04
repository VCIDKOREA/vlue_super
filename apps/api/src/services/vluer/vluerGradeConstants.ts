import type { VluerGrade } from "./vluerGradeTypes.js";

/** 서버 전용 — API 응답에 그대로 노출하지 않음 (다단계 오해 방지) */
export const VLUE_GRADE_THRESHOLDS = {
  certifiedMinPaidReferrals: 50,
  certifiedMaxPaidReferrals: 999,
  partnerMinPaidReferrals: 1000
} as const;

export const PAID_LIST_PRICE_MONTHLY_KRW = 28_300;

export const VLUE_GRADE_LABELS: Record<VluerGrade, string> = {
  general: "일반 VLUER",
  certified: "인증 VLUER",
  partner: "파트너 VLUER",
  official: "공식 VLUER"
};

export const VLUE_GRADE_DISPLAY_CODE: Record<VluerGrade, string> = {
  general: "VLUER",
  certified: "CV",
  partner: "PV",
  official: "OV"
};
