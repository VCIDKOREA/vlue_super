/**
 * 멤버십 인증유효기간
 * - 월결제: 다음 결제(갱신)일 전날
 * - 연결제(1년): 결제일부터 1년
 */

const CYCLE_KEY = "vlue_paid_billing_cycle";
const PAID_AT_KEY = "vlue_subscription_paid_at";

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

export function writeMembershipBillingMeta({ billingCycle, paidAt } = {}) {
  try {
    if (billingCycle != null) {
      const c = billingCycle === "annual" ? "annual" : "monthly";
      localStorage.setItem(CYCLE_KEY, c);
    }
    if (paidAt != null) {
      const d = paidAt instanceof Date ? paidAt : new Date(paidAt);
      if (!Number.isNaN(d.getTime())) {
        localStorage.setItem(PAID_AT_KEY, d.toISOString());
      }
    }
  } catch {
    /* ignore */
  }
}

/** 같은 일자 기준 한 달 뒤 (말일 보정) */
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

/**
 * @param {{ billingCycle?: 'monthly'|'annual', paidAt?: Date|string|null, now?: Date }} [opts]
 * @returns {{ cycle: 'monthly'|'annual', paidAt: Date, validUntil: Date, label: string, line: string }}
 */
export function resolveAuthValidityPeriod(opts = {}) {
  const cycle =
    opts.billingCycle === "annual" || opts.billingCycle === "monthly"
      ? opts.billingCycle
      : readMembershipBillingCycle();
  let paidAt =
    opts.paidAt instanceof Date
      ? opts.paidAt
      : opts.paidAt
        ? new Date(opts.paidAt)
        : readMembershipPaidAt();
  if (!paidAt || Number.isNaN(paidAt.getTime())) {
    paidAt = opts.now instanceof Date ? new Date(opts.now.getTime()) : new Date();
  }

  const validUntil =
    cycle === "annual" ? addOneYear(paidAt) : dayBefore(addOneMonth(paidAt));

  const dateStr = formatAuthValidityDate(validUntil);
  return {
    cycle,
    paidAt,
    validUntil,
    label: "인증유효기간",
    line: dateStr,
    display: `인증유효기간 : ${dateStr}`
  };
}

/** 명함 verificationItems 대체용 */
export function buildAuthValidityVerificationItems(opts = {}) {
  const v = resolveAuthValidityPeriod(opts);
  return [v.display];
}
