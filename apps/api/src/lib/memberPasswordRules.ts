export const MEMBER_PASSWORD_MIN = 8;
export const MEMBER_PASSWORD_MAX = 128;

export const MEMBER_PASSWORD_INVALID_MESSAGE =
  "비밀번호는 8~128자이며 대문자·숫자·특수기호를 각각 1자 이상 포함해야 합니다.";

/** 대문자·숫자·특수기호 각 1자 이상, 8~128자 */
export function isValidMemberPassword(raw: unknown): boolean {
  const v = String(raw ?? "");
  if (v.length < MEMBER_PASSWORD_MIN || v.length > MEMBER_PASSWORD_MAX) return false;
  if (!/[A-Z]/.test(v)) return false;
  if (!/[0-9]/.test(v)) return false;
  if (!/[^A-Za-z0-9]/.test(v)) return false;
  return true;
}
