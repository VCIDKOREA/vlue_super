/**
 * 멤버십 만료일 (유료 결제 주기 종료일)
 * - cycleEndAt(서버) 우선
 * - 없으면 paidAt+주기 계산 (paidAt 없으면 표시 안 함 — 오늘 날짜로 갱신 금지)
 */

const CYCLE_KEY = "vlue_paid_billing_cycle";
const PAID_AT_KEY = "vlue_subscription_paid_at";
const CYCLE_END_KEY = "vlue_subscription_cycle_end_at";

function pad2(n) {
  return String(n).padStart(2, "0");
}

export function formatAuthValidityDate(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}.${pad2(date.getMonth() + 1)}.${pad2(date.getDate())}`;
}

export function readMembershipBillingCycle() {
  try {
    const raw = String(localStorage.getItem(CYCLE_KEY) || "").trim().toLowerCase();
    if (raw === "annual" || raw === "yearly" || raw === "year") return "annual";
    return "monthly";
  } catch {
    return "monthly";
  }
}

export function readMembershipPaidAt() {
  try {
    const raw = String(localStorage.getItem(PAID_AT_KEY) || "").trim();
    if (raw) {
      const d = new Date(raw);
      if (!Number.isNaN(d.getTime())) return d;
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function readMembershipCycleEndAt() {
  try {
    const raw = String(localStorage.getItem(CYCLE_END_KEY) || "").trim();
    if (raw) {
      const d = new Date(raw);
      if (!Number.isNaN(d.getTime())) return d;
    }
  } catch {
    /* ignore */
  }
  return null;
}

/**
 * @param {{ billingCycle?: string, paidAt?: Date|string|null, cycleEndAt?: Date|string|null }} [meta]
 */
export function writeMembershipBillingMeta(meta = {}) {
  try {
    if (meta.billingCycle != null) {
      const c = meta.billingCycle === "annual" ? "annual" : "monthly";
      localStorage.setItem(CYCLE_KEY, c);
    }
    if (meta.paidAt != null) {
      const d = meta.paidAt instanceof Date ? meta.paidAt : new Date(meta.paidAt);
      if (!Number.isNaN(d.getTime())) {
        localStorage.setItem(PAID_AT_KEY, d.toISOString());
      }
    }
    if (meta.cycleEndAt != null) {
      const d = meta.cycleEndAt instanceof Date ? meta.cycleEndAt : new Date(meta.cycleEndAt);
      if (!Number.isNaN(d.getTime())) {
        localStorage.setItem(CYCLE_END_KEY, d.toISOString());
      }
    }
  } catch {
    /* ignore */
  }
}

function addOneMonth(from) {
  const y = from.getFullYear();
  const m = from.getMonth();
  const day = from.getDate();
  const next = new Date(y, m + 1, 1);
  const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
  next.setDate(Math.min(day, lastDay));
  return next;
}

function addOneYear(from) {
  const next = new Date(from.getTime());
  next.setFullYear(next.getFullYear() + 1);
  return next;
}

function dayBefore(date) {
  const d = new Date(date.getTime());
  d.setDate(d.getDate() - 1);
  return d;
}

function parseDate(value) {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (value == null || value === "") return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * @param {{
 *   billingCycle?: 'monthly'|'annual',
 *   paidAt?: Date|string|null,
 *   cycleEndAt?: Date|string|null,
 *   validUntil?: Date|string|null,
 * }} [opts]
 * @returns {{ cycle: string, paidAt: Date|null, validUntil: Date|null, label: string, line: string, display: string } | null}
 */
export function resolveAuthValidityPeriod(opts = {}) {
  const cycle =
    opts.billingCycle === "annual" || opts.billingCycle === "monthly"
      ? opts.billingCycle
      : readMembershipBillingCycle();

  const explicitUntil = parseDate(opts.validUntil) || parseDate(opts.cycleEndAt) || readMembershipCycleEndAt();

  let paidAt =
    parseDate(opts.paidAt) || readMembershipPaidAt();

  let validUntil = explicitUntil;
  if (!validUntil && paidAt) {
    /* 결제 앵커가 있을 때만 계산 — Date.now() 폴백으로 매일 갱신하지 않음 */
    validUntil = cycle === "annual" ? addOneYear(paidAt) : dayBefore(addOneMonth(paidAt));
  }

  if (!validUntil) {
    return null;
  }

  const dateStr = formatAuthValidityDate(validUntil);
  /* 시작일 없이 종료일만 노출 → 만료일 */
  return {
    cycle,
    paidAt,
    validUntil,
    label: "만료일",
    line: dateStr,
    display: `만료일 : ${dateStr}`
  };
}

/** 명함 verificationItems 대체용 — 만료일 없으면 빈 배열 */
export function buildAuthValidityVerificationItems(opts = {}) {
  const v = resolveAuthValidityPeriod(opts);
  if (!v) return [];
  return [v.display];
}
