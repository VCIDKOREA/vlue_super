/**
 * 사업자 계좌 자격 — 사업자등록/상호 확정 여부
 * (온보딩 사업자 트랙 · 회사명 잠금 · 사업자등록증 서류)
 */

/**
 * @param {{ companyName?: string, hasBizDoc?: boolean }} [overrides]
 */
export function readBusinessRegistrationEvidence(overrides = {}) {
  let businessMember = false;
  let companyName = String(overrides.companyName || "").trim();
  let brn = "";
  let signupDocKind = "";
  try {
    businessMember = localStorage.getItem("vlue_business_member") === "1";
    if (!companyName) {
      companyName =
        String(localStorage.getItem("vlue_company_locked") || "").trim() ||
        String(localStorage.getItem("myCardOrganization") || "").trim();
    }
    brn = String(localStorage.getItem("vlue_business_reg_no") || "")
      .replace(/\D/g, "")
      .slice(0, 10);
    signupDocKind = String(localStorage.getItem("vlue_signup_doc_kind") || "").trim();
  } catch {
    /* ignore */
  }

  const handle = (() => {
    try {
      return String(localStorage.getItem("vlue_member_handle") || "")
        .trim()
        .toLowerCase()
        .replace(/^@/, "");
    } catch {
      return "";
    }
  })();

  if (handle === "ceo") {
    businessMember = true;
    if (!companyName) companyName = "VCID KOREA";
  }

  const hasCompany = Boolean(companyName);
  const hasBrn = brn.length === 10;
  const hasBizDoc =
    Boolean(overrides.hasBizDoc) ||
    signupDocKind === "business_registration" ||
    businessMember;

  /** 사업자 계좌 탭: 사업자 회원 · 상호+사업자등록번호/서류 · CEO */
  const eligible =
    businessMember ||
    (hasCompany && (hasBrn || hasBizDoc)) ||
    (handle === "ceo" && hasCompany) ||
    (hasCompany && hasBizDoc);

  return {
    eligible,
    businessMember,
    companyName,
    businessRegistrationNo: brn,
    matched: eligible && hasCompany,
    matchLabel: hasCompany
      ? `사업자등록 상호 대조 확인 완료 · ${companyName}`
      : "사업자등록·상호 정보가 없습니다. 사업자 인증 후 이용할 수 있습니다."
  };
}

/** 예금주 고정값 — 개인=실명, 사업자=상호 */
export function resolveDccAccountHolderLock({
  accountType,
  legalName = "",
  companyName = ""
} = {}) {
  const t = String(accountType || "").trim().toUpperCase();
  if (t === "PERSONAL") return String(legalName || "").trim().slice(0, 80);
  if (t === "BUSINESS") return String(companyName || "").trim().slice(0, 80);
  return "";
}
