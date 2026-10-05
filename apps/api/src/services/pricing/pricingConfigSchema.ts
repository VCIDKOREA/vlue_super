/** API 로컬 — @vlue/shared 와 동기화 (tsc paths rootDir 회피) */

export type PricingPlanSku = "b2b_full_package" | "soho_activity" | "soho_broadcast_addon";

export type PricingPlanConfig = {
  sku: PricingPlanSku;
  label: string;
  monthlyKrw: number;
  annualKrw: number;
  billingUnit: "per_line" | "per_account" | "per_addon";
  minLines?: number;
  platforms: string[];
  features: string[];
  requiresPrimary?: PricingPlanSku;
  description: string;
};

export type PricingConfigLegacy = {
  paidListMonthlyKrw: number;
  paidListAnnualKrw: number;
  referralDiscountRate: number;
  personalComboAddonMonthlyKrw: number;
  /** B2B 대표자 계정 정가(표시용) */
  b2bRepListMonthlyKrw?: number;
  /** B2B 직원 회선 정가(취소선 표시용) */
  b2bStaffListMonthlyKrw?: number;
  mobilePromoMonthlyKrw?: number;
  mobilePromoAnnualKrw?: number;
  referralMonthlyKrw?: number;
  referralAnnualKrw?: number;
  /** 무료 회원 이메일 혜택 feature 키 */
  freeTierFeatures?: string[];
  /** 무료 회원 이메일 혜택 문구 */
  freeTierEmailNote?: string;
};

export type PricingConfigFile = {
  version: number;
  vatIncluded: boolean;
  currency: "KRW";
  updatedAt: string;
  updatedBy: string;
  plans: Record<PricingPlanSku, PricingPlanConfig>;
  legacy: PricingConfigLegacy;
};

export const DEFAULT_PRICING_CONFIG: PricingConfigFile = {
  version: 1,
  vatIncluded: true,
  currency: "KRW",
  updatedAt: new Date(0).toISOString(),
  updatedBy: "system",
  plans: {
    b2b_full_package: {
      sku: "b2b_full_package",
      label: "B2B 풀 패키지",
      monthlyKrw: 14100,
      annualKrw: 141000,
      billingUnit: "per_line",
      minLines: 1,
      platforms: ["mobile", "web", "pc"],
      features: ["showcase", "digital_cert_card", "caller_id_overlay"],
      description:
        "비즈니스 / B2B 풀 패키지. 대표자 계정 28,300원 + 모바일 회선(직원·개인 무관) 월 14,100원(최초+추천인 CI 시 9,900원). 내선·대표번호 추가 월 5,200원(추천인 할인 불가)."
    },
    soho_activity: {
      sku: "soho_activity",
      label: "유료 회원",
      monthlyKrw: 14100,
      annualKrw: 141000,
      billingUnit: "per_account",
      platforms: ["mobile", "web"],
      features: ["showcase_full", "digital_cert_card", "family_protection"],
      description:
        "모바일 이벤트가 월 14,100원(정가 28,300원). 연간 141,000원(2개월 추가 무료). 최초 가입+추천인 코드 시 월 9,900원/연 99,000원. 재가입(CI)은 추천 할인 불가."
    },
    soho_broadcast_addon: {
      sku: "soho_broadcast_addon",
      label: "내선·대표번호 추가",
      monthlyKrw: 5200,
      annualKrw: 52000,
      billingUnit: "per_addon",
      platforms: ["mobile"],
      requiresPrimary: "soho_activity",
      features: ["showcase_extra_number"],
      description:
        "내선·대표번호 추가 개당 월 5,200원(추천인 할인 불가). 대표자 모바일 기본 플랜 결제 후 발급."
    }
  },
  legacy: {
    paidListMonthlyKrw: 28300,
    paidListAnnualKrw: 339600,
    referralDiscountRate: 4200,
    personalComboAddonMonthlyKrw: 5100,
    b2bRepListMonthlyKrw: 28300,
    b2bStaffListMonthlyKrw: 14700,
    mobilePromoMonthlyKrw: 14100,
    mobilePromoAnnualKrw: 141000,
    referralMonthlyKrw: 9900,
    referralAnnualKrw: 99000
  }
};
