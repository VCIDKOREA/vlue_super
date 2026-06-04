/** 백엔드 소셜 로그인(연동 계정만) 오류 메시지를 로그인 UI용으로 정리 */
export function formatSocialLoginError(raw) {
  const msg = String(raw || "").trim();
  if (!msg) return "간편 로그인에 실패했습니다.";
  if (/연동된 VLUE 계정이 없습니다/i.test(msg)) {
    return "연동된 VLUE 계정이 없습니다. 먼저 회원가입한 뒤, 마이페이지에서 카카오·네이버를 연결해 주세요.";
  }
  return msg;
}

export const SOCIAL_LOGIN_POLICY_HINT =
  "카카오·네이버로는 신규 가입할 수 없습니다. VLUE 본인인증 가입 후 마이페이지에서 연동하면 간편 로그인이 열립니다.";
