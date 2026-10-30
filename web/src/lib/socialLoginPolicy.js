/** 백엔드 소셜 로그인 오류 메시지를 로그인 UI용으로 정리 */

export const SOCIAL_NOT_LINKED_MESSAGE =
  "소셜 로그인에 실패했습니다. 카카오·네이버·Google로 다시 시도하거나 아이디 로그인을 이용해 주세요.";

/** @deprecated 소셜 즉시 가입으로 전환 — 미가입 시 자동 가입됨 */
export const UNREGISTERED_SNS_TOAST_MESSAGE =
  "간편 가입을 진행합니다. 카카오·네이버·Google로 바로 시작할 수 있습니다.";

export function isSnsUnlinkedError(raw) {
  const msg = String(raw || "");
  return (
    /연동되어 있지 않습니다/i.test(msg) ||
    /연동된 VLUÉ 계정이 없습니다/i.test(msg) ||
    /가입된 VLUÉ 계정이 없습니다/i.test(msg) ||
    /가입된 계정이 없습니다/i.test(msg) ||
    /미가입/i.test(msg) ||
    /SOCIAL_NOT_LINKED/i.test(msg) ||
    /IDENTITY_REQUIRED/i.test(msg) ||
    /not linked/i.test(msg)
  );
}

export function formatSocialLoginError(raw) {
  const msg = String(raw || "").trim();
  if (!msg) return "간편 로그인에 실패했습니다.";
  if (isSnsUnlinkedError(msg)) return SOCIAL_NOT_LINKED_MESSAGE;
  return msg;
}

export const SOCIAL_LOGIN_POLICY_HINT =
  "카카오·Google·네이버로 간편 가입하면 바로 서비스를 이용할 수 있습니다. VLUE DCC(디지털 인증 카드) 발급 시에만 휴대폰 본인인증이 필요합니다.";
