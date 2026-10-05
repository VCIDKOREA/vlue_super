/** 요금제 중앙 설정 — API /api/pricing/config 와 동기화 (V1) */

import { apiUrl } from "./apiBase.js";

const DEFAULT = {
  version: 1,
  vatIncluded: true,
  currency: "KRW",
  plans: {
    b2b_full_package: {
      sku: "b2b_full_package",
      label: "B2B 풀 패키지",
      monthlyKrw: 5200,
      annualKrw: 52000,
      listMonthlyKrw: 14700,
      description:
        "비즈니스 / B2B 풀 패키지. 대표자 계정 28,300원 + 직원 회선 정가 14,700원 → 이벤트 5,200원(종료시까지). 회선 단위 블루 쇼케이스·디지털 인증명함."
    },
    soho_activity: {
      sku: "soho_activity",
      label: "유료 회원",
      monthlyKrw: 14100,
      annualKrw: 141000,
      listMonthlyKrw: 28300,
      description:
        "모바일 이벤트가 월 14,100원(정가 28,300원). 연 141,000원(2개월 추가 무료). 최초 가입+추천인 코드 시 월 9,900원/연 99,000원. 재가입(본인인증 CI)은 추천 할인 불가."
    },
    soho_broadcast_addon: {
      sku: "soho_broadcast_addon",
      label: "내선·대표번호 추가(레거시 SKU)",
      monthlyKrw: 5200,
      annualKrw: 52000,
      description:
        "내선·대표번호 추가 개당 월 5,200원(추천인 할인 불가). 대표자 모바일 기본 플랜 결제 후 발급."
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

let cache = null;
let inflight = null;

export function getPricingConfigSync() {
  return cache || DEFAULT;
}

export function pricingNumbers() {
  const cfg = getPricingConfigSync();
  return {
    b2bMonthly: cfg.plans.b2b_full_package.monthlyKrw,
    b2bAnnual: cfg.plans.b2b_full_package.annualKrw,
    b2bStaffListMonthly: cfg.legacy.b2bStaffListMonthlyKrw ?? 14700,
    b2bRepListMonthly: cfg.legacy.b2bRepListMonthlyKrw ?? 28300,
    sohoMonthly: cfg.plans.soho_activity.monthlyKrw,
    sohoAnnual: cfg.plans.soho_activity.annualKrw,
    broadcastMonthly: cfg.plans.soho_broadcast_addon.monthlyKrw,
    broadcastAnnual: cfg.plans.soho_broadcast_addon.annualKrw,
    paidListMonthly: cfg.legacy.paidListMonthlyKrw,
    paidListAnnual: cfg.legacy.paidListAnnualKrw,
    referralDiscountRate: cfg.legacy.referralDiscountRate,
    referralMonthly: cfg.legacy.referralMonthlyKrw ?? 9900,
    referralAnnual: cfg.legacy.referralAnnualKrw ?? 99000,
    personalComboMonthly: cfg.legacy.personalComboAddonMonthlyKrw,
    personalComboAnnual: cfg.legacy.personalComboAddonAnnualKrw ?? 51000
  };
}

export async function fetchPricingConfig({ force = false } = {}) {
  if (!force && cache) return cache;
  if (!force && inflight) return inflight;
  inflight = fetch(apiUrl("/api/pricing/config"))
    .then(async (res) => {
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.config) throw new Error(data.error || "요금 설정 조회 실패");
      cache = data.config;
      return cache;
    })
    .catch(() => {
      cache = cache || DEFAULT;
      return cache;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

export async function ensurePricingConfigLoaded() {
  return fetchPricingConfig();
}

export function setPricingConfigLocal(config) {
  cache = config;
}
