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
      label: "유료 회원 (V1)",
      monthlyKrw: 9900,
      annualKrw: 99000,
      listMonthlyKrw: 28300,
      description:
        "월 9,900원(부가세 포함). VLUE V1 출시 기념 파격 65% 특별 할인(종료 시까지!). 연간 구독 시 2개월 추가 무료 혜택: 연 99,000원. 디지털 인증명함·풀 쇼케이스·가족보호."
    },
    soho_broadcast_addon: {
      sku: "soho_broadcast_addon",
      label: "SOHO 영업 송출 옵션",
      monthlyKrw: 4200,
      annualKrw: 42000,
      description:
        "월 +4,200원(부가세 포함, 할인 적용 안 됨). 대표자 계정 외 추가번호에 쇼케이스만 제공되는 기능."
    }
  },
  legacy: {
    paidListMonthlyKrw: 28300,
    paidListAnnualKrw: 283000,
    referralDiscountRate: 0,
    personalComboAddonMonthlyKrw: 5100,
    personalComboAddonAnnualKrw: 51000,
    b2bRepListMonthlyKrw: 28300,
    b2bStaffListMonthlyKrw: 14700
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
