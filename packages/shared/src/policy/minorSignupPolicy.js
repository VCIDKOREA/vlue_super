/** 만 14세 미만 — 본인 휴대폰 PASS로 가입 가능 (쇼케이스 등). 사업자·디지털인증명함만 제한 */
export const MIN_SIGNUP_AGE_YEARS = 14;
export const FAMILY_PROTECTION_MINOR_AGE_YEARS = 19;
/** @deprecated 부모 승인 필수 정책은 폐지. 호환용으로만 유지 */
export const PARENTAL_CONSENT_REQUIRED_MESSAGE = "만 14세 미만도 본인 휴대폰 본인인증으로 가입할 수 있습니다. 사업자·디지털인증명함은 이용할 수 없습니다.";
/** @deprecated 로그인 차단 폐지 — 호환용 */
export const PARENTAL_CONSENT_PENDING_LOGIN_MESSAGE = "부모 승인이 완료되지 않았습니다. 가입 화면에서 법정대리인 본인인증을 진행해 주세요.";
export const BIRTH_DATE_MISSING_FROM_CERT_MESSAGE = "본인인증에서 생년월일을 확인할 수 없습니다. 다시 본인인증을 진행해 주세요.";
export const MINOR_BUSINESS_SIGNUP_BLOCKED_MESSAGE = "만 14세 미만은 사업자 가입이 불가합니다. 일반 가입(쇼케이스)만 가능합니다.";
export const MINOR_DIGITAL_CARD_BLOCKED_MESSAGE = "만 14세 미만은 디지털인증명함을 신청할 수 없습니다. 쇼케이스는 이용할 수 있습니다.";
/** @deprecated */
export const UNDERAGE_SIGNUP_MESSAGE = PARENTAL_CONSENT_REQUIRED_MESSAGE;
export function parseBirthDateYmd(raw) {
    const digits = String(raw ?? "").replace(/\D/g, "");
    if (digits.length !== 8)
        return null;
    return digits;
}
/** 생년월일(YYYYMMDD) 기준 만 나이 */
export function computeAgeFromBirthYmd(birthYmd, asOf = new Date()) {
    const ymd = parseBirthDateYmd(birthYmd);
    if (!ymd)
        return null;
    const y = Number(ymd.slice(0, 4));
    const m = Number(ymd.slice(4, 6));
    const d = Number(ymd.slice(6, 8));
    if (!Number.isFinite(y) || m < 1 || m > 12 || d < 1 || d > 31)
        return null;
    let age = asOf.getFullYear() - y;
    const asOfMd = (asOf.getMonth() + 1) * 100 + asOf.getDate();
    const birthMd = m * 100 + d;
    if (asOfMd < birthMd)
        age -= 1;
    return age;
}
/**
 * 생년월일이 유효할 때만 미성년 여부를 판정.
 * 생년월일 없음/형식 오류 → null (호출부에서 거부 또는 재인증).
 */
export function isMinorForParentalConsent(birthYmd, asOf = new Date()) {
    const age = computeAgeFromBirthYmd(String(birthYmd ?? ""), asOf);
    if (age === null)
        return null;
    return age < MIN_SIGNUP_AGE_YEARS;
}
/** @deprecated 호환용 — 생년월일 없으면 true(보수). 신규 코드는 isMinorForParentalConsent + null 분기 사용 */
export function isMinorForParentalConsentOrUnknown(birthYmd, asOf = new Date()) {
    const v = isMinorForParentalConsent(birthYmd, asOf);
    return v !== false;
}
/** 만 14세 이상 (생년월일 없으면 false) */
export function isAdultSignupAge(birthYmd, asOf = new Date()) {
    return isMinorForParentalConsent(birthYmd, asOf) === false;
}
/** 가족 보호 자녀 정책 기준: 만 19세 미만 */
export function isMinorForFamilyProtection(birthYmd, asOf = new Date()) {
    const age = computeAgeFromBirthYmd(String(birthYmd ?? ""), asOf);
    if (age === null)
        return null;
    return age < FAMILY_PROTECTION_MINOR_AGE_YEARS;
}
/** 가족 보호 자녀 정책 기준: 만 19세 이상 */
export function isAdultForFamilyProtection(birthYmd, asOf = new Date()) {
    return isMinorForFamilyProtection(birthYmd, asOf) === false;
}
/** @deprecated — isAdultSignupAge 사용 */
export function isSignupAgeAllowed(birthYmd, asOf = new Date()) {
    return isAdultSignupAge(birthYmd, asOf);
}
