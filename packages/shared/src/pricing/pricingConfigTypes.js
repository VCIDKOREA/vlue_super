export const DEFAULT_PRICING_CONFIG = {
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
            description: "비즈니스 / B2B 풀 패키지. 대표자 계정 28,300원 + 모바일 회선 월 14,100원(최초+추천인 CI 시 9,900원). 내선·대표번호 추가 월 5,200원."
        },
        soho_activity: {
            sku: "soho_activity",
            label: "유료 회원",
            monthlyKrw: 14100,
            annualKrw: 141000,
            billingUnit: "per_account",
            platforms: ["mobile", "web"],
            features: ["chat", "shopping", "digital_card_primary", "vluer_rewards"],
            description: "모바일 이벤트가 월 14,100원(정가 28,300원). 연 141,000원(2개월 추가 무료). 최초 가입+추천인 월 9,900원/연 99,000원. 재가입(CI)은 추천 할인 불가."
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
            description: "월 4,200원(부가세 포함) 추가. 등록·인증된 발신번호로 전화 시 수신 화면에 디지털인증명함 송출(Secondary). 동일 단가로 멀티 프로필+ 추가 슬롯에도 적용."
        }
    },
    legacy: {
        paidListMonthlyKrw: 28300,
        paidListAnnualKrw: 339600,
        referralDiscountRate: 4200,
        personalComboAddonMonthlyKrw: 5100,
        personalComboAddonAnnualKrw: 51000,
        b2bRepListMonthlyKrw: 28300,
        b2bStaffListMonthlyKrw: 14700,
        mobilePromoMonthlyKrw: 14100,
        mobilePromoAnnualKrw: 141000,
        referralMonthlyKrw: 9900,
        referralAnnualKrw: 99000
    }
};
export function planAmountKrw(plan, cycle = "monthly") {
    return cycle === "annual" ? plan.annualKrw : plan.monthlyKrw;
}
