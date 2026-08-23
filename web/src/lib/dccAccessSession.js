/**
 * DCC 접근 판정용 세션 힌트 (생년월일·본인 인증결제·가족 피보호 역할)
 */
const BIRTH_KEY = "vlue_birth_ymd";
const AUTH_PAID_KEY = "vlue_auth_paid_at";
const WARD_ROLE_KEY = "vlue_family_ward_role";

export function readStoredBirthYmd() {
  try {
    return String(localStorage.getItem(BIRTH_KEY) || "").replace(/\D/g, "").slice(0, 8);
  } catch {
    return "";
  }
}

export function writeStoredBirthYmd(ymd) {
  const digits = String(ymd || "").replace(/\D/g, "").slice(0, 8);
  try {
    if (digits.length === 8) localStorage.setItem(BIRTH_KEY, digits);
  } catch {
    /* ignore */
  }
}

export function readStoredAuthPaidAt() {
  try {
    return String(localStorage.getItem(AUTH_PAID_KEY) || "").trim();
  } catch {
    return "";
  }
}

export function writeStoredAuthPaidAt(isoOrFlag) {
  try {
    const v = String(isoOrFlag || "").trim();
    if (v) localStorage.setItem(AUTH_PAID_KEY, v);
    else localStorage.removeItem(AUTH_PAID_KEY);
  } catch {
    /* ignore */
  }
}

export function readStoredFamilyWardRole() {
  try {
    return String(localStorage.getItem(WARD_ROLE_KEY) || sessionStorage.getItem(WARD_ROLE_KEY) || "")
      .trim()
      .toLowerCase();
  } catch {
    return "";
  }
}

export function writeStoredFamilyWardRole(role) {
  const r = String(role || "").trim().toLowerCase();
  try {
    if (r) {
      localStorage.setItem(WARD_ROLE_KEY, r);
      sessionStorage.setItem(WARD_ROLE_KEY, r);
    } else {
      localStorage.removeItem(WARD_ROLE_KEY);
      sessionStorage.removeItem(WARD_ROLE_KEY);
    }
  } catch {
    /* ignore */
  }
}

/** 로그인·가입 응답에서 DCC 정책용 힌트 저장 */
export function persistDccAccessHintsFromSession(data) {
  if (!data || typeof data !== "object") return;
  if (data.birthDate) writeStoredBirthYmd(data.birthDate);
  const paid =
    data.authPaidAt ||
    data.authSubscriptionPaidAt ||
    data.subscription?.cycleStartAt ||
    (data.digitalCard === true || data.digitalCardActive === true ? "1" : "");
  if (paid) writeStoredAuthPaidAt(paid);
}
