/** 명함 직책 — 인증된 값만 노출 (클라이언트 데모: 기업 메일 / 마스터 승인 버튼) */

export const JOB_TITLE_KEY = "vlue_card_job_title";
export const JOB_VERIFIED_KEY = "vlue_card_job_verified";
export const JOB_VERIFY_METHOD_KEY = "vlue_card_job_verify_method";
export const JOB_NO_TITLE_KEY = "vlue_card_no_job_title";

export function readJobTitleRaw() {
  try {
    return String(localStorage.getItem(JOB_TITLE_KEY) || localStorage.getItem("myCardJobTitle") || "").trim();
  } catch {
    return "";
  }
}

export function readJobTitleVerified() {
  try {
    return localStorage.getItem(JOB_VERIFIED_KEY) === "1";
  } catch {
    return false;
  }
}

export function readJobVerifyMethod() {
  try {
    return String(localStorage.getItem(JOB_VERIFY_METHOD_KEY) || "").trim();
  } catch {
    return "";
  }
}

export function readNoJobOnCard() {
  try {
    return localStorage.getItem(JOB_NO_TITLE_KEY) === "1";
  } catch {
    return false;
  }
}

/** 인증 완료 시 명함에 노출되는 직책 (미인증이면 빈 문자열) */
export function effectiveCardJobTitle() {
  if (readNoJobOnCard()) return "";
  if (!readJobTitleVerified()) return "";
  return readJobTitleRaw();
}

export function saveJobTitleDraft(text) {
  const t = String(text || "").trim();
  try {
    localStorage.setItem(JOB_TITLE_KEY, t);
    localStorage.setItem("myCardJobTitle", t);
    localStorage.removeItem(JOB_VERIFIED_KEY);
    localStorage.removeItem(JOB_VERIFY_METHOD_KEY);
  } catch {
    /* ignore */
  }
}

/** 데모: 운영에서는 기업 메일 대조 + 링크 인증 API로 대체 */
export function verifyJobTitleByEmailDemo() {
  try {
    localStorage.setItem(JOB_VERIFIED_KEY, "1");
    localStorage.setItem(JOB_VERIFY_METHOD_KEY, "email");
  } catch {
    /* ignore */
  }
  return { ok: true };
}

/** 데모: 마스터 승인 */
export function verifyJobTitleByMasterDemo() {
  try {
    localStorage.setItem(JOB_VERIFIED_KEY, "1");
    localStorage.setItem(JOB_VERIFY_METHOD_KEY, "master");
  } catch {
    /* ignore */
  }
}

export function clearJobVerification() {
  try {
    localStorage.removeItem(JOB_VERIFIED_KEY);
    localStorage.removeItem(JOB_VERIFY_METHOD_KEY);
  } catch {
    /* ignore */
  }
}
