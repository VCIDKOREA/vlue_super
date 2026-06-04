import { normalizeToE164KR } from "./phoneE164.js";

export type CompanyContactType = "company_rep" | "rep_mobile" | "rep_extension";

function digitsOnly(raw: string) {
  return String(raw || "").replace(/\D/g, "");
}

/** E.164 → 010-1234-5678 표시 */
export function formatPhoneKrDisplay(e164: string | null | undefined): string {
  const normalized = normalizeToE164KR(String(e164 || ""));
  if (!normalized) return String(e164 || "").trim();
  const d = normalized.replace(/\D/g, "");
  if (d.startsWith("82") && d.length >= 11) {
    const local = `0${d.slice(2)}`;
    if (local.length === 11) {
      return `${local.slice(0, 3)}-${local.slice(3, 7)}-${local.slice(7)}`;
    }
  }
  return normalized;
}

export function resolveMasterDisplayNumber(
  payload: {
    companyContactType?: string | null;
    masterDisplayNumber?: string | null;
    repExtensionMain?: string | null;
    repExtensionNo?: string | null;
  },
  adminPhoneE164?: string | null
): string {
  const type = (payload.companyContactType || "company_rep") as CompanyContactType;
  if (type === "rep_mobile") {
    const fromClient = String(payload.masterDisplayNumber || "").trim();
    if (fromClient.replace(/\D/g, "").length >= 9) return fromClient;
    return formatPhoneKrDisplay(adminPhoneE164);
  }
  if (type === "rep_extension") {
    const main = digitsOnly(payload.repExtensionMain || "");
    const ext = String(payload.repExtensionNo || "").trim();
    if (!main) return String(payload.masterDisplayNumber || "").trim();
    return ext ? `${main} 내선 ${ext}` : main;
  }
  return String(payload.masterDisplayNumber || "").trim();
}

export function assertCompanyContactPayload(
  payload: {
    companyContactType?: string | null;
    masterDisplayNumber?: string | null;
    repExtensionMain?: string | null;
    repExtensionNo?: string | null;
  },
  adminPhoneE164?: string | null
) {
  const type = (payload.companyContactType || "company_rep") as CompanyContactType;
  if (type === "company_rep") {
    const display = resolveMasterDisplayNumber(payload, adminPhoneE164);
    if (display.replace(/\D/g, "").length < 4) {
      throw new Error("회사 대표번호를 입력해 주세요. 대표번호가 없으면 「대표번호 없음」 옵션을 선택하세요.");
    }
    return;
  }
  if (type === "rep_mobile") {
    assertAdminPhoneForRepMobile(adminPhoneE164);
    return;
  }
  if (type === "rep_extension") {
    const main = digitsOnly(payload.repExtensionMain || "");
    const ext = String(payload.repExtensionNo || "").trim();
    if (main.length < 8 || ext.length < 2) {
      throw new Error("대표 내선: 사옥 대표전화와 내선번호를 입력해 주세요.");
    }
    return;
  }
  throw new Error("고객 연락처 유형이 올바르지 않습니다.");
}

function assertAdminPhoneForRepMobile(adminPhoneE164: string | null | undefined) {
  const e164 = normalizeToE164KR(String(adminPhoneE164 || ""));
  if (!e164) {
    throw new Error("대표자 휴대폰: PASS 본인인증(대표자)이 필요합니다.");
  }
}
