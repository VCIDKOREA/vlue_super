import type { VluerGrade } from "./vluerGradeTypes.js";
import { gradeSpec, VLUE_GRADE_SPEC } from "./tierPolicyConstants.js";

export type TierDisplayInfo = {
  code: string;
  label: string;
  commissionPct: number;
  tagline: string;
  commerceBenefitLabel: string;
  memberRange: string;
  payoutMode: "reward_only" | "cash_commission";
  canWithdraw: boolean;
  benefitLabel: string;
  grade: VluerGrade;
};

export const TIER_DISPLAY: Record<VluerGrade, TierDisplayInfo> = {
  general: {
    grade: "general",
    code: VLUE_GRADE_SPEC.general.displayCode,
    label: VLUE_GRADE_SPEC.general.label,
    commissionPct: VLUE_GRADE_SPEC.general.ratePct,
    tagline: `${VLUE_GRADE_SPEC.general.ratePct}% 포인트 리워드`,
    memberRange: "VLUER 활동",
    payoutMode: VLUE_GRADE_SPEC.general.payoutMode,
    canWithdraw: VLUE_GRADE_SPEC.general.canWithdraw,
    benefitLabel: VLUE_GRADE_SPEC.general.benefitLabel,
    commerceBenefitLabel: VLUE_GRADE_SPEC.general.commerceBenefitLabel
  },
  certified: {
    grade: "certified",
    code: VLUE_GRADE_SPEC.certified.displayCode,
    label: VLUE_GRADE_SPEC.certified.label,
    commissionPct: VLUE_GRADE_SPEC.certified.ratePct,
    tagline: `${VLUE_GRADE_SPEC.certified.ratePct}% 캐시 적립`,
    memberRange: "인증 VLUER",
    payoutMode: VLUE_GRADE_SPEC.certified.payoutMode,
    canWithdraw: VLUE_GRADE_SPEC.certified.canWithdraw,
    benefitLabel: VLUE_GRADE_SPEC.certified.benefitLabel,
    commerceBenefitLabel: VLUE_GRADE_SPEC.certified.commerceBenefitLabel
  },
  partner: {
    grade: "partner",
    code: VLUE_GRADE_SPEC.partner.displayCode,
    label: VLUE_GRADE_SPEC.partner.label,
    commissionPct: VLUE_GRADE_SPEC.partner.ratePct,
    tagline: `${VLUE_GRADE_SPEC.partner.ratePct}% 캐시 적립`,
    memberRange: "파트너 VLUER",
    payoutMode: VLUE_GRADE_SPEC.partner.payoutMode,
    canWithdraw: VLUE_GRADE_SPEC.partner.canWithdraw,
    benefitLabel: VLUE_GRADE_SPEC.partner.benefitLabel,
    commerceBenefitLabel: VLUE_GRADE_SPEC.partner.commerceBenefitLabel
  },
  official: {
    grade: "official",
    code: VLUE_GRADE_SPEC.official.displayCode,
    label: VLUE_GRADE_SPEC.official.label,
    commissionPct: 0,
    tagline: "B2B 제휴 · 일반 정산 제외",
    memberRange: "공식 VLUER",
    payoutMode: VLUE_GRADE_SPEC.official.payoutMode,
    canWithdraw: false,
    benefitLabel: VLUE_GRADE_SPEC.official.benefitLabel,
    commerceBenefitLabel: VLUE_GRADE_SPEC.official.commerceBenefitLabel
  }
};

export function tierCommissionRateBp(grade: VluerGrade): number {
  return gradeSpec(grade).ratePct * 100;
}
