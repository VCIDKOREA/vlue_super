/** 기업(B2B) — 대표자 인증·고객 표시 연락처 */

import { isStaffLineOutbound } from "./phoneOutboundRules.js";

export const COMPANY_CONTACT_TYPES = {
  COMPANY_REP: "company_rep",
  REP_MOBILE: "rep_mobile",
  REP_EXTENSION: "rep_extension"
};

export const B2B_ADMIN_VERIFY_NOTICE =
  "대표자(관리자)는 반드시 PASS 본인인증(대표자 휴대폰)을 완료해야 합니다. 회사 대표번호가 있으면 함께 등록할 수 있습니다.";

export const COMPANY_CONTACT_OPTIONS = [
  {
    id: COMPANY_CONTACT_TYPES.COMPANY_REP,
    title: "회사 대표번호가 있어요",
    sub: "1588·070 등 고객에게 안내하는 번호를 등록합니다. 대표자는 PASS(휴대폰)로 인증합니다."
  },
  {
    id: COMPANY_CONTACT_TYPES.REP_MOBILE,
    title: "대표번호 없음 · 대표자 휴대로 안내",
    sub: "PASS 본인인증 휴대폰이 VLUE 인증번호이자 고객에게 표시되는 연락처입니다."
  },
  {
    id: COMPANY_CONTACT_TYPES.REP_EXTENSION,
    title: "대표번호 없음 · 대표 내선으로 안내",
    sub: "사옥 대표전화 + 대표자 내선번호를 등록합니다. 대표자는 PASS(휴대폰)로 인증합니다."
  }
];

function digitsOnly(raw) {
  return String(raw || "").replace(/\D/g, "");
}

/** 고객·명함에 표시할 대표 연락처 문자열 */
export function resolveMasterDisplayNumber(draft) {
  const type = draft?.companyContactType || COMPANY_CONTACT_TYPES.COMPANY_REP;
  if (type === COMPANY_CONTACT_TYPES.REP_MOBILE) {
    return String(draft.vlueAuthPhoneHint || "").trim();
  }
  if (type === COMPANY_CONTACT_TYPES.REP_EXTENSION) {
    const main = digitsOnly(draft.repExtensionMain);
    const ext = String(draft.repExtensionNo || "").trim();
    if (!main) return "";
    return ext ? `${main} 내선 ${ext}` : main;
  }
  return String(draft.masterRepNumber || "").trim();
}

export function validateCompanyContact(draft) {
  const type = draft?.companyContactType || COMPANY_CONTACT_TYPES.COMPANY_REP;
  if (type === COMPANY_CONTACT_TYPES.COMPANY_REP) {
    const rep = String(draft.masterRepNumber || "").trim();
    if (rep.replace(/\D/g, "").length < 4) {
      return { ok: false, message: "회사 대표번호를 입력해 주세요. (없으면 「대표번호 없음」 옵션을 선택하세요)" };
    }
    if (isStaffLineOutbound(rep)) {
      const name = String(draft.masterAssigneeName || "").trim();
      const title = String(draft.masterAssigneeTitle || "").trim();
      if (!name) {
        return { ok: false, message: "지역번호 대표전화는 담당자 성명을 입력해 주세요." };
      }
      if (!title) {
        return { ok: false, message: "지역번호 대표전화는 담당자 직책·부서를 입력해 주세요." };
      }
    }
    return { ok: true };
  }
  if (type === COMPANY_CONTACT_TYPES.REP_MOBILE) {
    return { ok: true };
  }
  if (type === COMPANY_CONTACT_TYPES.REP_EXTENSION) {
    const main = digitsOnly(draft.repExtensionMain);
    const ext = String(draft.repExtensionNo || "").trim();
    if (main.length < 8) {
      return { ok: false, message: "대표 내선: 사옥 대표전화(국번)를 입력해 주세요." };
    }
    if (!ext || ext.length < 2) {
      return { ok: false, message: "대표 내선번호를 입력해 주세요." };
    }
    return { ok: true };
  }
  return { ok: false, message: "고객 연락처 유형을 선택해 주세요." };
}
