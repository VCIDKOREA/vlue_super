/** 디지털 인증명함 — 직책·부서 확인 서류 */

import { fitImageFile, IMAGE_FIT_DOC, IMAGE_FIT_READ_MAX_BYTES } from "./fitImageFile.js";

export const LETTERING_VERIFY_DOC_MAX_BYTES = 5 * 1024 * 1024;
export const LETTERING_VERIFY_DOC_ACCEPT = "application/pdf,image/png,image/jpeg,image/webp";
export const LETTERING_VERIFY_DOC_ACCEPT_LABEL = "PDF, PNG, JPG, WEBP";
export const LETTERING_VERIFY_DOC_MAX_AGE_DAYS = 31;

export const LETTERING_VERIFY_DOC_KINDS = [
  { id: "employment_certificate", label: "재직증명서" },
  { id: "insurance_enrollment", label: "4대보험 가입명부" },
  { id: "business_registration", label: "사업자등록증" }
];

export const LETTERING_SIGNUP_DOC_KINDS = [
  { id: "employment_certificate", label: "재직증명서 사본" },
  { id: "business_registration", label: "사업자등록증 사본" }
];

export const TITLE_DEPT_APPROVAL = {
  NONE: "",
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected"
};

export function isTitleDeptChangePending(ed = {}, title = "", department = "") {
  const status = String(ed.titleDeptApprovalStatus || "");
  const t = String(title ?? "").trim();
  const d = String(department ?? "").trim();
  const approvedT = String(ed.approvedTitle ?? "").trim();
  const approvedD = String(ed.approvedDepartment ?? "").trim();
  const pendingT = String(ed.titleDeptPendingTitle ?? approvedT).trim();
  const pendingD = String(ed.titleDeptPendingDepartment ?? approvedD).trim();

  if (status === TITLE_DEPT_APPROVAL.PENDING) {
    return t !== pendingT || d !== pendingD;
  }
  if (!approvedT && !approvedD && (t || d)) return Boolean(t || d);
  return t !== approvedT || d !== approvedD;
}

export function resolveDisplayTitleDepartment(ed = {}) {
  const status = String(ed.titleDeptApprovalStatus || "");
  const t = String(ed.title ?? "").trim();
  const d = String(ed.department ?? "").trim();
  if (status === TITLE_DEPT_APPROVAL.APPROVED) {
    return {
      title: String(ed.approvedTitle ?? t).trim(),
      department: String(ed.approvedDepartment ?? d).trim(),
      pending: false
    };
  }
  if (status === TITLE_DEPT_APPROVAL.PENDING) {
    return {
      title: String(ed.titleDeptPendingTitle ?? t).trim(),
      department: String(ed.titleDeptPendingDepartment ?? d).trim(),
      pending: true
    };
  }
  return { title: t, department: d, pending: false };
}

export function isVerifyDocIssuedWithinLimit(issuedAtRaw) {
  const raw = String(issuedAtRaw ?? "").trim();
  if (!raw) return false;
  const issued = new Date(raw);
  if (Number.isNaN(issued.getTime())) return false;
  const ageMs = Date.now() - issued.getTime();
  return ageMs >= 0 && ageMs <= LETTERING_VERIFY_DOC_MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
}

export async function prepareLetteringVerifyDocFromFile(file) {
  if (!file) return { ok: false, error: "서류 파일을 선택해 주세요." };

  const type = String(file.type || "").toLowerCase();
  const allowed = LETTERING_VERIFY_DOC_ACCEPT.split(",");
  if (!allowed.includes(type)) {
    return { ok: false, error: `${LETTERING_VERIFY_DOC_ACCEPT_LABEL}만 첨부할 수 있습니다.` };
  }

  if (type.startsWith("image/")) {
    const result = await fitImageFile(file, {
      ...IMAGE_FIT_DOC,
      maxBytes: Math.min(IMAGE_FIT_DOC.maxBytes, LETTERING_VERIFY_DOC_MAX_BYTES)
    });
    if (!result.ok) return result;
    return { ok: true, dataUrl: result.dataUrl, fileName: String(file.name || result.fileName || "verify-doc").trim() };
  }

  if (file.size > LETTERING_VERIFY_DOC_MAX_BYTES) {
    return { ok: false, error: `파일 크기는 ${Math.round(LETTERING_VERIFY_DOC_MAX_BYTES / (1024 * 1024))}MB 이하여야 합니다.` };
  }
  if (file.size > IMAGE_FIT_READ_MAX_BYTES) {
    return { ok: false, error: "파일이 너무 큽니다." };
  }

  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("파일을 읽지 못했습니다."));
    reader.readAsDataURL(file);
  });

  if (!dataUrl.startsWith("data:")) {
    return { ok: false, error: "파일 형식이 올바르지 않습니다." };
  }

  return { ok: true, dataUrl, fileName: String(file.name || "verify-doc").trim() };
}
