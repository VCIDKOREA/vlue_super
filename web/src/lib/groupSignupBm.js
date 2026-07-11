/** 단체(10회선+) — 가입 시 즉시 B2B 요금 또는 개인 가입 후 익월 단체 전환 */

import { resolveMasterDisplayNumber, validateCompanyContact } from "./b2bCompanyContact.js";
import { normalizeLineEnterpriseRoles, validateLineEnterpriseRoles } from "./enterpriseRoles.js";
import { pricingNumbers } from "./pricingConfig.js";

export { COMPANY_CONTACT_TYPES, B2B_ADMIN_VERIFY_NOTICE } from "./b2bCompanyContact.js";

export const GROUP_SIGNUP_MIN_LINES = 10;
export function groupMonthlyPerLineKrw() {
  return pricingNumbers().b2bMonthly;
}

export function groupAnnualPerLineKrw() {
  return pricingNumbers().b2bAnnual;
}

/** @deprecated — groupMonthlyPerLineKrw() 사용 */
export const GROUP_MONTHLY_PER_LINE_KRW = 5_200;
export const GROUP_ANNUAL_PER_LINE_KRW = GROUP_MONTHLY_PER_LINE_KRW * 10;
export const GROUP_SIGNUP_STORAGE_KEY = "vlue_group_signup_draft_v1";

/** 가입 단계에서 「단체 가입」을 선택한 경우 */
export function groupSignupAtRegistrationNotice() {
  const n = pricingNumbers();
  const staffList = n.b2bStaffListMonthly ?? 14700;
  return `B2B 풀 패키지: 대표자 계정 월 ${n.paidListMonthly.toLocaleString("ko-KR")}원 + 직원 회선 정가 ${staffList.toLocaleString("ko-KR")}원 → 이벤트 ${n.b2bMonthly.toLocaleString("ko-KR")}원(종료시까지). 회선 단위 블루 쇼케이스·디지털 인증명함.`;
}

export const GROUP_SIGNUP_AT_REGISTRATION_NOTICE =
  "B2B 풀 패키지: 대표자 계정 월 28,300원 + 직원 회선 정가 14,700원 → 이벤트 5,200원(종료시까지). 회선 단위 블루 쇼케이스·디지털 인증명함.";

/** 개인 유료 가입 후 단체 전환 안내 */
export const INDIVIDUAL_TO_GROUP_CONVERSION_NOTICE =
  "개인 유료(월 9,900원)로 먼저 가입·이용하신 뒤, 마이페이지에서 B2B 회선을 등록해 단체로 전환할 수 있습니다. 직원 회선 이벤트 요금(5,200원)은 단체 등록 완료 후 익월 결제 주기부터 적용됩니다.";

/** @deprecated — GROUP_SIGNUP_AT_REGISTRATION_NOTICE 사용 */
export const GROUP_SIGNUP_NOTICE = GROUP_SIGNUP_AT_REGISTRATION_NOTICE;

export function emptyGroupSignupDraft() {
  return {
    enabled: false,
    companyName: "",
    companyContactType: "company_rep",
    masterRepNumber: "",
    masterAssigneeName: "",
    masterAssigneeTitle: "",
    repExtensionMain: "",
    repExtensionNo: "",
    carrier: "LGUPLUS",
    /** 접수 회선 수(VLUE 인증번호 포함) — 10 이상 */
    plannedLineCount: 10,
    vlueAuthPhoneHint: "",
    lines: []
  };
}

export function countGroupBillableLines(draft) {
  if (!draft?.enabled) return 0;
  const planned = Math.floor(Number(draft.plannedLineCount) || 0);
  if (planned >= GROUP_SIGNUP_MIN_LINES) return planned;
  return 1 + (draft.lines?.length || 0);
}

/** VLUE 인증 1회선 제외 — 직원 회선 입력 칸 수 */
export function employeeLineSlotCount(plannedLineCount) {
  const planned = Math.max(GROUP_SIGNUP_MIN_LINES, Math.floor(Number(plannedLineCount) || 0));
  return Math.max(0, planned - 1);
}

function newLineId() {
  return `gl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function newEmployeeLine(kind = "extension") {
  return {
    id: newLineId(),
    kind: kind === "mobile" ? "mobile" : "extension",
    phone: "",
    assigneeName: "",
    assigneeTitle: "",
    enterpriseRole: "STAFF"
  };
}

/** 접수 회선 수 변경 시 직원 칸을 정확히 맞춤 (추가·삭제 버튼 없음) */
export function resizeEmployeeLines(existingLines, plannedLineCount) {
  const target = employeeLineSlotCount(plannedLineCount);
  const current = Array.isArray(existingLines) ? existingLines : [];
  if (current.length === target) return current;
  if (current.length > target) return current.slice(0, target);
  const extra = Array.from({ length: target - current.length }, () => newEmployeeLine());
  return [...current, ...extra];
}

export function syncDraftToPlannedLineCount(draft) {
  const planned = Math.max(GROUP_SIGNUP_MIN_LINES, Math.floor(Number(draft.plannedLineCount) || GROUP_SIGNUP_MIN_LINES));
  const lines = normalizeLineEnterpriseRoles(resizeEmployeeLines(draft.lines, planned));
  return {
    ...draft,
    plannedLineCount: planned,
    lines
  };
}

export function groupLineTotalKrw(lineCount, billingCycle, { hasReferral = false } = {}) {
  const n = nums();
  const nLines = Math.max(0, lineCount);
  if (nLines === 0) return 0;
  const subUnit = billingCycle === "annual" ? n.b2bAnnual : n.b2bMonthly;
  if (hasReferral) return nLines * subUnit;
  const master = billingCycle === "annual" ? n.paidListAnnual : n.paidListMonthly;
  const subs = Math.max(0, nLines - 1);
  return master + subs * subUnit;
}

function nums() {
  return pricingNumbers();
}

export function buildGroupPaymentPreview(billingCycle, lineCount, { hasReferral = false } = {}) {
  const lines = Math.max(0, lineCount);
  const amountKrw = groupLineTotalKrw(lines, billingCycle, { hasReferral });
  const n = nums();
  const subUnit = billingCycle === "annual" ? n.b2bAnnual : n.b2bMonthly;
  const masterUnit = billingCycle === "annual" ? n.paidListAnnual : n.paidListMonthly;
  const cycleLabel = billingCycle === "annual" ? "1년 구독" : "월결제";
  const employeeCount = Math.max(0, lines - 1);
  return {
    amountKrw,
    amountLabel: `${amountKrw.toLocaleString("ko-KR")}원`,
    lineCount: lines,
    masterUnitLabel: `${masterUnit.toLocaleString("ko-KR")}원`,
    subUnitLabel: `${subUnit.toLocaleString("ko-KR")}원`,
    unitLabel: hasReferral
      ? `전 회선 ${subUnit.toLocaleString("ko-KR")}원`
      : `대표 ${masterUnit.toLocaleString("ko-KR")}원 · 하부 ${subUnit.toLocaleString("ko-KR")}원`,
    cycleLabel,
    badges: ["단체 B2B", `${lines}회선`, billingCycle === "annual" ? "2개월 무료" : null].filter(Boolean),
    detailLine: hasReferral
      ? `VLUE 인증 1 + 직원 ${employeeCount} · 전 회선 단체 요금 · ${cycleLabel}`
      : `대표 ${masterUnit.toLocaleString("ko-KR")}원 + 직원 ${employeeCount}×${subUnit.toLocaleString("ko-KR")}원(이벤트) · ${cycleLabel}`,
    hasReferral,
    canCheckout: lines >= GROUP_SIGNUP_MIN_LINES
  };
}

function digitsOnly(raw) {
  return String(raw || "").replace(/\D/g, "");
}

export function validateGroupSignupDraft(draft) {
  if (!draft?.enabled) return { ok: true };
  const company = String(draft.companyName || "").trim();
  if (!company) {
    return { ok: false, message: "단체 가입: 상호(기업명)를 입력해 주세요." };
  }
  const contactV = validateCompanyContact(draft);
  if (!contactV.ok) return contactV;
  const total = countGroupBillableLines(draft);
  if (total < GROUP_SIGNUP_MIN_LINES) {
    return {
      ok: false,
      message: `기업 단체: 회선 수는 ${GROUP_SIGNUP_MIN_LINES}회선 이상이어야 합니다. (현재 ${total}회선)`
    };
  }
  const slots = employeeLineSlotCount(draft.plannedLineCount);
  const lines = draft.lines || [];
  if (lines.length !== slots) {
    return {
      ok: false,
      message: `직원 회선은 ${slots}칸이어야 합니다. (접수 ${total}회선 = VLUE 1 + 직원 ${slots})`
    };
  }
  const roleV = validateLineEnterpriseRoles(lines);
  if (!roleV.ok) return roleV;
  for (let i = 0; i < lines.length; i += 1) {
    const row = lines[i];
    const phone = digitsOnly(row.phone);
    if (phone.length < 9) {
      return { ok: false, message: `단체 가입: ${i + 1}번째 회선 번호를 확인해 주세요.` };
    }
    if (!String(row.assigneeName || "").trim()) {
      return { ok: false, message: `단체 가입: ${i + 1}번째 회선 담당자명을 입력해 주세요.` };
    }
  }
  return { ok: true };
}

/** API·저장용 직렬화 */
export function serializeGroupSignupForApi(draft) {
  if (!draft?.enabled) return null;
  return {
    companyName: String(draft.companyName || "").trim(),
    companyContactType: draft.companyContactType || "company_rep",
    masterDisplayNumber: resolveMasterDisplayNumber(draft),
    repExtensionMain: String(draft.repExtensionMain || "").trim() || undefined,
    repExtensionNo: String(draft.repExtensionNo || "").trim() || undefined,
    carrier: draft.carrier === "KT" ? "KT" : "LGUPLUS",
    plannedLineCount: countGroupBillableLines(draft),
    lines: (draft.lines || []).map((row) => ({
      lineKind: row.kind === "mobile" ? "mobile" : "extension",
      realCliPhone: String(row.phone || "").trim(),
      assigneeName: String(row.assigneeName || "").trim(),
      assigneeTitle: String(row.assigneeTitle || "").trim() || undefined,
      enterpriseRole: row.enterpriseRole || "STAFF",
      useMasterDisplayNumber: false
    }))
  };
}

export function readGroupSignupDraftFromStorage() {
  try {
    const raw = localStorage.getItem(GROUP_SIGNUP_STORAGE_KEY);
    if (!raw) return emptyGroupSignupDraft();
    const parsed = JSON.parse(raw);
    const base = { ...emptyGroupSignupDraft(), ...parsed, lines: Array.isArray(parsed?.lines) ? parsed.lines : [] };
    return base.enabled ? syncDraftToPlannedLineCount(base) : base;
  } catch {
    return emptyGroupSignupDraft();
  }
}

export function writeGroupSignupDraftToStorage(draft) {
  try {
    localStorage.setItem(GROUP_SIGNUP_STORAGE_KEY, JSON.stringify(draft));
  } catch {
    /* ignore */
  }
}
