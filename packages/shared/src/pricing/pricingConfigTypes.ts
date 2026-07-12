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
      monthlyKrw: 14700,
      annualKrw: 147000,
      billingUnit: "per_line",
      minLines: 10,
      platforms: ["pc"],
      features: ["chat", "company_work", "internal_comms", "shopping_partial"],
      description:
        "회선당 월 14,700원(부가세 포함). PC 전용. 채팅·회사업무·사내소통·쇼핑(부분) 이용."
    },
    soho_activity: {
      sku: "soho_activity",
      label: "SOHO 활동형",
      monthlyKrw: 9900,
      annualKrw: 99000,
      billingUnit: "per_account",
      platforms: ["mobile", "web"],
      features: ["chat", "shopping", "digital_card_primary", "vluer_rewards"],
      description:
        "월 9,900원(부가세 포함). VLUE V1 출시 기념 65% 특별 할인(종료 시까지). 연 99,000원."
    },
    soho_broadcast_addon: {
      sku: "soho_broadcast_addon",
      label: "SOHO 영업 송출 옵션",
      monthlyKrw: 4200,
      annualKrw: 42000,
      billingUnit: "per_addon",
      platforms: ["mobile"],
      requiresPrimary: "soho_activity",
      features: ["digital_card_broadcast", "outbound_caller_id_overlay", "info_card_secondary"],
      description:
        "월 4,200원(부가세 포함) 추가. 등록·인증된 발신번호로 전화 시 수신 화면에 디지털인증명함 송출(Secondary)."
    }
  },
  legacy: {
    paidListMonthlyKrw: 28300,
    paidListAnnualKrw: 283000,
    referralDiscountRate: 0.3,
    personalComboAddonMonthlyKrw: 5100
  }
};

export function planAmountKrw(
  plan: PricingPlanConfig,
  cycle: "monthly" | "annual" = "monthly"
): number {
  return cycle === "annual" ? plan.annualKrw : plan.monthlyKrw;
}
