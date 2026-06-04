/** @ 접두사 제거·소문자 (API·저장용 슬러그) */
export function normalizeMemberHandleSlug(raw) {
  return String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/^@+/, "");
}

/** 영문 소문자로 시작, 3~20자, 소문자·숫자·밑줄, 숫자 1자 이상(로그인 ID 정책) */
export function isValidMemberHandleSlug(s) {
  const v = String(s || "");
  if (!/^[a-z][a-z0-9_]{2,19}$/.test(v)) return false;
  return /[0-9]/.test(v);
}
