/** 요금제 중앙 설정 — API /api/pricing/config 와 동기화 */

import { apiUrl } from "./apiBase.js";

const DEFAULT = {
  version: 1,
  vatIncluded: true,
  currency: "KRW",
  plans: {
    b2b_full_package: {
      sku: "b2b_full_package",
      label: "B2B 풀 패키지",
      monthlyKrw: 14700,
      annualKrw: 147000,
      description:
        "회선당 월 14,700원(부가세 포함). PC 전용. 채팅·회사업무·사내소통·쇼핑(부분) 이용."
    },
    soho_activity: {
      sku: "soho_activity",
      label: "SOHO 활동형",
      monthlyKrw: 19800,
      annualKrw: 198000,
      description: "월 19,800원(부가세 포함). 모바일·웹 풀 기능. Primary 계정."
    },
    soho_broadcast_addon: {
      sku: "soho_broadcast_addon",
      label: "SOHO 영업 송출 옵션",
      monthlyKrw: 4200,
      annualKrw: 42000,
      description:
        "월 4,200원(부가세 포함) 추가. 등록·인증된 발신번호로 전화 시 수신 화면에 디지털인증명함 송출(Secondary)."
    }
  },
  legacy: {
    paidListMonthlyKrw: 28300,
    paidListAnnualKrw: 283000,
    referralDiscountRate: 0.3,
    personalComboAddonMonthlyKrw: 5100,
    personalComboAddonAnnualKrw: 51000
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
    sohoMonthly: cfg.plans.soho_activity.monthlyKrw,
    sohoAnnual: cfg.plans.soho_activity.annualKrw,
    broadcastMonthly: cfg.plans.soho_broadcast_addon.monthlyKrw,
    broadcastAnnual: cfg.plans.soho_broadcast_addon.annualKrw,
    paidListMonthly: cfg.legacy.paidListMonthlyKrw,
    paidListAnnual: cfg.legacy.paidListAnnualKrw,
    referralDiscountRate: cfg.legacy.referralDiscountRate,
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
