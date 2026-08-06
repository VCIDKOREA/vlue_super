/** 만 14세 미만 — 법정대리인(부모) 동의 후 가입 (가족보호 자녀 계정) */

export const MIN_SIGNUP_AGE_YEARS = 14;

export const PARENTAL_CONSENT_REQUIRED_MESSAGE =
  "만 14세 미만은 법정대리인(부모) VLUE 본인인증 승인 후 가입이 완료됩니다.";

export const PARENTAL_CONSENT_PENDING_LOGIN_MESSAGE =
  "부모 승인이 완료되지 않았습니다. 가입 화면에서 법정대리인 본인인증을 진행해 주세요.";

export const BIRTH_DATE_MISSING_FROM_CERT_MESSAGE =
  "본인인증에서 생년월일을 확인할 수 없습니다. 다시 본인인증을 진행해 주세요.";

/** @deprecated 차단 메시지 — 승인 플로우로 대체 */
export const UNDERAGE_SIGNUP_MESSAGE = PARENTAL_CONSENT_REQUIRED_MESSAGE;

export function parseBirthDateYmd(raw: string | null | undefined): string | null {
  const digits = String(raw ?? "").replace(/\D/g, "");
  if (digits.length !== 8) return null;
  return digits;
}

/** 생년월일(YYYYMMDD) 기준 만 나이 */
export function computeAgeFromBirthYmd(birthYmd: string, asOf: Date = new Date()): number | null {
  const ymd = parseBirthDateYmd(birthYmd);
  if (!ymd) return null;
  const y = Number(ymd.slice(0, 4));
  const m = Number(ymd.slice(4, 6));
  const d = Number(ymd.slice(6, 8));
  if (!Number.isFinite(y) || m < 1 || m > 12 || d < 1 || d > 31) return null;

  let age = asOf.getFullYear() - y;
  const asOfMd = (asOf.getMonth() + 1) * 100 + asOf.getDate();
  const birthMd = m * 100 + d;
  if (asOfMd < birthMd) age -= 1;
  return age;
}

/**
 * 생년월일이 유효할 때만 미성년 여부를 판정.
 * 생년월일 없음/형식 오류 → null (보수적으로 "미성년"으로 단정하지 않음 — 호출부에서 거부 또는 재인증).
 */
export function isMinorForParentalConsent(
  birthYmd: string | null | undefined,
  asOf: Date = new Date()
): boolean | null {
  const age = computeAgeFromBirthYmd(String(birthYmd ?? ""), asOf);
  if (age === null) return null;
  return age < MIN_SIGNUP_AGE_YEARS;
}

/** @deprecated 호환용 — 생년월일 없으면 true(보수). 신규 코드는 isMinorForParentalConsent + null 분기 사용 */
export function isMinorForParentalConsentOrUnknown(
  birthYmd: string | null | undefined,
  asOf: Date = new Date()
): boolean {
  const v = isMinorForParentalConsent(birthYmd, asOf);
  return v !== false;
}

/** 만 14세 이상 — 부모 승인 없이 가입 가능 (생년월일 없으면 false) */
export function isAdultSignupAge(
  birthYmd: string | null | undefined,
  asOf: Date = new Date()
): boolean {
  return isMinorForParentalConsent(birthYmd, asOf) === false;
}

/** @deprecated — isAdultSignupAge 사용 */
export function isSignupAgeAllowed(
  birthYmd: string | null | undefined,
  asOf: Date = new Date()
): boolean {
  return isAdultSignupAge(birthYmd, asOf);
}
