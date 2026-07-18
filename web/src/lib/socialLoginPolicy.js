/** 백엔드 소셜 로그인 오류 메시지를 로그인 UI용으로 정리 */
export function formatSocialLoginError(raw) {
  const msg = String(raw || "").trim();
  if (!msg) return "간편 로그인에 실패했습니다.";
  if (/연동된 VLUE 계정이 없습니다/i.test(msg)) {
    return "소셜 계정으로 바로 가입·로그인할 수 있습니다. 다시 시도해 주세요.";
  }
  return msg;
}

export const SOCIAL_LOGIN_POLICY_HINT =
  "카카오·Google·네이버·Instagram으로 바로 가입·로그인할 수 있습니다. 쇼케이스·명함·결제 등 핵심 기능은 본인인증 후 이용할 수 있습니다.";
