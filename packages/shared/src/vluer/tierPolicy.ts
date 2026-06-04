import type { VluerGrade } from "./vluerGradeTypes.js";

const SPECS = {
  general: { ratePct: 5, payoutMode: "reward_only" as const, settlementExcluded: false },
  certified: { ratePct: 10, payoutMode: "cash_commission" as const, settlementExcluded: false },
  partner: { ratePct: 15, payoutMode: "cash_commission" as const, settlementExcluded: false },
  official: { ratePct: 0, payoutMode: "cash_commission" as const, settlementExcluded: true }
} as const;

export function gradeSpec(grade: VluerGrade) {
  return SPECS[grade] ?? SPECS.general;
}
