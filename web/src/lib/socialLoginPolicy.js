/** 백엔드 소셜 로그인 오류 메시지를 로그인 UI용으로 정리 */

export const SOCIAL_NOT_LINKED_MESSAGE =
  "이 SNS 계정과 연동되어 있지 않습니다. 최초 1회 휴대폰 본인인증으로 가입한 뒤, [마이페이지 > 소셜 로그인 연동]에서 SNS 계정을 연결하면 간편 로그인할 수 있습니다.";

/** 미가입 유저 간편로그인 시도 시 안내 토스트 문구 */
export const UNREGISTERED_SNS_TOAST_MESSAGE =
  "가입된 VLUÉ 계정이 없습니다. [최초 회원가입]을 먼저 진행해 주세요.";

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
  "카카오·Google·네이버·Instagram으로는 신규 가입할 수 없습니다. 휴대폰 본인인증으로 가입한 뒤 마이페이지에서 SNS를 연동하면 간편 로그인이 열립니다.";
